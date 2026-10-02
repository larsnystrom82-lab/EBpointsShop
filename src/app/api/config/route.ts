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

  const allStores = [...baseStores, ...extraZuperStores].sort((a, b) =>
    a.name.localeCompare(b.name, 'sv')
  );

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
  });
}
