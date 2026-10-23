import { describe, it, expect } from 'vitest';
import { buildAllStores } from './store-resolver';
import type { DatabaseSchema } from '@/lib/db';

describe('Store Resolver - Alias and Grouping', () => {
  it('correctly maps original store name and alias from metadata', () => {
    const mockDb: DatabaseSchema = {
      stores: [
        {
          id: 'tv4-play',
          name: 'TV4 Play',
          slug: 'tv4-play',
          aliases: ['tv4-play.se'],
          logoUrl: '/logos/tv4-play.svg',
          categories: ['streaming'],
          isActive: true,
          partnerRule: {
            hasPartnerLink: true,
            bonusPer100Kr: 20,
            tierPer100Kr: 0,
            isCampaign: false,
            campaignValidUntil: null,
            startUrl: 'https://tv4play.se',
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
        },
      ],
      zupergiftStores: [
        {
          id: 'tv4-play-med-reklam',
          name: 'Plus (med reklam)',
          slug: 'tv4-play-med-reklam',
          category: 'streaming',
          isCampaign: false,
          campaignValidUntil: null,
          isHidden: false,
          isExcluded: false,
          note: '',
          syncedAt: '2026-10-01',
        },
        {
          id: 'tv4-play-sport',
          name: 'TV4 Play Sport',
          slug: 'tv4-play-sport',
          category: 'streaming',
          isCampaign: false,
          campaignValidUntil: null,
          isHidden: false,
          isExcluded: false,
          note: '',
          syncedAt: '2026-10-01',
        },
      ],
      sasGiftCards: [],
      zupergiftConfig: {
        ratePer100Kr: 30,
        isCampaign: false,
        campaignValidUntil: null,
        note: '',
      },
      storeCustomMetadata: {
        'tv4-play': {
          alias: 'TV4 Play',
        },
        'tv4-play-med-reklam': {
          alias: 'TV4 Play',
        },
        'tv4-play-sport': {
          alias: 'TV4 Play',
        },
      },
      errorReports: [],
      auditEvents: [],
      lastZupergiftSync: '2026-10-01',
      lastSasGiftCardSync: null,
    };

    const stores = buildAllStores(mockDb);

    expect(stores).toHaveLength(3);

    // Check that each store retains its Ursprungliga butiksnamn in `name`
    const originalNames = stores.map((s) => s.name);
    expect(originalNames).toContain('TV4 Play');
    expect(originalNames).toContain('Plus (med reklam)');
    expect(originalNames).toContain('TV4 Play Sport');

    // Check that all 3 stores have the common alias 'TV4 Play'
    for (const s of stores) {
      expect(s.alias).toBe('TV4 Play');
      expect(s.aliases).toContain('TV4 Play');
    }
  });

  it('handles stores without alias by keeping alias as null', () => {
    const mockDb: DatabaseSchema = {
      stores: [
        {
          id: 'cervera',
          name: 'Cervera',
          slug: 'cervera',
          aliases: ['cervera.se'],
          logoUrl: '/logos/cervera.svg',
          categories: ['home'],
          isActive: true,
          partnerRule: {
            hasPartnerLink: true,
            bonusPer100Kr: 25,
            tierPer100Kr: 0,
            isCampaign: false,
            campaignValidUntil: null,
            startUrl: 'https://cervera.se',
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
        },
      ],
      zupergiftStores: [],
      sasGiftCards: [],
      zupergiftConfig: {
        ratePer100Kr: 30,
        isCampaign: false,
        campaignValidUntil: null,
        note: '',
      },
      storeCustomMetadata: {},
      errorReports: [],
      auditEvents: [],
      lastZupergiftSync: null,
      lastSasGiftCardSync: null,
    };

    const stores = buildAllStores(mockDb);
    expect(stores[0].name).toBe('Cervera');
    expect(stores[0].alias).toBeNull();
  });

  it('filters out stores with no active earning channel (no partner, no Zupergift, no SAS gift card)', () => {
    const mockDb: DatabaseSchema = {
      stores: [
        {
          id: 'valid-partner',
          name: 'Giltig Partner',
          slug: 'valid-partner',
          aliases: [],
          logoUrl: '/logos/test.svg',
          categories: ['home'],
          isActive: true,
          partnerRule: {
            hasPartnerLink: true,
            bonusPer100Kr: 20,
            tierPer100Kr: 0,
            isCampaign: false,
            campaignValidUntil: null,
            startUrl: 'https://test.se',
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
        },
        {
          id: 'dead-demo-store',
          name: 'Död Demobutik',
          slug: 'dead-demo-store',
          aliases: [],
          logoUrl: '/logos/dead.svg',
          categories: ['health'],
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
        },
      ],
      zupergiftStores: [],
      sasGiftCards: [],
      zupergiftConfig: {
        ratePer100Kr: 30,
        isCampaign: false,
        campaignValidUntil: null,
        note: '',
      },
      storeCustomMetadata: {},
      errorReports: [],
      auditEvents: [],
      lastZupergiftSync: null,
      lastSasGiftCardSync: null,
    };

    const stores = buildAllStores(mockDb);
    expect(stores).toHaveLength(1);
    expect(stores[0].id).toBe('valid-partner');
  });

  it('keeps alias group visible with only active stores when 1 store is active and 1 is hidden', () => {
    const mockDb: DatabaseSchema = {
      stores: [
        {
          id: 'tv4-play-standard',
          name: 'TV4 Play Standard',
          slug: 'tv4-play-standard',
          aliases: [],
          logoUrl: '/logos/tv4.svg',
          categories: ['streaming'],
          isActive: true,
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
        },
        {
          id: 'tv4-play-sport',
          name: 'TV4 Play Sport',
          slug: 'tv4-play-sport',
          aliases: [],
          logoUrl: '/logos/tv4.svg',
          categories: ['streaming'],
          isActive: true,
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
        },
      ],
      zupergiftStores: [],
      sasGiftCards: [],
      zupergiftConfig: {
        ratePer100Kr: 30,
        isCampaign: false,
        campaignValidUntil: null,
        note: '',
      },
      storeCustomMetadata: {
        'tv4-play-standard': {
          alias: 'TV4 Play',
          isHidden: false,
        },
        'tv4-play-sport': {
          alias: 'TV4 Play',
          isHidden: true, // Dold av admin!
        },
      },
      errorReports: [],
      auditEvents: [],
      lastZupergiftSync: null,
      lastSasGiftCardSync: null,
    };

    // Public call: hidden store must NOT be included, active store must be included with alias
    const publicStores = buildAllStores(mockDb);
    expect(publicStores).toHaveLength(1);
    expect(publicStores[0].id).toBe('tv4-play-standard');
    expect(publicStores[0].alias).toBe('TV4 Play');
    expect(publicStores[0].isHidden).toBe(false);

    // Admin call (includeExcluded): both stores are returned, with correct isHidden flags
    const adminStores = buildAllStores(mockDb, { includeExcluded: true });
    expect(adminStores).toHaveLength(2);
    const hiddenStore = adminStores.find((s) => s.id === 'tv4-play-sport');
    const activeStore = adminStores.find((s) => s.id === 'tv4-play-standard');
    expect(hiddenStore?.isHidden).toBe(true);
    expect(hiddenStore?.isActive).toBe(false);
    expect(activeStore?.isHidden).toBe(false);
    expect(activeStore?.isActive).toBe(true);
  });

  it('does not resurrect hidden base store via extra SAS gift card', () => {
    const mockDb: DatabaseSchema = {
      stores: [
        {
          id: 'bokus-play',
          name: 'Bokus Play',
          slug: 'bokus-play',
          aliases: [],
          logoUrl: '/logos/bokus.svg',
          categories: ['books'],
          isActive: false,
          isHidden: true,
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
        },
      ],
      zupergiftStores: [],
      sasGiftCards: [
        {
          id: 'bokus-play',
          name: 'Bokus Play',
          slug: 'bokus-play',
          bonusPer100Kr: 50,
          isCampaign: false,
          campaignValidUntil: null,
          isHidden: false,
          isExcluded: false,
          note: '',
          syncedAt: '2026-10-01',
          updatedAt: null,
        },
      ],
      zupergiftConfig: {
        ratePer100Kr: 30,
        isCampaign: false,
        campaignValidUntil: null,
        note: '',
      },
      storeCustomMetadata: {
        'bokus-play': {
          isHidden: true,
        },
      },
      errorReports: [],
      auditEvents: [],
      lastZupergiftSync: null,
      lastSasGiftCardSync: null,
    };

    const publicStores = buildAllStores(mockDb);
    expect(publicStores).toHaveLength(0);
  });

  it('reverts expired partner campaign tier points to regularTierPer100Kr and regularFixedTierPoints', () => {
    const mockDb: DatabaseSchema = {
      stores: [
        {
          id: 'expired-rate-store',
          name: 'Expired Rate Store',
          slug: 'expired-rate-store',
          aliases: [],
          logoUrl: '',
          categories: ['fashion'],
          isActive: true,
          partnerRule: {
            hasPartnerLink: true,
            bonusPer100Kr: 50,
            regularBonusPer100Kr: 25,
            tierPer100Kr: 10,
            regularTierPer100Kr: 5,
            isCampaign: true,
            campaignValidUntil: '2020-01-01',
            startUrl: 'https://example.com',
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
        },
        {
          id: 'expired-fixed-store',
          name: 'Expired Fixed Store',
          slug: 'expired-fixed-store',
          aliases: [],
          logoUrl: '',
          categories: ['services'],
          isActive: true,
          partnerRule: {
            hasPartnerLink: true,
            bonusPer100Kr: 0,
            tierPer100Kr: 0,
            rewardType: 'fixed',
            fixedBonusPoints: 1000,
            regularFixedBonusPoints: 500,
            fixedTierPoints: 200,
            regularFixedTierPoints: 100,
            isCampaign: true,
            campaignValidUntil: '2020-01-01',
            startUrl: 'https://example.com/fixed',
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
        },
      ],
      zupergiftStores: [],
      sasGiftCards: [],
      zupergiftConfig: {
        ratePer100Kr: 30,
        isCampaign: false,
        campaignValidUntil: null,
        note: '',
      },
      storeCustomMetadata: {},
      errorReports: [],
      auditEvents: [],
      lastZupergiftSync: null,
      lastSasGiftCardSync: null,
    };

    const resolved = buildAllStores(mockDb);
    const rateStore = resolved.find((s) => s.id === 'expired-rate-store');
    expect(rateStore?.partnerRule.isCampaign).toBe(false);
    expect(rateStore?.partnerRule.bonusPer100Kr).toBe(25);
    expect(rateStore?.partnerRule.tierPer100Kr).toBe(5);

    const fixedStore = resolved.find((s) => s.id === 'expired-fixed-store');
    expect(fixedStore?.partnerRule.isCampaign).toBe(false);
    expect(fixedStore?.partnerRule.fixedBonusPoints).toBe(500);
    expect(fixedStore?.partnerRule.fixedTierPoints).toBe(100);
  });

  it('uses SAS gift card product imageUrl as fallback logo when store lacks its own logo, and hides 0-point-only gift cards on public site', () => {
    const mockDb: DatabaseSchema = {
      stores: [
        {
          id: 'ikea',
          name: 'IKEA',
          slug: 'ikea',
          aliases: [],
          logoUrl: '/logos/ikea.svg', // Known existing local logo
          categories: ['home'],
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
        },
      ],
      zupergiftStores: [],
      sasGiftCards: [
        {
          id: 'ikea-se',
          name: 'IKEA',
          slug: 'ikea-se',
          matchedStoreId: 'ikea',
          bonusPer100Kr: 20,
          minPurchaseAmount: 100,
          denominationsKr: [100, 500, 1000],
          imageUrl: 'https://www.saseurobonusshop.com/media/ikea-card.jpg',
          isCampaign: true,
          inDealsOfTheMonth: true,
          campaignValidUntil: null,
          isHidden: false,
          isExcluded: false,
          note: '',
          syncedAt: '2026-10-23',
          updatedAt: null,
        },
        {
          id: 'presentkort-dormy',
          name: 'Dormy',
          slug: 'presentkort-dormy',
          bonusPer100Kr: 50,
          minPurchaseAmount: 100,
          denominationsKr: [100, 250, 500],
          imageUrl: 'https://www.saseurobonusshop.com/media/dormy-card.jpg',
          isCampaign: false,
          campaignValidUntil: null,
          isHidden: false,
          isExcluded: false,
          note: '',
          syncedAt: '2026-10-23',
          updatedAt: null,
        },
        {
          id: 'presentkort-leo-s-lekland',
          name: "Leo's Lekland",
          slug: 'presentkort-leo-s-lekland',
          bonusPer100Kr: 0,
          hasNoPoints: true,
          minPurchaseAmount: 100,
          denominationsKr: [100, 250, 500, 1000],
          imageUrl: 'https://www.saseurobonusshop.com/media/leos-card.jpg',
          isCampaign: false,
          campaignValidUntil: null,
          isHidden: false,
          isExcluded: false,
          note: '',
          syncedAt: '2026-10-23',
          updatedAt: null,
        },
      ],
      zupergiftConfig: {
        ratePer100Kr: 30,
        isCampaign: false,
        campaignValidUntil: null,
        note: '',
      },
      storeCustomMetadata: {},
      errorReports: [],
      auditEvents: [],
      lastZupergiftSync: null,
      lastSasGiftCardSync: '2026-10-23',
    };

    const publicStores = buildAllStores(mockDb);
    // IKEA has its own local /logos/ikea.svg so it keeps /logos/ikea.svg
    const ikea = publicStores.find((s) => s.id === 'ikea');
    expect(ikea).toBeDefined();
    expect(ikea?.logoUrl).toBe('/logos/ikea.svg');
    expect(ikea?.hasSasGiftCard).toBe(true);
    expect(ikea?.sasGiftCardDenominationsKr).toEqual([100, 500, 1000]);

    // Dormy lacks its own local logo so it uses SAS Shop product imageUrl as fallback
    const dormy = publicStores.find((s) => s.id === 'presentkort-dormy');
    expect(dormy).toBeDefined();
    expect(dormy?.logoUrl).toBe('https://www.saseurobonusshop.com/media/dormy-card.jpg');

    // Leo's Lekland has bonusPer100Kr: 0 (accrual: null) and no partner/Zupergift, so it is filtered out on public site
    const leosPublic = publicStores.find((s) => s.id === 'presentkort-leo-s-lekland');
    expect(leosPublic).toBeUndefined();

    // In Admin (includeExcluded: true), Leo's Lekland is included
    const adminStores = buildAllStores(mockDb, { includeExcluded: true });
    const leosAdmin = adminStores.find((s) => s.id === 'presentkort-leo-s-lekland');
    expect(leosAdmin).toBeDefined();
    expect(leosAdmin?.logoUrl).toBe('https://www.saseurobonusshop.com/media/leos-card.jpg');
  });
});
