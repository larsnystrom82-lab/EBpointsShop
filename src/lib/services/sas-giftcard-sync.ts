import { getDatabase, saveDatabase, SasGiftCardStoreItem, SyncNewStoreItem } from '@/lib/db';

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

interface DiscoveredSasGiftCard {
  slug: string;
  name: string;
  bonusPer100Kr?: number | null;
  minPurchaseAmount?: number | null;
  denominationsKr?: number[];
  hasNoPoints?: boolean;
  inDealsOfTheMonth?: boolean;
  imageUrl?: string | null;
}

interface GraphQLOptionItem {
  pointsPrices?: { currency?: { max?: { incVat?: number | null } } }[];
  product?: {
    name?: string | null;
    sku?: string | null;
    attributes?: { accrual?: number | null };
  };
}

interface GraphQLProductItem {
  name?: string;
  sku?: string;
  url?: string;
  type?: string;
  price?: { incVat?: number | null };
  originalPrice?: { incVat?: number | null };
  categories?: { name?: string; url?: string }[];
  attributes?: {
    manufacturer?: string | null;
    accrual?: number | null;
    image?: { src?: string | null };
  };
  options?: {
    items?: GraphQLOptionItem[];
  };
}

/**
 * Extracts nominal SEK denomination from a product/option title like
 * "Presentkort Åhléns, 600 kr" -> 600 or "Presentkort Leo´s Lekland 100 SEK" -> 100
 */
