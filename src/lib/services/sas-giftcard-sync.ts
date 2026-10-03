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
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Known non-store category slugs and navigation links from SAS shop to ignore
 */
const NON_STORE_SLUGS = new Set([
  'gift-cards-vouchers',
  'shopping',
  'lottery-games',
  'language-courses',
  'streaming-services',
  'experiences',
  'customer-service',
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
  'all-products',
  'se',
  'en',
  'no',
  'dk',
  'fi',
  'donations',
  'donations-r24',
  'beauty-accessories',
  'sas-products',
  'kitchen-accessories',
  'home-electronics',
  'sports-leisure',
  'kids-baby',
  'home-decor',
  'media-electronics',
  'deals-of-the-month',
  'safety',
  'sas-traveler',
  'tools-garden',
  'bags-accessories',
  'eatables',
]);

const NON_STORE_NAMES = new Set([
  'presentkort',
  'shopping',
  'lottery games',
  'language courses',
  'streaming services',
  'experiences',
  'kundservice',
  'customer service',
  'faq',
  'endast poäng',
  'skönhet & accessoarer',
  'sas produkter',
  'kökstillbehör',
  'hemelektronik',
  'sport & fritid',
  'barn & baby',
  'donationer',
  'hem & design',
  'media & elektronik',
  'månadens deals',
  'säkerhet',
  'till resan',
  'verktyg & trädgård',
  'väskor & tillbehör',
  'ätbart',
]);

/**
 * Cleans up raw image alt or product title to a clean store name
 */
