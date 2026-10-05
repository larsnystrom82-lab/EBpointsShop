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
});