export function extractValorFromProductName(name?: string | null): number | null {
  if (!name) return null;
  const match = name.match(/(?:^|[\s,])(\d[\d\s]*)\s*(?:kr|SEK)\b/i);
  if (!match) return null;
  const parsed = parseInt(match[1].replace(/\s+/g, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Normalizes a currency price (incVat) to a clean SEK denomination
 * e.g. 49.91 -> 50, 99.82 -> 100, 249.55 -> 250, 1699.73 -> 1700
 */
export function normalizeValor(incVat?: number | null): number {
  if (!incVat || incVat <= 0) return 0;
  const near10 = Math.round(incVat / 10) * 10;
  if (Math.abs(incVat - near10) <= 1.5) return near10;
  const near5 = Math.round(incVat / 5) * 5;
  if (Math.abs(incVat - near5) <= 0.8) return near5;
  return Math.round(incVat);
}

/**
 * Computes the dominant (mode) rate from an array of calculated rates per 100 kr
 */
function pickDominantRate(rates: number[]): number | null {
  if (rates.length === 0) return null;
  const counts = new Map<number, number>();
  let bestRate = rates[0];
  let bestCount = 0;
  for (const r of rates) {
    const c = (counts.get(r) || 0) + 1;
    counts.set(r, c);
    if (c > bestCount) {
      bestCount = c;
      bestRate = r;
    }
  }
  return bestRate;
}

/**
 * Scrapes actual store gift cards from https://www.saseurobonusshop.com/se/gift-cards-vouchers.
 * Uses the SAS EuroBonus Shop GraphQL API to automatically read:
 * - bonusPer100Kr via Math.round((accrual / valör) * 100) and hasNoPoints when accrual is null/0
 * - minPurchaseAmount and denominationsKr
 * - isCampaign when in /deals-of-the-month or when bonusPer100Kr > regularBonusPer100Kr
 * - imageUrl as fallback logo when store lacks its own logo
 */
export async function syncSasGiftCardStores(): Promise<{
  success: boolean;
  totalDiscovered: number;
  newStoresAdded: number;
  matchedStores: string[];
  newStores?: SyncNewStoreItem[];
  message: string;
}> {
  const db = getDatabase();
  const discoveredMap = new Map<string, DiscoveredSasGiftCard>();

  const graphqlHeaders = {
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'application/json',
    'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  // 1. Primary method: Fast GraphQL query against https://www.saseurobonusshop.com/se/graphql
  // Step 1a: Fast base query (~0.5s) for all products, prices, categories, images, and virtual product accruals.
  const baseGraphqlQuery = {
    query: `{
      route(path: "gift-cards-vouchers") {
        ... on RouteCategory {
          category {
            name
            url
            products(pageSize: 1000) {
              totalCount
              items {
                name
                sku
                url
                type
                price { incVat }
                originalPrice { incVat }
                categories { name url }
                attributes {
                  manufacturer
                  accrual
                  image { src }
                }
              }
            }
          }
        }
      }
    }`,
  };

  let baseItems: GraphQLProductItem[] = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch('https://www.saseurobonusshop.com/se/graphql', {
        method: 'POST',
        headers: graphqlHeaders,
        body: JSON.stringify(baseGraphqlQuery),
        next: { revalidate: 0 },
      });

      if (response.ok) {
        const json = await response.json();
        const items: GraphQLProductItem[] =
          json?.data?.route?.category?.products?.items || [];
        if (items.length > 0) {
          baseItems = items;
          break;
        }
      }
    } catch (err) {
      console.warn(`SAS GiftCard base GraphQL attempt ${attempt} failed:`, err);
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  // Step 1b: Fetch configurable child options (denominations + accrual per denomination) in parallel pages
  // (Querying 16 products per page in parallel finishes in ~4 seconds instead of ~28 seconds sequentially)
  if (baseItems.length > 0) {
    const pageSize = 16;
    const totalPages = Math.ceil(baseItems.length / pageSize);
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    const optionsByUrl = new Map<string, GraphQLOptionItem[]>();

    await Promise.all(
      pageNumbers.map(async (page) => {
        const pageQuery = {
          query: `{
            route(path: "gift-cards-vouchers") {
              ... on RouteCategory {
                category {
                  products(pageSize: ${pageSize}, page: ${page}) {
                    items {
                      url
                      ... on ListProductConfigurable {
                        options: configOptions {
                          items {
                            pointsPrices { currency { max { incVat } } }
                            product { name sku attributes { accrual } }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }`,
        };

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const res = await fetch('https://www.saseurobonusshop.com/se/graphql', {
              method: 'POST',
              headers: graphqlHeaders,
              body: JSON.stringify(pageQuery),
              next: { revalidate: 0 },
            });
            if (res.ok) {
              const j = await res.json();
              const pageItems: GraphQLProductItem[] =
                j?.data?.route?.category?.products?.items || [];
              for (const p of pageItems) {
                if (p.url && p.options?.items) {
                  optionsByUrl.set(p.url, p.options.items);
                }
              }
              break;
            }
          } catch (err) {
            console.warn(`SAS GiftCard options page ${page} attempt ${attempt} failed:`, err);
          }
        }
      })
    );

    for (const prod of baseItems) {
      if (!prod.url || !prod.name) continue;
      const slug = prod.url.replace(/^\/?(?:se\/)?/, '').replace(/\/$/, '').toLowerCase();
      if (!slug || NON_STORE_SLUGS.has(slug)) continue;

      const cleanName = cleanStoreName(prod.name);
      if (
        cleanName.length < 2 ||
        NON_STORE_NAMES.has(cleanName.toLowerCase()) ||
        cleanName.toLowerCase() === 'presentkort'
      ) {
        continue;
      }

      const opts = optionsByUrl.get(prod.url) || prod.options?.items || [];
      const denominationsKr: number[] = [];
      const optionRates: number[] = [];

      if (opts.length > 0) {
        for (const opt of opts) {
          const optName = opt.product?.name;
          const optIncVat = opt.pointsPrices?.[0]?.currency?.max?.incVat;
          const valor = extractValorFromProductName(optName) || normalizeValor(optIncVat);
          if (valor > 0 && !denominationsKr.includes(valor)) {
            denominationsKr.push(valor);
          }
          const accrual = opt.product?.attributes?.accrual;
          if (accrual !== null && accrual !== undefined && accrual > 0 && valor > 0) {
            optionRates.push(Math.round((accrual / valor) * 100));
          }
        }
      }

      if (denominationsKr.length === 0) {
        const valor = extractValorFromProductName(prod.name) || normalizeValor(prod.price?.incVat);
        if (valor > 0) {
          denominationsKr.push(valor);
        }
      }

      if (optionRates.length === 0) {
        const parentAccrual = prod.attributes?.accrual;
        const parentValor =
          denominationsKr[0] ||
          extractValorFromProductName(prod.name) ||
          normalizeValor(prod.price?.incVat);
        if (parentAccrual !== null && parentAccrual !== undefined && parentAccrual > 0 && parentValor > 0) {
          optionRates.push(Math.round((parentAccrual / parentValor) * 100));
        }
      }

      denominationsKr.sort((a, b) => a - b);
      const minPurchaseAmount = denominationsKr.length > 0 ? denominationsKr[0] : null;

      const dominantRate = pickDominantRate(optionRates);
      const hasNoPoints = dominantRate === null || dominantRate <= 0;
      const bonusPer100Kr = hasNoPoints ? 0 : dominantRate;

      const inDealsOfTheMonth = (prod.categories || []).some(
        (c) =>
          (c.url || '').toLowerCase().includes('deals-of-the-month') ||
          (c.name || '').toLowerCase().includes('månadens deals')
      );

      let imageUrl = prod.attributes?.image?.src?.trim() || null;
      if (imageUrl && imageUrl.startsWith('/')) {
        imageUrl = `https://www.saseurobonusshop.com${imageUrl}`;
      }

      if (!discoveredMap.has(slug)) {
        discoveredMap.set(slug, {
          slug,
          name: cleanName,
          bonusPer100Kr,
          minPurchaseAmount,
          denominationsKr,
          hasNoPoints,
          inDealsOfTheMonth,
          imageUrl,
        });
      }
    }
  }

  // 2. Fallback method: HTML pagination scraping if GraphQL returned 0 items
  const baseCategories =
    discoveredMap.size === 0
      ? [
          'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
          'https://www.saseurobonusshop.com/se/gift-cards-vouchers/shopping',
          'https://www.saseurobonusshop.com/se/gift-cards-vouchers/streaming-services',
          'https://www.saseurobonusshop.com/se/gift-cards-vouchers/experiences',
          'https://www.saseurobonusshop.com/se/gift-cards-vouchers/lottery-games',
          'https://www.saseurobonusshop.com/se/gift-cards-vouchers/language-courses',
        ]
      : [];

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

  // Safety guard: if SAS EuroBonus Shop could not be reached and we already have stores in db.sasGiftCards,
  // do NOT overwrite the catalog with a small baseline or mark existing stores as missing!
  if (discoveredMap.size === 0) {
    if (db.sasGiftCards && db.sasGiftCards.length > 0) {
      return {
        success: false,
        totalDiscovered: 0,
        newStoresAdded: 0,
        matchedStores: [],
        message: `Kunde inte nå SAS EuroBonus Shop live. Befintliga ${db.sasGiftCards.length} presentkortsbutiker har behållits oförändrade.`,
      };
    }

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
  const addedStores: SyncNewStoreItem[] = [];

  for (const [slug, item] of discoveredMap.entries()) {
    const existing = db.sasGiftCards.find((s) => s.slug === slug || s.id === slug);

    if (existing) {
      if (existing.isExcluded) continue;
      existing.syncedAt = now;
      existing.name = item.name;
      existing.isMissingFromSource = false;
      existing.missingSince = null;
      if (!existing.matchedStoreId) {
        existing.matchedStoreId = findMatchedStoreId(slug, item.name);
      }

      // 1. Update imageUrl if discovered from GraphQL
      if (item.imageUrl) {
        existing.imageUrl = item.imageUrl;
      }

      // 2. Update denominationsKr and minPurchaseAmount if discovered from GraphQL
      if (item.denominationsKr && item.denominationsKr.length > 0) {
        existing.denominationsKr = item.denominationsKr;
      }
      if (item.minPurchaseAmount !== undefined && item.minPurchaseAmount !== null) {
        existing.minPurchaseAmount = item.minPurchaseAmount;
      }

      // 3. Update bonusPer100Kr, hasNoPoints, regularBonusPer100Kr, and isCampaign
      if (item.bonusPer100Kr !== undefined) {
        const prevRegular =
          existing.regularBonusPer100Kr && existing.regularBonusPer100Kr > 0
            ? existing.regularBonusPer100Kr
            : existing.bonusPer100Kr && existing.bonusPer100Kr > 0 && !existing.isCampaign && !item.inDealsOfTheMonth
            ? existing.bonusPer100Kr
            : null;

        existing.bonusPer100Kr = item.bonusPer100Kr;
        existing.hasNoPoints = Boolean(item.hasNoPoints);
        existing.inDealsOfTheMonth = Boolean(item.inDealsOfTheMonth);

        const isElevatedRate =
          prevRegular !== null &&
          item.bonusPer100Kr !== null &&
          item.bonusPer100Kr > prevRegular;

        const hasActiveManualCampaignDate = Boolean(
          existing.isCampaign &&
            existing.campaignValidUntil &&
            new Date(existing.campaignValidUntil).getTime() >= Date.now()
        );

        const isCampaign = Boolean(
          item.inDealsOfTheMonth || isElevatedRate || hasActiveManualCampaignDate
        );

        existing.isCampaign = isCampaign;

        if (!isCampaign && item.bonusPer100Kr !== null && item.bonusPer100Kr > 0) {
          existing.regularBonusPer100Kr = item.bonusPer100Kr;
        } else if (prevRegular !== null) {
          existing.regularBonusPer100Kr = prevRegular;
        }
      }
    } else {
      newStoresAdded++;
      const matchedStoreId = findMatchedStoreId(slug, item.name);
      const isCampaign = Boolean(item.inDealsOfTheMonth);
      const bonusPer100Kr = item.bonusPer100Kr !== undefined ? item.bonusPer100Kr : null;
      const regularBonusPer100Kr =
        !isCampaign && bonusPer100Kr !== null && bonusPer100Kr > 0 ? bonusPer100Kr : null;

      const newItem: SasGiftCardStoreItem = {
        id: slug,
        name: item.name,
        slug,
        bonusPer100Kr,
        regularBonusPer100Kr,
        minPurchaseAmount: item.minPurchaseAmount ?? null,
        denominationsKr: item.denominationsKr || [],
        hasNoPoints: Boolean(item.hasNoPoints),
        inDealsOfTheMonth: Boolean(item.inDealsOfTheMonth),
        imageUrl: item.imageUrl || null,
        isCampaign,
        campaignValidUntil: null,
        isHidden: false,
        isExcluded: false,
        isMissingFromSource: false,
        missingSince: null,
        matchedStoreId,
        note: '',
        syncedAt: now,
        updatedAt: null,
      };

      db.sasGiftCards.push(newItem);

      const bonusSummary = item.hasNoPoints
        ? '0 p / 100 kr (accrual: null – ger inga EuroBonus-poäng)'
        : bonusPer100Kr !== null && bonusPer100Kr > 0
        ? `${bonusPer100Kr} p / 100 kr${item.minPurchaseAmount ? ` (min. ${item.minPurchaseAmount} kr)` : ''}${isCampaign ? ' – Kampanj' : ''}`
        : 'Ej konfigurerad – ange poäng/100 kr under SAS Presentkort';

      addedStores.push({
        id: `sas-gc-${slug}-${Date.now()}-${newStoresAdded}`,
        storeId: matchedStoreId || slug,
        name: item.name,
        slug,
        source: 'sas_giftcard',
        syncedAt: now,
        matchedStoreId,
        bonusSummary,
        isReviewed: false,
        reviewedAt: null,
      });
    }
  }

  // Detect stores in database that are no longer available on SAS EuroBonus Shop
  let missingSasCount = 0;
  for (const item of db.sasGiftCards) {
    if (!discoveredMap.has(item.slug) && !discoveredMap.has(item.id)) {
      item.isMissingFromSource = true;
      if (!item.missingSince) {
        item.missingSince = now;
      }
      if (!item.isExcluded) {
        missingSasCount++;
      }
    } else {
      item.isMissingFromSource = false;
      item.missingSince = null;
    }
  }

  // Sort sasGiftCards alphabetically by name
  db.sasGiftCards.sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  const matchedStores: string[] = [];
  let noPointsCount = 0;
  let campaignCount = 0;
  for (const item of db.sasGiftCards) {
    if (item.isHidden || item.isExcluded || item.isMissingFromSource) continue;
    if ((item.bonusPer100Kr ?? 0) > 0) {
      matchedStores.push(item.name);
      if (item.isCampaign) campaignCount++;
    } else if (item.hasNoPoints || item.bonusPer100Kr === 0) {
      noPointsCount++;
    }
  }

  db.lastSasGiftCardSync = now;

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
    action: 'SYNC_SAS_GIFTCARDS',
    details: `Synkronisering mot SAS EuroBonus Shop presentkort slutförd. Totalt ${discoveredMap.size} presentkort identifierade live (${matchedStores.length} ger poäng, ${noPointsCount} ger 0 poäng, ${campaignCount} på kampanj, ${newStoresAdded} nya, ${missingSasCount} saknas på SAS Shop).${newNamesSummary}`,
    user: 'Admin',
    newStores: addedStores.length > 0 ? addedStores : undefined,
  });

  saveDatabase(db);

  return {
    success: true,
    totalDiscovered: discoveredMap.size,
    newStoresAdded,
    matchedStores,
    newStores: addedStores,
    message: `Synk lyckades: ${discoveredMap.size} presentkort på SAS EuroBonus Shop (${matchedStores.length} aktiva med poäng, ${noPointsCount} utan poäng [accrual: null], ${campaignCount} kampanjer, ${newStoresAdded} nya, ${missingSasCount} saknas hos SAS).${newNamesSummary}`,
  };
}
