import { getDatabase, saveDatabase, DbStore, ZupergiftStoreItem } from '@/lib/db';

interface LoyaltyKeyShop {
  uuid: string;
  name: string;
  logo: string | null;
  categoryId: number;
  has_campaign: number;
  points_campaign: number;
  points_channel: number;
  campaign_ends: string | null;
  campaign_ends_date: string | null;
  points: number;
  image_url: string | null;
  image_banner_url: string | null;
  description: string | null;
  slug: string;
  commission_type?: string | null;
  currency?: string | null;
}

interface LoyaltyKeyApiResponse {
  data: LoyaltyKeyShop[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

function mapCategories(categoryId: number): string[] {
  switch (categoryId) {
    case 1:
      return ['fashion']; // Mode och accessoarer
    case 2:
      return ['books']; // Böcker, film och musik
    case 3:
      return ['baby']; // Barn och baby
    case 4:
      return ['electronics']; // Dator och elektronik
    case 5:
      return ['gifts']; // Present och blommor
    case 6:
      return ['kitchen']; // Hus och hem
    case 7:
      return ['office']; // Kontorsmaterial
    case 8:
      return ['health']; // Hälsa och skönhet
    case 9:
      return ['sports']; // Sport och fritid
    case 11:
      return ['food']; // Mat och dryck
    case 12:
      return ['electronics']; // Mobil och bredband
    default:
      return ['department'];
  }
}

/**
 * Normalizes strings for matching
 */
function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Synchronizes all active partner stores and live point rules from SAS Online Shopping.
 */
export async function syncSasPartnerStores(): Promise<{
  success: boolean;
  totalFetched: number;
  totalUpdated: number;
  totalNewAdded: number;
  campaignCount: number;
  message: string;
}> {
  const db = getDatabase();

  try {
    // 1. First fetch page 1 to discover total pages
    const firstPageRes = await fetch(
      'https://onlineshopping.loyaltykey.com/api/v1/shops?filter[channel]=SAS&filter[language]=sv&filter[country]=SE&page=1',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 0 },
      }
    );

    if (!firstPageRes.ok) {
      throw new Error(`SAS Shopping API returned HTTP ${firstPageRes.status}`);
    }

    const firstPageData: LoyaltyKeyApiResponse = await firstPageRes.json();
    const lastPage = firstPageData.meta?.last_page || 15;
    const allShops: LoyaltyKeyShop[] = [...(firstPageData.data || [])];

    // 2. Fetch remaining pages in parallel
    if (lastPage > 1) {
      const remainingPages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
      const pagePromises = remainingPages.map(async (page) => {
        try {
          const res = await fetch(
            `https://onlineshopping.loyaltykey.com/api/v1/shops?filter[channel]=SAS&filter[language]=sv&filter[country]=SE&page=${page}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
              },
              next: { revalidate: 0 },
            }
          );
          if (res.ok) {
            const json: LoyaltyKeyApiResponse = await res.json();
            return json.data || [];
          }
        } catch {
          // Continue
        }
        return [];
      });

      const pagesResults = await Promise.all(pagePromises);
      for (const shops of pagesResults) {
        allShops.push(...shops);
      }
    }

    if (allShops.length === 0) {
      return {
        success: false,
        totalFetched: 0,
        totalUpdated: 0,
        totalNewAdded: 0,
        campaignCount: 0,
        message: 'Kunde inte hämta partnerbutiker från SAS Online Shopping.',
      };
    }

    // 3. Map and integrate into db.stores
    const existingStoresBySlug = new Map<string, DbStore>();
    const existingStoresByName = new Map<string, DbStore>();
    const existingStoresById = new Map<string, DbStore>();

    for (const store of db.stores) {
      existingStoresBySlug.set(store.slug.toLowerCase(), store);
      existingStoresById.set(store.id.toLowerCase(), store);
      existingStoresByName.set(normalizeName(store.name), store);
    }

    // Zupergift lookup
    const zuperBySlug = new Map<string, ZupergiftStoreItem>();
    const zuperByName = new Map<string, ZupergiftStoreItem>();
    for (const zs of db.zupergiftStores || []) {
      if (!zs.isHidden && !zs.isExcluded) {
        zuperBySlug.set(zs.slug.toLowerCase(), zs);
        zuperByName.set(normalizeName(zs.name), zs);
      }
    }

    let updatedCount = 0;
    let newCount = 0;
    let campaignCount = 0;

    for (const shop of allShops) {
      if (!shop.name || !shop.slug) continue;

      const shopSlug = shop.slug.toLowerCase();
      const shopNormName = normalizeName(shop.name);

      const hasCampaign = shop.has_campaign === 1 || (shop.points_campaign && shop.points_campaign > 0);
      const pointsRaw = hasCampaign && shop.points_campaign > 0 ? shop.points_campaign : (shop.points || 0);
      const isCampaign = Boolean(hasCampaign);
      if (isCampaign) campaignCount++;

      // User rule & API flag: Any store with commission_type === 'fixed' OR points >= 200
      // is a fixed one-time offer (e.g. Factor giving 2 000p once, Telinet 8 000p once, HelloFresh 1 000p once)
      const isFixedApi = shop.commission_type === 'fixed';
      const isHighBonus = pointsRaw >= 200;
      const isOneTimeOrFixed = isFixedApi || isHighBonus;

      const rewardType: 'rate' | 'fixed' = isOneTimeOrFixed ? 'fixed' : 'rate';
      const fixedBonusPoints = isOneTimeOrFixed ? pointsRaw : 0;
      // In the LoyaltyKey API, points_channel provides exact level/tier points for fixed offers (e.g. 400 for Factor, 1600 for Telinet)
      const fixedTierPoints = isOneTimeOrFixed ? (shop.points_channel || 0) : 0;
      const bonusPer100Kr = isOneTimeOrFixed ? 0 : pointsRaw;
      const tierPer100Kr = isOneTimeOrFixed ? 0 : 5;
      const isOneTimeOffer = isOneTimeOrFixed;
      const oneTimeTerms = isOneTimeOrFixed
        ? 'Engångsbonus – gäller vanligtvis ny kund vid första köpet'
        : undefined;

      // Check if store already exists
      const existing =
        existingStoresBySlug.get(shopSlug) ||
        existingStoresById.get(shopSlug) ||
        existingStoresByName.get(shopNormName);

      const partnerRule = {
        hasPartnerLink: true,
        bonusPer100Kr,
        tierPer100Kr,
        rewardType,
        fixedBonusPoints,
        fixedTierPoints,
        isOneTimeOffer,
        oneTimeTerms,
        isCampaign,
        campaignValidUntil: shop.campaign_ends || null,
        startUrl: `https://onlineshopping.flysas.com/sv-SE/${shop.slug}`,
      };

      if (existing) {
        // Update existing store partner rules
        existing.partnerRule = partnerRule;
        if (shop.logo && (!existing.logoUrl || existing.logoUrl.includes('neutral'))) {
          existing.logoUrl = shop.logo;
        }
        updatedCount++;
      } else {
        // Check Zupergift support
        const zuperMatch = zuperBySlug.get(shopSlug) || zuperByName.get(shopNormName);
        if (zuperMatch) {
          zuperMatch.matchedStoreId = shop.slug;
        }

        const newStore: DbStore = {
          id: shop.slug,
          name: shop.name.trim(),
          slug: shop.slug,
          aliases: [shop.slug, `${shop.slug}.se`, shop.name.toLowerCase()],
          logoUrl: shop.logo || `/logos/${shop.slug}.svg`,
          categories: mapCategories(shop.categoryId),
          isActive: true,
          partnerRule,
          giftCardRule: {
            hasDirectGiftCard: false,
            bonusPer100Kr: 0,
            denominationsKr: [],
            feeKr: 0,
            isCampaign: false,
            startUrl: '',
          },
          zupergiftSupported: Boolean(zuperMatch),
          isZupergiftOnly: false,
        };

        db.stores.push(newStore);
        existingStoresBySlug.set(shopSlug, newStore);
        existingStoresById.set(shopSlug, newStore);
        existingStoresByName.set(shopNormName, newStore);
        newCount++;
      }
    }

    db.lastPartnerSync = new Date().toISOString();

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'sync_partner_stores',
      details: `Synkade ${allShops.length} partnerbutiker från SAS Online Shopping (${newCount} nya, ${updatedCount} uppdaterade, ${campaignCount} kampanjer)`,
      user: 'Admin',
    });

    saveDatabase(db);

    return {
      success: true,
      totalFetched: allShops.length,
      totalUpdated: updatedCount,
      totalNewAdded: newCount,
      campaignCount,
      message: `Synkade ${allShops.length} partnerbutiker (${newCount} nya, ${updatedCount} uppdaterade, ${campaignCount} aktiva kampanjer).`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      totalFetched: 0,
      totalUpdated: 0,
      totalNewAdded: 0,
      campaignCount: 0,
      message: `Fel vid synkning av partnerbutiker: ${message}`,
    };
  }
}
