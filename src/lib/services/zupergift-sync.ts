import { getDatabase, saveDatabase, ZupergiftStoreItem, SyncNewStoreItem } from '@/lib/db';
import {
  cleanStoreSlug,
  DEFAULT_SAS_ZUPERGIFT_BLOCKED_STORES,
  isSasZupergiftBlocked,
  parseSasZupergiftBlockedStoresFromHtml,
} from './store-resolver';

/**
 * Fetches the Zupergift product description from SAS EuroBonus Shop's GraphQL API
 * (`route(path: "zupergift-presentkort")`) and parses the list of stores where
 * Zupergift bought in SAS EuroBonus Shop cannot be redeemed.
 */
export async function fetchSasZupergiftBlockedStores(): Promise<string[]> {
  try {
    const res = await fetch('https://www.saseurobonusshop.com/se/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: `{
          route(path: "zupergift-presentkort") {
            ... on RouteProduct {
              product {
                attributes {
                  description
                }
              }
            }
          }
        }`,
      }),
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const json = await res.json();
      const descHtml: string | undefined = json?.data?.route?.product?.attributes?.description;
      const parsed = parseSasZupergiftBlockedStoresFromHtml(descHtml);
      if (parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_SAS_ZUPERGIFT_BLOCKED_STORES, ...parsed]));
      }
    }
  } catch {
    // Fallback to default list below
  }
  return DEFAULT_SAS_ZUPERGIFT_BLOCKED_STORES;
}

/**
 * Normalizes title strings from HTML (e.g. &#x27; -> ')
 */
function decodeHtml(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Known non-product / category slugs on Zupergift that should never be treated as stores
 */
const NON_PRODUCT_SLUGS = new Set([
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
  'hemelektronik',
  'inredning-design',
  'mode-klader',
  'hallbarhet-second-hand',
  'streamingtjanster',
  'friskvard',
  'fordon-drivmedel',
  'valgorenhet',
  'kurser',
  'merforsaljning',
  'privacy-policy',
  'villkor',
  'accessibility',
  'terms',
  'privacy',
  'kontakt',
  'kundservice',
  'om-oss',
  'cookies',
  'bokadirekt-region-vasternorrland',
]);

function mapZupergiftCategory(categoryUrls: string[]): string | undefined {
  for (const rawUrl of categoryUrls) {
    const slug = rawUrl.replace(/^\//, '').toLowerCase();
    switch (slug) {
      case 'mat-dryck':
        return 'food';
      case 'hem-tradgard':
      case 'renovering-bygg':
      case 'inredning-design':
        return 'kitchen';
      case 'hemelektronik':
      case 'teknik-elektronik':
        return 'electronics';
      case 'klader-accessoarer':
      case 'smycken-klockor':
      case 'mode-klader':
        return 'fashion';
      case 'skonhet-halsa':
      case 'friskvard':
        return 'health';
      case 'sport-fritid':
        return 'sports';
      case 'bocker-magasin':
      case 'kurser':
        return 'books';
      case 'hotell-resor':
        return 'travel';
      case 'barn-baby':
        return 'baby';
      case 'streamingtjanster':
        return 'gaming-streaming';
      case 'upplevelser':
      case 'kultur-noje':
        return 'gifts';
      default:
        break;
    }
  }
  return undefined;
}

interface ZupergiftGraphQlProduct {
  name: string;
  sku?: string;
  url: string;
  categories?: { name: string; url: string }[];
}

/**
 * Fetches all available stores and gift cards from Zupergift.
 * Primary source: Zupergift's fast GraphQL API (`https://zupergift.com/se/graphql`), which responds in ~0.5s
 * and avoids the 20s HTTP 504 Gateway Timeout that occurs when Zupergift's SSR HTML cache is cold.
 * Fallback source: HTML scraping of `https://zupergift.com/se/alla-presentkort`.
 */
export async function syncZupergiftCatalog(): Promise<{
  success: boolean;
  totalDiscovered: number;
  newStoresAdded: number;
  matchedStores: string[];
  newStores?: SyncNewStoreItem[];
  message: string;
}> {
  const db = getDatabase();
  const discoveredMap = new Map<string, { slug: string; name: string; category?: string }>();
  let lastFetchError: string | null = null;

  // 1. Primary method: Fast GraphQL query against https://zupergift.com/se/graphql (with retry)
  const graphqlQuery = {
    query: '{ rootCategory { products(pageSize: 1000) { totalCount items { name sku url categories { name url } } } } }',
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch('https://zupergift.com/se/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json',
          'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        body: JSON.stringify(graphqlQuery),
        next: { revalidate: 0 },
      });

      if (response.ok) {
        const json = await response.json();
        const items: ZupergiftGraphQlProduct[] = json?.data?.rootCategory?.products?.items || [];
        for (const prod of items) {
          if (!prod.url || !prod.name) continue;
          const slug = prod.url.replace(/^\/?(?:se\/)?/, '').replace(/\/$/, '').toLowerCase();
          if (!slug || NON_PRODUCT_SLUGS.has(slug)) continue;

          const cleanName = decodeHtml(prod.name);
          const categoryUrls = (prod.categories || []).map((c) => c.url).filter(Boolean);
          const mappedCategory = mapZupergiftCategory(categoryUrls);

          if (!discoveredMap.has(slug)) {
            discoveredMap.set(slug, {
              slug,
              name: cleanName || slug,
              category: mappedCategory,
            });
          }
        }

        if (discoveredMap.size > 0) {
          break;
        }
      } else {
        lastFetchError = `Zupergift GraphQL svarade med HTTP ${response.status}`;
      }
    } catch (err: unknown) {
      lastFetchError = err instanceof Error ? err.message : String(err);
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  // 2. Fallback method: HTML scraping of https://zupergift.com/se/alla-presentkort if GraphQL returned 0 items
  if (discoveredMap.size === 0) {
    try {
      const response = await fetch('https://zupergift.com/se/alla-presentkort', {
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
        const productCardRegex = /<a\s+[^>]*href=["']\/se\/([a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;

        while ((match = productCardRegex.exec(html)) !== null) {
          const slug = match[1].toLowerCase();
          const innerHtml = match[2];

          if (NON_PRODUCT_SLUGS.has(slug)) continue;

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
      } else {
        lastFetchError = `Zupergift svarade med HTTP ${response.status}`;
      }
    } catch (err: unknown) {
      lastFetchError = err instanceof Error ? err.message : String(err);
    }
  }

  // 3. Safety guard: If Zupergift could not be reached and we already have stores in the database,
  // DO NOT overwrite the catalog with a small baseline or mark existing stores as missing!
  if (discoveredMap.size === 0) {
    if (db.zupergiftStores && db.zupergiftStores.length > 0) {
      return {
        success: false,
        totalDiscovered: 0,
        newStoresAdded: 0,
        matchedStores: [],
        message: `Kunde inte nå Zupergift live (${lastFetchError || 'Ingen data returnerades'}). Befintliga ${db.zupergiftStores.length} butiker i katalogen har behållits oförändrade.`,
      };
    }

    // Only use baseline if database is completely empty
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

  // Clean out any accidental category slugs that may have been added by older HTML scrapes
  db.zupergiftStores = (db.zupergiftStores || []).filter(
    (s) => !NON_PRODUCT_SLUGS.has(s.slug.toLowerCase()) && !NON_PRODUCT_SLUGS.has(s.id.toLowerCase())
  );

  // Synchronize with database, respecting admin overrides (isHidden & isExcluded)
  // Also fetch SAS EuroBonus Shop's Zupergift terms to automatically detect any blocked stores
  const blockedStoresList = await fetchSasZupergiftBlockedStores();
  if (db.zupergiftConfig) {
    db.zupergiftConfig.blockedStores = blockedStoresList;
  }

  let newStoresAdded = 0;
  const addedStores: SyncNewStoreItem[] = [];
  const now = new Date().toISOString();

  for (const [slug, item] of discoveredMap.entries()) {
    const existing = db.zupergiftStores.find((s) => s.slug === slug || s.id === slug);
    const blockedInSas = isSasZupergiftBlocked(item.name, slug, slug, blockedStoresList);

    if (existing) {
      // Existing store: preserve admin's choice (isHidden and isExcluded),
      // and always keep SAS-blocked Zupergift brands hidden.
      existing.syncedAt = now;
      existing.isMissingFromSource = false;
      existing.missingSince = null;
      existing.isSasBlocked = blockedInSas;
      if (blockedInSas) {
        existing.isHidden = true;
      }
      if (!existing.name || existing.name === existing.slug) {
        existing.name = item.name;
      }
      if (!existing.category && item.category) {
        existing.category = item.category;
      }
    } else {
      // New store found in Zupergift
      newStoresAdded++;
      // Try to match against local store using exact slug/cleanSlug/name/alias (never loose substring)
      const cleanZgSlug = cleanStoreSlug(slug);
      const matchedStore = db.stores.find(
        (s) =>
          s.slug.toLowerCase() === slug.toLowerCase() ||
          s.id.toLowerCase() === slug.toLowerCase() ||
          cleanStoreSlug(s.slug) === cleanZgSlug ||
          cleanStoreSlug(s.id) === cleanZgSlug ||
          (s.aliases || []).some(
            (a) => a.toLowerCase() === slug.toLowerCase() || a.toLowerCase() === cleanZgSlug
          ) ||
          (s.name || '').trim().toLowerCase() === item.name.trim().toLowerCase()
      );

      const assignedCategory = matchedStore?.categories?.[0] || item.category;

      const newZgStore: ZupergiftStoreItem = {
        id: slug,
        name: item.name,
        slug: slug,
        category: assignedCategory,
        isHidden: blockedInSas,
        isExcluded: false,
        isSasBlocked: blockedInSas,
        isMissingFromSource: false,
        missingSince: null,
        matchedStoreId: matchedStore?.id,
        syncedAt: now,
      };

      db.zupergiftStores.push(newZgStore);

      addedStores.push({
        id: `zupergift-${slug}-${Date.now()}-${newStoresAdded}`,
        storeId: matchedStore?.id || slug,
        name: item.name,
        slug,
        source: 'zupergift',
        syncedAt: now,
        matchedStoreId: matchedStore?.id,
        bonusSummary: `Zupergift (${db.zupergiftConfig?.ratePer100Kr ?? 20} p / 100 kr)${matchedStore ? ` · Matchad med ${matchedStore.name}` : ' · Fristående Zupergift-butik'}`,
        categories: matchedStore?.categories || (assignedCategory ? [assignedCategory] : undefined),
        isReviewed: false,
        reviewedAt: null,
      });
    }
  }

  // Detect stores in database that are no longer available on Zupergift
  let missingCount = 0;
  for (const zg of db.zupergiftStores) {
    if (!discoveredMap.has(zg.slug) && !discoveredMap.has(zg.id)) {
      zg.isMissingFromSource = true;
      if (!zg.missingSince) {
        zg.missingSince = now;
      }
      if (!zg.isExcluded) {
        missingCount++;
      }
    } else {
      zg.isMissingFromSource = false;
      zg.missingSince = null;
    }
  }

  // Update matched status for all local stores
  const matchedStoresList: string[] = [];

  // First clear any legacy false substring matches (e.g. elgiganten -> lg, pressbyran-7-eleven -> eleven)
  for (const z of db.zupergiftStores) {
    if (z.matchedStoreId) {
      const mStore = db.stores.find((s) => s.id === z.matchedStoreId);
      if (!mStore) {
        delete z.matchedStoreId;
      } else {
        const cleanZ = cleanStoreSlug(z.slug || z.id);
        const cleanS = cleanStoreSlug(mStore.slug || mStore.id);
        const exactMatch =
          z.slug.toLowerCase() === mStore.slug.toLowerCase() ||
          z.id.toLowerCase() === mStore.id.toLowerCase() ||
          cleanZ === cleanS ||
          z.name.trim().toLowerCase() === mStore.name.trim().toLowerCase() ||
          (mStore.aliases || []).some(
            (a) => a.toLowerCase() === z.slug.toLowerCase() || a.toLowerCase() === cleanZ
          );
        if (!exactMatch) {
          delete z.matchedStoreId;
        }
      }
    }
  }

  for (const store of db.stores) {
    const cleanS = cleanStoreSlug(store.slug || store.id);
    const zgItem = db.zupergiftStores.find(
      (z) =>
        z.matchedStoreId === store.id ||
        z.slug.toLowerCase() === store.slug.toLowerCase() ||
        z.id.toLowerCase() === store.id.toLowerCase() ||
        cleanStoreSlug(z.slug || z.id) === cleanS ||
        z.name.trim().toLowerCase() === store.name.trim().toLowerCase() ||
        (store.aliases || []).some(
          (a) =>
            a.toLowerCase() === z.slug.toLowerCase() ||
            a.toLowerCase() === cleanStoreSlug(z.slug || z.id)
        )
    );

    if (zgItem) {
      zgItem.matchedStoreId = store.id;
      // Active in app only if not hidden, not excluded, not missing from Zupergift, and not blocked in SAS Shop Zupergift terms
      store.zupergiftSupported =
        !zgItem.isHidden &&
        !zgItem.isExcluded &&
        !zgItem.isMissingFromSource &&
        !zgItem.isSasBlocked &&
        !isSasZupergiftBlocked(store.name, store.slug, store.id, blockedStoresList) &&
        !isSasZupergiftBlocked(zgItem.name, zgItem.slug, zgItem.id, blockedStoresList);
      if (store.zupergiftSupported) {
        matchedStoresList.push(store.name);
      }
    } else {
      store.zupergiftSupported = false;
    }
  }

  db.lastZupergiftSync = now;

  if (!db.syncNewStores) {
    db.syncNewStores = [];
  }
  if (addedStores.length > 0) {
    db.syncNewStores = [...addedStores, ...db.syncNewStores];
  }

  const newNamesSummary =
    addedStores.length > 0
      ? ` Nya butiker: ${addedStores.map((s) => s.name).join(', ')}.`
      : '';

  db.auditEvents.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    action: 'SYNC_ZUPERGIFT_LIVE',
    details: `Live-synkronisering mot Zupergift slutförd. Totalt ${discoveredMap.size} butiker funna live (${newStoresAdded} nya tillagda i Zupergift-katalogen, ${missingCount} saknas hos Zupergift).${newNamesSummary}`,
    user: 'Admin',
    newStores: addedStores.length > 0 ? addedStores : undefined,
  });

  saveDatabase(db);

  const totalInCatalog = db.zupergiftStores.length;
  const activeInCatalog = db.zupergiftStores.filter((s) => !s.isHidden && !s.isExcluded && !s.isMissingFromSource).length;
  const hiddenCount = db.zupergiftStores.filter((s) => s.isHidden && !s.isExcluded).length;

  return {
    success: true,
    totalDiscovered: discoveredMap.size,
    newStoresAdded,
    matchedStores: matchedStoresList,
    newStores: addedStores,
    message: `Live-synk lyckades: ${discoveredMap.size} butiker hittades live på Zupergift (${newStoresAdded} nya). Katalogen har ${totalInCatalog} butiker (${activeInCatalog} aktiva, ${hiddenCount} dolda, ${missingCount} saknas hos Zupergift). ${matchedStoresList.length} butiker är kopplade till Poängpilotens jämförelse.${newNamesSummary}`,
  };
}
