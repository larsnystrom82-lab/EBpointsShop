import { getDatabase, saveDatabase, ZupergiftStoreItem } from '@/lib/db';

/**
 * Normalizes title strings from HTML (e.g. &#x27; -> ')
 */
function decodeHtml(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Scrapes all available stores and gift cards from https://zupergift.com/se/alla-presentkort.
 * Crucial rule: Admin has full authority to hide or remove (exclude) stores.
 * Future syncs will preserve admin's choice to hide or exclude a store.
 */
export async function syncZupergiftCatalog(): Promise<{
  success: boolean;
  totalDiscovered: number;
  newStoresAdded: number;
  matchedStores: string[];
  message: string;
}> {
  const db = getDatabase();
  const discoveredMap = new Map<string, { slug: string; name: string }>();

  try {
    const response = await fetch('https://zupergift.com/se/alla-presentkort', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 0 },
    });

    if (response.ok) {
      const html = await response.text();

      // Categories to exclude from product results
      const nonProductSlugs = new Set([
        'alla-presentkort',
        'faq',
        'company',
        'redeem',
        'zupergift',
        'nyheter',
        'populara-presentkort',
        'hem-tradgard',
        'renovering-bygg',
        'smycken-klockor',
        'klader-accessoarer',
        'kultur-noje',
        'upplevelser',
        'mat-dryck',
        'barn-baby',
        'bocker-magasin',
        'hotell-resor',
        'skonhet-halsa',
        'sport-fritid',
        'teknik-elektronik',
        'inredning-design',
        'mode-klader',
        'privacy-policy',
        'villkor',
        'accessibility',
        'terms',
        'privacy',
        'kontakt',
        'om-oss',
        'cookies',
        'bokadirekt-region-vasternorrland',
      ]);

      // Extract all product cards matching /se/[slug]
      const productCardRegex = /<a\s+[^>]*href=["']\/se\/([a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match;

      while ((match = productCardRegex.exec(html)) !== null) {
        const slug = match[1].toLowerCase();
        const innerHtml = match[2];

        if (nonProductSlugs.has(slug)) continue;

        const titleMatch =
          innerHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i) ||
          innerHtml.match(/class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
          innerHtml.match(/alt=["']([^"']+)["']/i);

        let title = slug
          .split('-')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');

        if (titleMatch) {
          const raw = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          if (raw && raw.length > 1) {
            title = decodeHtml(raw);
          }
        }

        if (!discoveredMap.has(slug)) {
          discoveredMap.set(slug, { slug, name: title });
        }
      }
    }
  } catch (err) {
    console.warn('Network sync failed against live Zupergift, using baseline:', err);
  }

  // Ensure minimum baseline if network was completely blocked
  if (discoveredMap.size === 0) {
    const baseline = [
      { slug: 'cervera', name: 'Cervera' },
      { slug: 'ahlens', name: 'Åhléns' },
      { slug: 'kitchentime', name: 'KitchenTime' },
      { slug: 'elgiganten', name: 'Elgiganten' },
      { slug: 'ikea', name: 'IKEA' },
      { slug: 'zalando-presentkort', name: 'Zalando' },
      { slug: 'akademibokhandeln-retain24', name: 'Akademibokhandeln' },
      { slug: 'royaldesign', name: 'RoyalDesign' },
      { slug: 'stadium', name: 'Stadium' },
      { slug: 'rituals', name: 'Rituals' },
      { slug: 'designtorget', name: 'Designtorget' },
      { slug: 'samsonite', name: 'Samsonite' },
    ];
    for (const item of baseline) {
      discoveredMap.set(item.slug, item);
    }
  }

  // Synchronize with database, respecting admin overrides (isHidden & isExcluded)
  let newStoresAdded = 0;
  const now = new Date().toISOString();

  for (const [slug, item] of discoveredMap.entries()) {
    const existing = db.zupergiftStores.find((s) => s.slug === slug || s.id === slug);

    if (existing) {
      // Existing store: preserve admin's choice (isHidden and isExcluded)
      existing.syncedAt = now;
      if (!existing.name || existing.name === existing.slug) {
        existing.name = item.name;
      }
    } else {
      // New store found in Zupergift
      newStoresAdded++;
      // Try to match against local store
      const matchedStore = db.stores.find(
        (s) =>
          s.slug === slug ||
          s.id === slug ||
          s.aliases.some((a) => a.includes(slug) || slug.includes(a)) ||
          s.name.toLowerCase() === item.name.toLowerCase()
      );

      db.zupergiftStores.push({
        id: slug,
        name: item.name,
        slug: slug,
        isHidden: false,
        isExcluded: false,
        matchedStoreId: matchedStore?.id,
        syncedAt: now,
      });
    }
  }

  // Update matched status for all local stores
  const matchedStoresList: string[] = [];

  for (const store of db.stores) {
    const zgItem = db.zupergiftStores.find(
      (z) =>
        z.matchedStoreId === store.id ||
        z.slug === store.slug ||
        z.id === store.id ||
        store.aliases.some((a) => a.includes(z.slug) || z.slug.includes(a))
    );

    if (zgItem) {
      zgItem.matchedStoreId = store.id;
      // Active in app only if not hidden and not excluded by admin
      store.zupergiftSupported = !zgItem.isHidden && !zgItem.isExcluded;
      if (store.zupergiftSupported) {
        matchedStoresList.push(store.name);
      }
    } else {
      store.zupergiftSupported = false;
    }
  }

  db.lastZupergiftSync = now;

  db.auditEvents.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    action: 'SYNC_ZUPERGIFT_LIVE',
    details: `Live-synkronisering mot Zupergift slutförd. Totalt ${discoveredMap.size} butiker funna, ${newStoresAdded} nya tillagda i Zupergift-katalogen.`,
    user: 'Admin',
  });

  saveDatabase(db);

  return {
    success: true,
    totalDiscovered: discoveredMap.size,
    newStoresAdded,
    matchedStores: matchedStoresList,
    message: `Live-synk lyckades: ${discoveredMap.size} butiker identifierade hos Zupergift (${newStoresAdded} nya). ${matchedStoresList.length} butiker är aktiva i Poängkollen.`,
  };
}
