import { describe, it, expect } from 'vitest';
import { Store } from '@/types/domain';

// Helper extracting the grouping logic identically as in StoreMultiSelectDropdown
function buildFilterGroups(allStores: Store[]) {
  const visibleStores = allStores.filter((store) => !store.isHidden && store.isActive !== false);
  const aliasGroupMap = new Map<string, any>();
  const result: any[] = [];

  for (const store of visibleStores) {
    const aliasClean = store.alias?.trim();
    if (aliasClean) {
      const aliasKey = aliasClean.toLowerCase();
      let existing = aliasGroupMap.get(aliasKey);
      if (!existing) {
        existing = {
          key: `alias:${aliasKey}`,
          displayName: aliasClean,
          isAliasGroup: true,
          storeIds: [store.id],
          stores: [store],
          logoUrl: store.logoUrl,
          zupergiftSupported: Boolean(store.zupergiftSupported),
          hasPartnerLink: Boolean(store.hasPartnerLink),
          hasSasGiftCard: Boolean(store.hasSasGiftCard),
        };
        aliasGroupMap.set(aliasKey, existing);
        result.push(existing);
      } else {
        existing.storeIds.push(store.id);
        existing.stores.push(store);
        if (store.name.toLowerCase() === aliasKey || (!existing.logoUrl && store.logoUrl)) {
          existing.logoUrl = store.logoUrl;
        }
        if (store.zupergiftSupported) existing.zupergiftSupported = true;
        if (store.hasPartnerLink) existing.hasPartnerLink = true;
        if (store.hasSasGiftCard) existing.hasSasGiftCard = true;
      }
    } else {
      result.push({
        key: `store:${store.id}`,
        displayName: store.name,
        isAliasGroup: false,
        storeIds: [store.id],
        stores: [store],
        logoUrl: store.logoUrl,
        zupergiftSupported: Boolean(store.zupergiftSupported),
        hasPartnerLink: Boolean(store.hasPartnerLink),
        hasSasGiftCard: Boolean(store.hasSasGiftCard),
      });
    }
  }

  return result;
}

describe('StoreMultiSelectDropdown - filterGroups', () => {
  const activeTv4Standard: Store = {
    id: 'tv4-play-standard',
    name: 'TV4 Play Standard',
    slug: 'tv4-play-standard',
    alias: 'TV4 Play',
    aliases: ['tv4-play'],
    logoUrl: '/logos/tv4.svg',
    categories: ['streaming'],
    isActive: true,
    isHidden: false,
    partnerRule: {
      hasPartnerLink: true,
      bonusPer100Kr: 20,
      tierPer100Kr: 0,
      isCampaign: false,
      campaignValidUntil: null,
      startUrl: 'https://tv4.se',
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
  };

  const hiddenTv4Sport: Store = {
    id: 'tv4-play-sport',
    name: 'TV4 Play Sport',
    slug: 'tv4-play-sport',
    alias: 'TV4 Play',
    aliases: ['tv4-play'],
    logoUrl: '/logos/tv4.svg',
    categories: ['streaming'],
    isActive: false,
    isHidden: true,
    partnerRule: {
      hasPartnerLink: true,
      bonusPer100Kr: 30,
      tierPer100Kr: 0,
      isCampaign: false,
      campaignValidUntil: null,
      startUrl: 'https://tv4.se/sport',
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
  };

  const hiddenStandaloneStore: Store = {
    id: 'hidden-shop',
    name: 'Dold Butik',
    slug: 'hidden-shop',
    alias: null,
    aliases: [],
    logoUrl: '/logos/hidden.svg',
    categories: ['books'],
    isActive: false,
    isHidden: true,
    partnerRule: {
      hasPartnerLink: true,
      bonusPer100Kr: 10,
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
  };

  it('keeps alias group visible with only active stores when one is active and one is hidden', () => {
    const groups = buildFilterGroups([activeTv4Standard, hiddenTv4Sport, hiddenStandaloneStore]);

    expect(groups).toHaveLength(1);
    const tv4Group = groups[0];
    expect(tv4Group.displayName).toBe('TV4 Play');
    expect(tv4Group.isAliasGroup).toBe(true);
    expect(tv4Group.storeIds).toEqual(['tv4-play-standard']);
    expect(tv4Group.stores).toHaveLength(1);
    expect(tv4Group.stores[0].id).toBe('tv4-play-standard');
  });

  it('does not show alias group if all stores in the alias group are hidden', () => {
    const groups = buildFilterGroups([hiddenTv4Sport, hiddenStandaloneStore]);
    expect(groups).toHaveLength(0);
  });
});
