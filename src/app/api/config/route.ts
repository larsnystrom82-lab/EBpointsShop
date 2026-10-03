import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDatabase();

  const baseStores = db.stores.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    aliases: s.aliases,
    logoUrl: s.logoUrl,
    categories: s.categories,
    isActive: s.isActive,
    partnerRule: s.partnerRule,
    giftCardRule: s.giftCardRule,
    zupergiftSupported: s.zupergiftSupported,
    isZupergiftOnly: false,
    syncedAt: (s as any).syncedAt || db.lastPartnerSync || undefined,
  }));

  const baseStoreIds = new Set(db.stores.map((s) => s.id));

  const extraZuperStores = (db.zupergiftStores || [])
    .filter(
      (zs) =>
        !zs.isHidden &&
        !zs.isExcluded &&
        !baseStoreIds.has(zs.id) &&
        (!zs.matchedStoreId || !baseStoreIds.has(zs.matchedStoreId))
    )
    .map((zs) => ({
      id: zs.id,
      name: zs.name,
      slug: zs.slug,
      aliases: [zs.slug, `${zs.id}.se`],
      logoUrl: `/logos/${zs.id}.svg`,
      categories: zs.category ? [zs.category] : ['department'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: false,
        bonusPer100Kr: 0,
        tierPer100Kr: 0,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: '',
      },
      giftCardRule: {
        hasDirectGiftCard: false,
        bonusPer100Kr: 0,
        denominationsKr: [],
        feeKr: 0,
        isCampaign: false,
        startUrl: '',
      },
      zupergiftSupported: true,
      isZupergiftOnly: true,
      syncedAt: zs.syncedAt || db.lastZupergiftSync || undefined,
    }));

  function cleanSlug(slug: string): string {
    return (slug || '')
      .toLowerCase()
      .replace(/^presentkort-/, '')
      .replace(/-presentkort$/, '')
      .replace(/-se$/, '')
      .replace(/-r24$/, '')
      .replace(/-sek$/, '');
  }

  const existingStores = [...baseStores, ...extraZuperStores];

  const existingStoreIds = new Set<string>();
  const existingStoreNames = new Set<string>();
  const cleanSlugMap = new Map<string, string>(); // cleanSlug -> store id

  for (const s of existingStores) {
    existingStoreIds.add(s.id);
    existingStoreIds.add(s.slug);
    if (s.aliases) {
      for (const a of s.aliases) existingStoreIds.add(a.toLowerCase());
    }
    existingStoreNames.add(s.name.trim().toLowerCase());
    cleanSlugMap.set(cleanSlug(s.id), s.id);
    cleanSlugMap.set(cleanSlug(s.slug), s.id);
  }

  // Find if a SAS gift card matches an existing store
  function findExistingStoreId(gc: any): string | undefined {
    if (gc.matchedStoreId && existingStoreIds.has(gc.matchedStoreId)) {
      return gc.matchedStoreId;
    }
    if (existingStoreIds.has(gc.id)) return gc.id;
    if (existingStoreIds.has(gc.slug)) return gc.slug;

    const gcClean = cleanSlug(gc.slug || gc.id);
    if (cleanSlugMap.has(gcClean)) {
      return cleanSlugMap.get(gcClean);
    }

    const nameLower = (gc.name || '').trim().toLowerCase();
    const storeByName = existingStores.find(
      (s) => s.name.trim().toLowerCase() === nameLower
    );
    if (storeByName) return storeByName.id;

    return undefined;
  }

  const extraSasStores: typeof baseStores = [];

  for (const gc of db.sasGiftCards || []) {
    if (gc.isHidden || gc.isExcluded || (gc.bonusPer100Kr ?? 0) <= 0) {
      continue;
    }

    const matchedId = findExistingStoreId(gc);
    if (matchedId) {
      // Store already exists (either in baseStores or extraZuperStores) - do not duplicate
      continue;
    }

    // Completely new store only available as SAS gift card
    const newStore = {
      id: gc.id,
      name: gc.name,
      slug: gc.slug,
      aliases: [gc.slug, `${gc.id}.se`],
      logoUrl: `/logos/${gc.id}.svg`,
      categories: ['department'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: false,
        bonusPer100Kr: 0,
        tierPer100Kr: 0,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: '',
      },
      giftCardRule: {
        hasDirectGiftCard: false,
        bonusPer100Kr: 0,
        denominationsKr: [],
        feeKr: 0,
        isCampaign: false,
        startUrl: '',
      },
      zupergiftSupported: false,
      isZupergiftOnly: false,
      syncedAt: gc.syncedAt || undefined,
    };

    extraSasStores.push(newStore);
    existingStores.push(newStore);
    existingStoreIds.add(gc.id);
    existingStoreIds.add(gc.slug);
    existingStoreNames.add(gc.name.trim().toLowerCase());
    cleanSlugMap.set(cleanSlug(gc.id), gc.id);
    cleanSlugMap.set(cleanSlug(gc.slug), gc.id);
  }

  const allStores = [...baseStores, ...extraZuperStores, ...extraSasStores].sort((a, b) =>
    a.name.localeCompare(b.name, 'sv')
  );

  // Return active SAS gift cards with matchedStoreId populated if matched
  const activeSasGiftCards = (db.sasGiftCards || [])
    .filter(
      (gc) => !gc.isHidden && !gc.isExcluded && gc.bonusPer100Kr !== null && gc.bonusPer100Kr > 0
    )
    .map((gc) => {
      const matchedStoreId = gc.matchedStoreId || findExistingStoreId(gc);
      return {
        ...gc,
        matchedStoreId: matchedStoreId || gc.matchedStoreId,
      };
    });

  return NextResponse.json({
    zupergiftConfig: {
      ratePer100Kr: db.zupergiftConfig.ratePer100Kr,
      isCampaign: db.zupergiftConfig.isCampaign,
      campaignValidUntil: db.zupergiftConfig.campaignValidUntil,
      updatedAt: db.zupergiftConfig.updatedAt,
    },
    stores: baseStores,
    allStores,
    categories:
      db.categories && db.categories.length > 0
        ? db.categories
        : [
            { id: 'food', name: 'Mat & Restaurang', order: 1, isActive: true },
            { id: 'kitchen', name: 'Hem & Kök', order: 2, isActive: true },
            { id: 'electronics', name: 'Elektronik', order: 3, isActive: true },
            { id: 'fashion', name: 'Mode & Kläder', order: 4, isActive: true },
            { id: 'health', name: 'Skönhet & Hälsa', order: 5, isActive: true },
            { id: 'sports', name: 'Sport & Fritid', order: 6, isActive: true },
            { id: 'books', name: 'Böcker & Media', order: 7, isActive: true },
            { id: 'travel', name: 'Resor & Hotell', order: 8, isActive: true },
            { id: 'baby', name: 'Barn & Baby', order: 9, isActive: true },
            { id: 'gifts', name: 'Present & Upplevelser', order: 10, isActive: true },
            { id: 'department', name: 'Varuhus & Övrigt', order: 11, isActive: true },
          ],
    lastZupergiftSync: db.lastZupergiftSync,
    lastPartnerSync: db.lastPartnerSync || null,
    sasGiftCards: activeSasGiftCards,
  });
}
