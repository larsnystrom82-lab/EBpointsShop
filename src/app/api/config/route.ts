import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { buildAllStores, cleanStoreSlug } from '@/lib/services/store-resolver';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDatabase();
  const allStores = buildAllStores(db);
  const baseStores = allStores.filter((s) => !s.isZupergiftOnly);

  // Return active SAS gift cards with matchedStoreId populated if matched
  const activeSasGiftCards = (db.sasGiftCards || [])
    .filter(
      (gc) => !gc.isHidden && !gc.isExcluded && gc.bonusPer100Kr !== null && gc.bonusPer100Kr > 0
    )
    .map((gc) => {
      const match = allStores.find(
        (s) =>
          (gc.matchedStoreId && (s.id === gc.matchedStoreId || s.slug === gc.matchedStoreId)) ||
          s.id === gc.id ||
          s.slug === gc.slug ||
          cleanStoreSlug(s.id) === cleanStoreSlug(gc.id) ||
          cleanStoreSlug(s.slug) === cleanStoreSlug(gc.slug) ||
          s.name.trim().toLowerCase() === gc.name.trim().toLowerCase()
      );
      return {
        ...gc,
        matchedStoreId: match ? match.id : gc.matchedStoreId,
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
    categories: (
      db.categories && db.categories.length > 0
        ? [...db.categories]
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
          ]
    ).sort((a, b) => a.name.localeCompare(b.name, 'sv', { sensitivity: 'base' })),
    lastZupergiftSync: db.lastZupergiftSync,
    lastPartnerSync: db.lastPartnerSync || null,
    sasGiftCards: activeSasGiftCards,
  });
}