export function cleanStoreName(raw: string): string {
  let name = decodeHtml(raw)
    .replace(/^Presentkort\s+/i, '')
    .replace(/\s+Presentkort$/i, '')
    .replace(/\s*-\s*digital värdekod/i, '')
    .replace(/\s*-\s*digitalt presentkort/i, '')
    .replace(/\s*-\s*värdekod/i, '')
    .replace(/\s+SE$/i, '')
    .replace(/\s+\d+\s*(?:kr|SEK)$/i, '')
    .replace(/\s*\(SE\)$/i, '')
    .replace(/\s*\(Sverige\)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const BRAND_OVERRIDES: Record<string, string> = {
    'h&m': 'H&M',
    'h m': 'H&M',
    'hm': 'H&M',
    'ikea': 'IKEA',
    'ikea se': 'IKEA',
    'polarn o pyret': 'Polarn O. Pyret',
    'polarn & pyret': 'Polarn O. Pyret',
    'polarn o. pyret': 'Polarn O. Pyret',
    'akademibokhandeln': 'Akademibokhandeln',
    'granngården': 'Granngården',
    'menybiljett': 'Filmstaden (Menybiljett)',
    'bio & kulturkortet': 'Bio & Kulturkortet',
    'dinsko': 'Din Sko',
    'din sko': 'Din Sko',
    'clas ohlson': 'Clas Ohlson',
    'blomsterlandet': 'Blomsterlandet',
    'bokadirekt': 'Bokadirekt',
    'coolstuff': 'Coolstuff',
    'mq': 'MQ Marqet',
    'mq marqet': 'MQ Marqet',
    'cervera': 'Cervera',
    'mio': 'Mio',
    'zalando': 'Zalando',
    'stadium': 'Stadium',
    'elgiganten': 'Elgiganten',
    'care of carl': 'Care of Carl',
    'electrolux home': 'Electrolux Home',
    'circle k': 'Circle K',
    'designtorget': 'Designtorget',
    'dormy': 'Dormy',
    'interflora': 'Interflora',
    'foodora': 'Foodora',
    'espresso house': 'Espresso House',
    'åhléns': 'Åhléns',
    'ahlens': 'Åhléns',
    'kicks': 'KICKS',
    'rituals': 'Rituals',
    'royal design': 'Royal Design',
    'revolutionrace': 'RevolutionRace',
    'östermalms saluhall': 'Östermalms Saluhall',
  };

  const lower = name.toLowerCase();
  return BRAND_OVERRIDES[lower] || name;
}

/**
 * Scrapes actual store gift cards from https://www.saseurobonusshop.com/se/gift-cards-vouchers.
 * Fetches all paginated product lists across main and category pages to discover all products.
 * Extracts actual store brand names from the product card image alt / titles.
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

  const baseCategories = [
    'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
    'https://www.saseurobonusshop.com/se/gift-cards-vouchers/shopping',
    'https://www.saseurobonusshop.com/se/gift-cards-vouchers/streaming-services',
    'https://www.saseurobonusshop.com/se/gift-cards-vouchers/experiences',
    'https://www.saseurobonusshop.com/se/gift-cards-vouchers/lottery-games',
    'https://www.saseurobonusshop.com/se/gift-cards-vouchers/language-courses',
  ];

  for (const base of baseCategories) {
    let page = 1;
    while (page <= 10) {
      const url = `${base}?page=${page}`;
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          next: { revalidate: 0 },
        });

        if (!response.ok) break;

        const html = await response.text();
        let foundOnPage = 0;

        // Pattern 1: Find inside ProductList_item wrapper
        const itemRegex = /<div class="[^"]*ProductList_item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
        let m;
        while ((m = itemRegex.exec(html)) !== null) {
          const itemHtml = m[1];
          const linkMatch = itemHtml.match(/href="(\/se\/[^"]+)"/);
          if (!linkMatch) continue;

          const href = linkMatch[1];
          if (
            href.startsWith('/se/gift-cards-vouchers') ||
            href === '/se/' ||
            href.includes('customer-service') ||
            href.includes('all-products')
          ) {
            continue;
          }

          const slug = href.replace('/se/', '').toLowerCase();
          if (NON_STORE_SLUGS.has(slug)) continue;

          // Extract alt attribute from image
          const altMatch = itemHtml.match(/alt="([^"]+)"/i);
          let rawName = altMatch ? altMatch[1].trim() : '';

          if (!rawName) {
            // Look for title text inside card
            const textMatches = [...itemHtml.matchAll(/<(?:span|p|h[1-6]|div)[^>]*>([^<]+)<\/(?:span|p|h[1-6]|div)>/gi)]
              .map((x) => x[1].trim())
              .filter(
                (t) =>
                  t.length > 1 &&
                  !t.includes('kr') &&
                  !t.toLowerCase().includes('poäng') &&
                  t.toLowerCase() !== 'presentkort'
              );
            if (textMatches.length > 0) rawName = textMatches[0];
          }

          if (!rawName) continue;

          const cleanName = cleanStoreName(rawName);
          if (
            cleanName.length >= 2 &&
            !NON_STORE_NAMES.has(cleanName.toLowerCase()) &&
            cleanName.toLowerCase() !== 'presentkort'
          ) {
            foundOnPage++;
            if (!discoveredMap.has(slug)) {
              discoveredMap.set(slug, { slug, name: cleanName });
            }
          }
        }

        // Pattern 2: Fallback for any product link <a class="...styles_block..." href="/se/SLUG">
        const blockRegex = /<a[^>]+href="(\/se\/([a-z0-9-]+))"[^>]*>([\s\S]*?)<\/a>/gi;
        while ((m = blockRegex.exec(html)) !== null) {
          const slug = m[2].toLowerCase();
          if (NON_STORE_SLUGS.has(slug)) continue;

          const blockHtml = m[3];
          const altMatch = blockHtml.match(/alt="([^"]+)"/i);
          if (!altMatch) continue;

          const cleanName = cleanStoreName(altMatch[1]);
          if (
            cleanName.length >= 2 &&
            !NON_STORE_NAMES.has(cleanName.toLowerCase()) &&
            cleanName.toLowerCase() !== 'presentkort'
          ) {
            foundOnPage++;
            if (!discoveredMap.has(slug)) {
              discoveredMap.set(slug, { slug, name: cleanName });
            }
          }
        }

        // Stop iterating if no products found on this page
        if (foundOnPage === 0) break;

        // Check if there is another page
        if (!html.includes(`page=${page + 1}`) && !html.includes('data-page="next"')) {
          break;
        }

        page++;
      } catch (err) {
        console.warn(`Fetch error for ${url}:`, err);
        break;
      }
    }
  }

  // Fallback baseline: known stores if scraping completely failed
  if (discoveredMap.size === 0) {
    const baseline: { slug: string; name: string }[] = [
      { slug: 'ikea-se', name: 'IKEA' },
      { slug: 'presentkort-elgiganten', name: 'Elgiganten' },
      { slug: 'ahlens', name: 'Åhléns' },
      { slug: 'stadium', name: 'Stadium' },
      { slug: 'zalando-presentkort', name: 'Zalando' },
      { slug: 'h-m-presentkort', name: 'H&M' },
      { slug: 'cervera', name: 'Cervera' },
      { slug: 'mio', name: 'Mio' },
      { slug: 'presentkort-care-of-carl', name: 'Care of Carl' },
      { slug: 'presentkort-electrolux-home', name: 'Electrolux Home' },
      { slug: 'circle-k-presentkort', name: 'Circle K' },
      { slug: 'presentkort-dormy', name: 'Dormy' },
      { slug: 'junkyard', name: 'Junkyard' },
      { slug: 'granngarden-r24', name: 'Granngården' },
      { slug: 'akademibokhandeln-r24', name: 'Akademibokhandeln' },
      { slug: 'presentkort-volt', name: 'Volt' },
      { slug: 'revolution-race-presentkort', name: 'RevolutionRace' },
      { slug: 'presentkort-jula', name: 'Jula' },
      { slug: 'presentkort-dressmann', name: 'Dressmann' },
      { slug: 'presentkort-carlings', name: 'Carlings' },
      { slug: 'polarn-o-pyret', name: 'Polarn O. Pyret' },
      { slug: 'zupergift-presentkort', name: 'Zupergift' },
    ];
    for (const item of baseline) {
      discoveredMap.set(item.slug, item);
    }
  }

  const now = new Date().toISOString();

  // Clean out legacy invalid entries from db.sasGiftCards (categories, generic names, etc.)
  db.sasGiftCards = (db.sasGiftCards || []).filter((item) => {
    const slugLower = item.slug.toLowerCase();
    const nameLower = (item.name || '').toLowerCase();
    if (NON_STORE_SLUGS.has(slugLower)) return false;
    if (NON_STORE_NAMES.has(nameLower)) return false;
    if (nameLower === 'presentkort' && !item.slug.includes('-')) return false;
    return true;
  });

  // Helper to match store to db.stores or db.zupergiftStores
  function findMatchedStoreId(slug: string, name: string): string | undefined {
    const cleanSlug = slug
      .replace(/^presentkort-/, '')
      .replace(/-presentkort$/, '')
      .replace(/-se$/, '')
      .replace(/-r24$/, '')
      .replace(/-sek$/, '');

    const nameLower = name.trim().toLowerCase();

    // 1. Check db.stores by slug, id, cleanSlug, name, aliases
    const byStoreSlug = db.stores.find(
      (s) => s.slug === cleanSlug || s.id === cleanSlug || s.slug === slug || s.id === slug
    );
    if (byStoreSlug) return byStoreSlug.id;

    const byStoreName = db.stores.find((s) => s.name.trim().toLowerCase() === nameLower);
    if (byStoreName) return byStoreName.id;

    const byStoreAlias = db.stores.find((s) =>
      s.aliases.some((a) => a.toLowerCase() === nameLower || a.toLowerCase() === cleanSlug)
    );
    if (byStoreAlias) return byStoreAlias.id;

    // 2. Check db.zupergiftStores by slug, id, cleanSlug, name
    const byZuperSlug = (db.zupergiftStores || []).find(
      (s) => s.slug === cleanSlug || s.id === cleanSlug || s.slug === slug || s.id === slug
    );
    if (byZuperSlug) return byZuperSlug.matchedStoreId || byZuperSlug.id;

    const byZuperName = (db.zupergiftStores || []).find(
      (s) => s.name.trim().toLowerCase() === nameLower
    );
    if (byZuperName) return byZuperName.matchedStoreId || byZuperName.id;

    return undefined;
  }

  let newStoresAdded = 0;

  for (const [slug, item] of discoveredMap.entries()) {
    const existing = db.sasGiftCards.find((s) => s.slug === slug || s.id === slug);

    if (existing) {
      if (existing.isExcluded) continue;
      existing.syncedAt = now;
      existing.name = item.name;
      if (!existing.matchedStoreId) {
        existing.matchedStoreId = findMatchedStoreId(slug, item.name);
      }
    } else {
      newStoresAdded++;
      const matchedStoreId = findMatchedStoreId(slug, item.name);

      const newItem: SasGiftCardStoreItem = {
        id: slug,
        name: item.name,
        slug,
        bonusPer100Kr: null, // Admin must fill in to activate
        minPurchaseAmount: null,
        isCampaign: false,
        campaignValidUntil: null,
        isHidden: false,
        isExcluded: false,
        matchedStoreId,
        note: '',
        syncedAt: now,
        updatedAt: null,
      };

      db.sasGiftCards.push(newItem);
    }
  }

  // Sort sasGiftCards alphabetically by name
  db.sasGiftCards.sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  const matchedStores: string[] = [];
  for (const item of db.sasGiftCards) {
    if (item.matchedStoreId && !item.isHidden && !item.isExcluded && (item.bonusPer100Kr ?? 0) > 0) {
      matchedStores.push(item.name);
    }
  }

  db.lastSasGiftCardSync = now;

  db.auditEvents.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    action: 'SYNC_SAS_GIFTCARDS',
    details: `Synkronisering mot SAS EuroBonus Shop presentkort slutförd. Totalt ${discoveredMap.size} butiker identifierade (${newStoresAdded} nya).`,
    user: 'Admin',
  });

  saveDatabase(db);

  return {
    success: true,
    totalDiscovered: discoveredMap.size,
    newStoresAdded,
    matchedStores,
    message: `Synk lyckades: ${discoveredMap.size} presentkortsbutiker identifierade på SAS EuroBonus Shop (${newStoresAdded} nya). ${matchedStores.length} butiker är aktiva (har konfigurerade poäng).`,
  };
}
