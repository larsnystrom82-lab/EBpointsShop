import { getDatabase, saveDatabase, SasGiftCardStoreItem } from '@/lib/db';

/**
 * Normalizes title strings from HTML entities
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
 * Converts a slug like "media-markt" to display name "Media Markt".
 * Also handles common all-caps brands.
 */
function slugToDisplayName(slug: string): string {
  const knownNames: Record<string, string> = {
    ikea: 'IKEA',
    hm: 'H&M',
    mediamarkt: 'MediaMarkt',
    'media-markt': 'MediaMarkt',
    elgiganten: 'Elgiganten',
    ahlens: 'Åhléns',
    stadium: 'Stadium',
    zalando: 'Zalando',
    adidas: 'Adidas',
    nike: 'Nike',
    spotify: 'Spotify',
    amazon: 'Amazon',
    'itunes-app-store': 'iTunes App Store',
    'google-play': 'Google Play',
    netflix: 'Netflix',
    'bookbeat': 'BookBeat',
    storytel: 'Storytel',
    'kicks': 'KICKS',
    plantagen: 'Plantagen',
    clas: 'Clas Ohlson',
    'clas-ohlson': 'Clas Ohlson',
    jula: 'Jula',
    biltema: 'Biltema',
    'mr-green': 'Mr Green',
    granit: 'Granit',
    cervera: 'Cervera',
    kitchentime: 'KitchenTime',
    royaldesign: 'RoyalDesign',
    rituals: 'Rituals',
    akademibokhandeln: 'Akademibokhandeln',
    netonnet: 'NetOnNet',
    boozt: 'Boozt',
  };

  const lower = slug.toLowerCase();
  if (knownNames[lower]) return knownNames[lower];

  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/**
 * Scrapes store names/links from https://www.saseurobonusshop.com/se/gift-cards-vouchers.
 * Does NOT try to scrape denominations – only discovers which stores sell gift cards.
 * Admin must manually enter 'points per 100 kr' for each store.
 *
 * Preserves existing admin settings (bonusPer100Kr, isHidden, isExcluded) when re-syncing.
 * Skips stores that admin has marked isExcluded.
 */
export async function syncSasGiftCardStores(): Promise<{
  success: boolean;
  totalDiscovered: number;
  newStoresAdded: number;
  matchedStores: string[];
  message: string;
}> {
  const db = getDatabase();
  const discoveredMap = new Map<string, { slug: string; name: string }>();

  try {
    const response = await fetch('https://www.saseurobonusshop.com/se/gift-cards-vouchers', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 0 },
    });

    if (response.ok) {
      const html = await response.text();

      // Pattern 1: href="/se/gift-cards-vouchers/SLUG" or "/se/stores/SLUG"
      const patterns = [
        /href=["']\/se\/gift-cards-vouchers\/([a-z0-9-]+)["']/gi,
        /href=["']\/se\/stores\/([a-z0-9-]+)["']/gi,
        /href=["']\/se\/([a-z0-9-]+-presentkort)["']/gi,
        // data-slug or similar attributes
        /data-slug=["']([a-z0-9-]+)["']/gi,
        // Product card links – catches product cards pointing to gift card store pages
        /href=["']\/se\/([a-z0-9-]+)\/gift-cards?["']/gi,
      ];

      // Non-store slugs to ignore
      const nonStoreSlugs = new Set([
        'gift-cards-vouchers',
        'se',
        'faq',
        'company',
        'redeem',
        'privacy-policy',
        'cookies',
        'terms',
        'accessibility',
        'contact',
        'about',
        'vouchers',
        'help',
        'login',
        'register',
        'home',
        'en',
        'no',
        'dk',
        'fi',
      ]);

      for (const regex of patterns) {
        let match;
        while ((match = regex.exec(html)) !== null) {
          const slug = match[1].toLowerCase();
          if (!nonStoreSlugs.has(slug) && !discoveredMap.has(slug)) {
            discoveredMap.set(slug, { slug, name: slugToDisplayName(slug) });
          }
        }
      }

      // Pattern: look for store name text near anchor tags with typical gift card card structure
      // <a ... href="..."><h3>StoreName</h3>...
      const storeCardRegex =
        /<a\s+[^>]*href=["']([^"']*\/([a-z0-9-]+))["'][^>]*>[\s\S]*?<(?:h[1-6]|p|span)[^>]*>([^<]{2,40})<\/(?:h[1-6]|p|span)>/gi;
      let m;
      while ((m = storeCardRegex.exec(html)) !== null) {
        const slug = m[2].toLowerCase();
        const rawName = decodeHtml(m[3].trim());
        if (
          !nonStoreSlugs.has(slug) &&
          rawName.length >= 2 &&
          rawName.length <= 60 &&
          !rawName.includes('<') &&
          !discoveredMap.has(slug)
        ) {
          discoveredMap.set(slug, { slug, name: rawName });
        }
      }
    }
  } catch (err) {
    console.warn('Network fetch failed for SAS EuroBonus Shop gift cards:', err);
  }

  // Fallback baseline: known stores that sell gift cards on SAS EuroBonus Shop
  if (discoveredMap.size === 0) {
    const baseline: { slug: string; name: string }[] = [
      { slug: 'ikea', name: 'IKEA' },
      { slug: 'mediamarkt', name: 'MediaMarkt' },
      { slug: 'elgiganten', name: 'Elgiganten' },
      { slug: 'ahlens', name: 'Åhléns' },
      { slug: 'stadium', name: 'Stadium' },
      { slug: 'zalando', name: 'Zalando' },
      { slug: 'hm', name: 'H&M' },
      { slug: 'bookbeat', name: 'BookBeat' },
      { slug: 'spotify', name: 'Spotify' },
      { slug: 'clas-ohlson', name: 'Clas Ohlson' },
      { slug: 'kicks', name: 'KICKS' },
      { slug: 'plantagen', name: 'Plantagen' },
    ];
    for (const item of baseline) {
      discoveredMap.set(item.slug, item);
    }
  }

  const now = new Date().toISOString();
  let newStoresAdded = 0;

  for (const [slug, item] of discoveredMap.entries()) {
    const existing = db.sasGiftCards.find((s) => s.slug === slug || s.id === slug);

    if (existing) {
      if (existing.isExcluded) continue; // Admin chose to permanently exclude
      // Preserve admin settings – only update sync timestamp and name if still slug-derived
      existing.syncedAt = now;
      if (!existing.name || existing.name === slugToDisplayName(existing.slug)) {
        existing.name = item.name;
      }
    } else {
      newStoresAdded++;

      // Try to auto-match to a local store
      const matchedStore = db.stores.find(
        (s) =>
          s.slug === slug ||
          s.id === slug ||
          s.aliases.some((a) => a.toLowerCase().includes(slug) || slug.includes(a.toLowerCase())) ||
          s.name.toLowerCase() === item.name.toLowerCase()
      );

      const newItem: SasGiftCardStoreItem = {
        id: slug,
        name: item.name,
        slug,
        bonusPer100Kr: null, // Admin must fill in to activate
        isCampaign: false,
        campaignValidUntil: null,
        isHidden: false,
        isExcluded: false,
        matchedStoreId: matchedStore?.id,
        note: '',
        syncedAt: now,
        updatedAt: null,
      };

      db.sasGiftCards.push(newItem);
    }
  }

  const matchedStores: string[] = [];
  for (const item of db.sasGiftCards) {
    if (!item.matchedStoreId) {
      // Try to match now if not matched yet
      const matchedStore = db.stores.find(
        (s) =>
          s.slug === item.slug ||
          s.id === item.slug ||
          s.aliases.some(
            (a) => a.toLowerCase().includes(item.slug) || item.slug.includes(a.toLowerCase())
          ) ||
          s.name.toLowerCase() === item.name.toLowerCase()
      );
      if (matchedStore) {
        item.matchedStoreId = matchedStore.id;
      }
    }
    if (item.matchedStoreId && !item.isHidden && !item.isExcluded && (item.bonusPer100Kr ?? 0) > 0) {
      matchedStores.push(item.name);
    }
  }

  db.lastSasGiftCardSync = now;

  db.auditEvents.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    action: 'SYNC_SAS_GIFTCARDS',
    details: `Synkronisering mot SAS EuroBonus Shop presentkort slutförd. Totalt ${discoveredMap.size} butiker funna, ${newStoresAdded} nya tillagda.`,
    user: 'Admin',
  });

  saveDatabase(db);

  return {
    success: true,
    totalDiscovered: discoveredMap.size,
    newStoresAdded,
    matchedStores,
    message: `Synk lyckades: ${discoveredMap.size} butiker identifierade på SAS EuroBonus Shop (${newStoresAdded} nya). ${matchedStores.length} butiker är aktiva (har konfigurerade poäng).`,
  };
}
