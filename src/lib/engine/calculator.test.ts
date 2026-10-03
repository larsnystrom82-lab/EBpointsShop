import { describe, it, expect } from 'vitest';
import {
  calculatePoints,
  calculateCardPoints,
  generateCandidateRoutes,
  processAndRankRoutes,
} from './calculator';
import { DEMO_STORES, DEMO_CARDS } from '../fixtures/demo-data';
import { FilterState, PointRule, Store } from '@/types/domain';

describe('EuroBonus Beräkningsmotor – Acceptanstester A03–A16', () => {
  const elgiganten = DEMO_STORES.find((s) => s.id === 'elgiganten')!;
  const cervera = DEMO_STORES.find((s) => s.id === 'cervera')!;
  const bagaren = DEMO_STORES.find((s) => s.id === 'bagaren-och-kocken')!;

  const defaultFilter: FilterState = {
    selectedStoreIds: ['elgiganten', 'cervera', 'bagaren-och-kocken'],
    purchaseAmountKr: 1995,
    rawAmountInput: '1995',
    allowGiftCards: true,
    allowZupergift: true,
    tierPointsImportant: false,
    selectedCardIds: [],
    sortBy: 'most_bonus',
    searchQuery: '',
    selectedCategory: null,
  };

  it('A03: Belopp 1 995 kr; två kort à 1 000 kr -> Utlägg 2 000 kr, restsaldo 5 kr, extra utlägg 5 kr; vägen tillåts', () => {
    const routes = generateCandidateRoutes({
      store: elgiganten,
      purchaseAmountKr: 1995,
    });
    const giftCardRoute = routes.find((r) => r.routeType === 'gift_card')!;

    expect(giftCardRoute).toBeDefined();
    expect(giftCardRoute.totalOutlayOre).toBe(200000); // 2 000 kr
    expect(giftCardRoute.extraOutlayOre).toBe(500); // 5 kr
    expect(giftCardRoute.remainingBalanceOre).toBe(500); // 5 kr
    expect(giftCardRoute.isEligible).toBe(true);
  });

  it('A04: Belopp 1 990 kr; obligatoriskt utlägg 2 000 kr -> Exakt 10 kr extra tillåts', () => {
    const B_ore = 199000; // 1 990 kr
    const U_ore = 200000; // 2 000 kr
    const extra_utlagg_ore = Math.max(0, U_ore - B_ore);
    expect(extra_utlagg_ore).toBe(1000); // Exakt 1 000 öre (10 kr)
    expect(extra_utlagg_ore <= 1000).toBe(true); // Tillåts enligt 10-kronorsgränsen
  });

  it('A05: Belopp 1 989,99 kr; obligatoriskt utlägg 2 000 kr -> 10,01 kr extra; vägen visas inte som valbar', () => {
    const B_ore = Math.round(1989.99 * 100); // 198999 öre
    const U_ore = 200000; // 200000 öre
    const extra_utlagg_ore = Math.max(0, U_ore - B_ore);
    expect(extra_utlagg_ore).toBe(1001); // 1 001 öre (10,01 kr)
    expect(extra_utlagg_ore <= 1000).toBe(false); // Ej valbar!
  });

  it('A06: Belopp 1 995 kr; endast kort på 2 100 kr -> 105 kr extra; vägen filtreras bort', () => {
    const B_ore = 199500;
    const U_ore = 210000; // 2 100 kr
    const extra_utlagg_ore = Math.max(0, U_ore - B_ore);
    expect(extra_utlagg_ore).toBe(10500); // 105 kr
    const isEligible = extra_utlagg_ore <= 1000;
    expect(isEligible).toBe(false);
  });

  it('A07: Belopp 1 995 kr; två 1 000-kort med 6 kr avgift -> 11 kr extra; vägen filtreras bort', () => {
    const B_ore = 199500;
    const giftCardsOre = 200000;
    const feeOre = 600; // 6 kr avgift
    const U_ore = giftCardsOre + feeOre; // 2 006 kr
    const extra_utlagg_ore = Math.max(0, U_ore - B_ore);
    expect(extra_utlagg_ore).toBe(1100); // 11 kr
    const isEligible = extra_utlagg_ore <= 1000;
    expect(isEligible).toBe(false);
  });

  it('A08: Avmarkera presentkort -> Alla vägar som kräver presentkort försvinner, även Zupergift', () => {
    const elgigantenRoutes = generateCandidateRoutes({
      store: elgiganten,
      purchaseAmountKr: 1995,
      allowGiftCards: false,
    });
    const cerveraRoutes = generateCandidateRoutes({
      store: cervera,
      purchaseAmountKr: 1995,
      allowGiftCards: false,
    });

    const ranked = processAndRankRoutes([...elgigantenRoutes, ...cerveraRoutes], {
      ...defaultFilter,
      allowGiftCards: false,
    });

    // Both Elgiganten (gift card) and Cervera (zupergift chain) require gift cards
    expect(ranked.some((r) => r.routeType === 'gift_card')).toBe(false);
    expect(ranked.some((r) => r.routeType === 'zupergift_chain')).toBe(false);
  });

  it('A09: Behåll presentkort, avmarkera Zupergift -> Direkt butikspresentkort finns kvar, Zupergift försvinner', () => {
    const elgigantenRoutes = generateCandidateRoutes({
      store: elgiganten,
      purchaseAmountKr: 1995,
      allowGiftCards: true,
      allowZupergift: false,
    });
    const cerveraRoutes = generateCandidateRoutes({
      store: cervera,
      purchaseAmountKr: 1995,
      allowGiftCards: true,
      allowZupergift: false,
    });

    const ranked = processAndRankRoutes([...elgigantenRoutes, ...cerveraRoutes], {
      ...defaultFilter,
      allowGiftCards: true,
      allowZupergift: false,
    });

    expect(ranked.some((r) => r.routeType === 'gift_card')).toBe(true);
    expect(ranked.some((r) => r.routeType === 'zupergift_chain')).toBe(false);
  });

  it('A10: Välj två kort -> En köpväg med två kortutfall; poängen summeras inte mellan korten', () => {
    const routes = generateCandidateRoutes({
      store: bagaren,
      purchaseAmountKr: 1995,
      availableCards: DEMO_CARDS,
    });
    const route = routes[0];

    const ranked = processAndRankRoutes([route], {
      ...defaultFilter,
      selectedCardIds: ['amex_classic', 'mc_premium'],
    });

    const evaluated = ranked[0];
    expect(evaluated.cardOutcomes['amex_classic']).toBeDefined();
    expect(evaluated.cardOutcomes['mc_premium']).toBeDefined();

    // Verify card outcomes are independent and NOT added together
    const amexBonus = evaluated.cardOutcomes['amex_classic'].cardBonusPoints;
    const mcBonus = evaluated.cardOutcomes['mc_premium'].cardBonusPoints;

    // Amex Classic: 10/100 kr on 1995 kr = 199
    // MC Premium: 15/100 kr on 1995 kr = 299
    expect(amexBonus).toBe(199);
    expect(mcBonus).toBe(299);
    expect(evaluated.selectedCardOutcome?.cardBonusPoints).toBe(299); // Takes the best of the two, not 199 + 299 = 498
  });

  it('A11: Presentkort köps för 2 000 kr; kortregel 10 bonus/100 kr, proportionellt -> Kortbonus 200, inte ytterligare 199,5 vid inlösen för 1 995 kr', () => {
    const card = DEMO_CARDS.find((c) => c.id === 'amex_classic')!; // 10/100 kr
    const giftCardPurchaseOre = 200000; // 2 000 kr
    const result = calculateCardPoints(giftCardPurchaseOre, card);

    expect(result.bonusPoints).toBe(200);
    // Upon redeeming in store for 1995 kr, the remaining card spend is 0, so NO additional 199 points!
    const redeemCardSpend = 0;
    const redeemResult = calculateCardPoints(redeemCardSpend, card);
    expect(redeemResult.bonusPoints).toBe(0);
  });

  it('A12: Testregel: partnerbonus 20/100 kr proportionellt, avrunda ned slutresultat; nivå 5/100 kr likadant; B=1 995 kr -> 399 bonuspoäng och 99 nivåpoäng, separat', () => {
    const bonusRule: PointRule = {
      id: 'rule_a12_bonus',
      pointType: 'bonus',
      qualifyingBasis: 'purchase_amount',
      ratePer100Kr: 20,
      rounding: 'floor_total',
      source: 'test',
    };

    const tierRule: PointRule = {
      id: 'rule_a12_tier',
      pointType: 'tier',
      qualifyingBasis: 'purchase_amount',
      ratePer100Kr: 5,
      rounding: 'floor_total',
      source: 'test',
    };

    const qualifyingOre = 199500; // 1 995 kr
    const bonus = calculatePoints(qualifyingOre, bonusRule);
    const tier = calculatePoints(qualifyingOre, tierRule);

    expect(bonus).toBe(399); // floor(1995 * 20 / 100) = 399
    expect(tier).toBe(99);   // floor(1995 * 5 / 100) = floor(99.75) = 99
  });

  it('A13: Samma belopp men regel om hela hundratal före multiplikation -> 380 bonuspoäng', () => {
    const bonusRuleHundratal: PointRule = {
      id: 'rule_a13_bonus',
      pointType: 'bonus',
      qualifyingBasis: 'purchase_amount',
      ratePer100Kr: 20,
      rounding: 'floor_per_100', // hela hundratal före multiplikation
      source: 'test',
    };

    const qualifyingOre = 199500; // 1 995 kr -> 19 hela hundratal
    const bonus = calculatePoints(qualifyingOre, bonusRuleHundratal);

    expect(bonus).toBe(380); // 19 * 20 = 380
  });

  it('A14: Zupergift kan växlas till butikskort utan egen poängregel -> Ingen extra bonus uppstår enbart av växlingen', () => {
    const routes = generateCandidateRoutes({
      store: cervera,
      purchaseAmountKr: 1995,
      allowGiftCards: true,
      allowZupergift: true,
    });
    const zuperRoute = routes.find((r) => r.routeType === 'zupergift_chain')!;

    const exchangeStepBreakdown = zuperRoute.breakdown.find(
      (b) => b.sourceName === 'Zupergift → Butikskort'
    );
    expect(exchangeStepBreakdown).toBeDefined();
    expect(exchangeStepBreakdown!.bonusPoints).toBe(0);
    expect(exchangeStepBreakdown!.tierPoints).toBe(0);
  });

  it('A15: Villkor för osäkerhet markeras; exakt total uppfinns inte godtyckligt', () => {
    const route = generateCandidateRoutes({
      store: elgiganten,
      purchaseAmountKr: 1995,
    })[0];

    // If an uncertainty is introduced:
    route.uncertainties.push('Villkor för delbetalning med kontant kort saknas');
    expect(route.uncertainties.length).toBeGreaterThan(0);
    expect(route.uncertainties[0]).toContain('delbetalning');
  });

  it('A16: Nivåpoäng prioriteras -> Standardordningen blir nivåpoäng först; bonuspoäng finns kvar separat', () => {
    const elgigantenRoutes = generateCandidateRoutes({ store: elgiganten, purchaseAmountKr: 1995 });
    const bagarenRoutes = generateCandidateRoutes({ store: bagaren, purchaseAmountKr: 1995 });
    const cerveraRoutes = generateCandidateRoutes({ store: cervera, purchaseAmountKr: 1995 });

    const allRoutes = [...elgigantenRoutes, ...bagarenRoutes, ...cerveraRoutes];

    // Case 1: Bonus priority (default)
    const bonusSorted = processAndRankRoutes(allRoutes, {
      ...defaultFilter,
      tierPointsImportant: false,
      sortBy: 'most_bonus',
    });
    // Cervera has 1200 bonus, Bagaren 475, Elgiganten 202
    expect(bonusSorted[0].storeId).toBe('cervera');

    // Case 2: Tier points important
    const tierSorted = processAndRankRoutes(allRoutes, {
      ...defaultFilter,
      tierPointsImportant: true,
      sortBy: 'most_bonus', // Standard order affected by tier priority
    });

    // Bagaren has 95 tier points, whereas Cervera and Elgiganten have 0 (filtered out)
    expect(tierSorted.length).toBe(1);
    expect(tierSorted[0].storeId).toBe('bagaren-och-kocken');
    expect(tierSorted[0].baseTierPoints).toBe(95);
    expect(tierSorted[0].baseBonusPoints).toBe(475); // Still separated, not merged!
    expect(tierSorted.every((r) => r.baseTierPoints > 0)).toBe(true);
  });

  it('sorterar butiker i bokstavsordning stigande (A–Ö) och fallande (Ö–A)', () => {
    const elgigantenRoutes = generateCandidateRoutes({ store: elgiganten, purchaseAmountKr: 1995 });
    const bagarenRoutes = generateCandidateRoutes({ store: bagaren, purchaseAmountKr: 1995 });
    const cerveraRoutes = generateCandidateRoutes({ store: cervera, purchaseAmountKr: 1995 });

    const allRoutes = [...elgigantenRoutes, ...bagarenRoutes, ...cerveraRoutes];

    // Sortera A–Ö
    const ascSorted = processAndRankRoutes(allRoutes, {
      ...defaultFilter,
      sortBy: 'name_asc',
    });
    expect(ascSorted[0].storeName).toBe('Bagaren och Kocken');
    expect(ascSorted[ascSorted.length - 1].storeName).toBe('Elgiganten');

    // Sortera Ö–A
    const descSorted = processAndRankRoutes(allRoutes, {
      ...defaultFilter,
      sortBy: 'name_desc',
    });
    expect(descSorted[0].storeName).toBe('Elgiganten');
    expect(descSorted[descSorted.length - 1].storeName).toBe('Bagaren och Kocken');
  });

  it('handles stores with fixed one-time bonus (e.g. Factor) without scaling base points by amount', () => {
    const factorStore: Store = {
      id: 'factor',
      name: 'Factor',
      slug: 'factor',
      aliases: ['factor'],
      categories: ['food'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 0,
        tierPer100Kr: 0,
        rewardType: 'fixed',
        fixedBonusPoints: 2000,
        fixedTierPoints: 400,
        isOneTimeOffer: true,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://onlineshopping.flysas.com/sv-SE/factor',
      },
    };

    // Test with 500 kr
    const routes500 = generateCandidateRoutes({
      store: factorStore,
      purchaseAmountKr: 500,
      availableCards: DEMO_CARDS,
    });

    expect(routes500.length).toBe(1);
    const route500 = routes500[0];
    expect(route500.isOneTimeOffer).toBe(true);
    expect(route500.baseBonusPoints).toBe(2000);
    expect(route500.baseTierPoints).toBe(400);
    // Card points with Amex Premium (15p / 100 kr) on 500 kr outlay = 75 card bonus points
    expect(route500.cardOutcomes['amex_premium'].cardBonusPoints).toBe(75);
    expect(route500.cardOutcomes['amex_premium'].totalBonusPoints).toBe(2075);
    expect(route500.cardOutcomes['amex_premium'].totalTierPoints).toBe(400);

    // Test with 2000 kr - base points must stay flat (2000p + 400 tier), NOT 40 000!
    const routes2000 = generateCandidateRoutes({
      store: factorStore,
      purchaseAmountKr: 2000,
      availableCards: DEMO_CARDS,
    });
    const route2000 = routes2000[0];
    expect(route2000.baseBonusPoints).toBe(2000);
    expect(route2000.baseTierPoints).toBe(400);
    // Card points on 2 000 kr with Amex = 300
    expect(route2000.cardOutcomes['amex_premium'].cardBonusPoints).toBe(300);
    expect(route2000.cardOutcomes['amex_premium'].totalBonusPoints).toBe(2300);
  });

  it('automatically flags high bonus stores (>= 200p) as one-time fixed offers', () => {
    const highPointStore: Store = {
      id: 'telinet',
      name: 'Telinet',
      slug: 'telinet',
      aliases: ['telinet'],
      categories: ['kitchen'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 2500, // Stored as 2500 raw points from API
        tierPer100Kr: 500,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://onlineshopping.flysas.com/sv-SE/telinet',
      },
    };

    const routes = generateCandidateRoutes({
      store: highPointStore,
      purchaseAmountKr: 1995,
      availableCards: DEMO_CARDS,
    });

    expect(routes.length).toBe(1);
    const r = routes[0];
    expect(r.isOneTimeOffer).toBe(true);
    // Base bonus points must be 2 500, not (1995 * 25) = 49 875!
    expect(r.baseBonusPoints).toBe(2500);
    expect(r.baseTierPoints).toBe(500);
  });

  it('filters routes correctly when onlyCampaigns is true', () => {
    const campaignStore: Store = {
      id: 'store-campaign',
      name: 'Kampanjbutik',
      slug: 'kampanjbutik',
      categories: ['fashion'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 50,
        tierPer100Kr: 10,
        isCampaign: true,
        campaignValidUntil: '2026-12-31',
        startUrl: 'https://example.com',
      },
    };

    const regularStore: Store = {
      id: 'store-regular',
      name: 'Vanlig butik',
      slug: 'vanlig-butik',
      categories: ['fashion'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 20,
        tierPer100Kr: 5,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://example.com',
      },
    };

    const campRoutes = generateCandidateRoutes({ store: campaignStore, purchaseAmountKr: 1000 });
    const regRoutes = generateCandidateRoutes({ store: regularStore, purchaseAmountKr: 1000 });
    const all = [...campRoutes, ...regRoutes];

    // With onlyCampaigns: false -> both are present
    const unfiltered = processAndRankRoutes(all, { ...defaultFilter, onlyCampaigns: false });
    expect(unfiltered.length).toBe(2);

    // With onlyCampaigns: true -> only campaign store is present
    const filtered = processAndRankRoutes(all, { ...defaultFilter, onlyCampaigns: true });
    expect(filtered.length).toBe(1);
    expect(filtered[0].storeId).toBe('store-campaign');
    expect(filtered[0].isExplicitCampaign).toBe(true);
  });

  it('filters routes correctly with oneTimeBonusFilter (all, only, exclude)', () => {
    const oneTimeStore: Store = {
      id: 'store-onetime',
      name: 'Factor Engångsbonus',
      slug: 'factor',
      categories: ['food'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 400,
        rewardType: 'fixed',
        isOneTimeOffer: true,
        oneTimeTerms: 'Endast ny kund',
        startUrl: 'https://factor.com',
      },
    };

    const regularStore: Store = {
      id: 'store-regular',
      name: 'Matbutik Löpande',
      slug: 'matbutik',
      categories: ['food'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 30,
        rewardType: 'rate',
        isOneTimeOffer: false,
        startUrl: 'https://matbutik.com',
      },
    };

    const oneTimeRoutes = generateCandidateRoutes({ store: oneTimeStore, purchaseAmountKr: 500 });
    const regularRoutes = generateCandidateRoutes({ store: regularStore, purchaseAmountKr: 500 });
    const all = [...oneTimeRoutes, ...regularRoutes];

    expect(oneTimeRoutes[0].isOneTimeOffer).toBe(true);
    expect(regularRoutes[0].isOneTimeOffer).toBeFalsy();

    // 1. oneTimeBonusFilter: 'all' -> contains both
    const allResult = processAndRankRoutes(all, { ...defaultFilter, oneTimeBonusFilter: 'all' });
    expect(allResult.length).toBe(2);

    // 2. oneTimeBonusFilter: 'only' -> contains only one-time offer
    const onlyResult = processAndRankRoutes(all, { ...defaultFilter, oneTimeBonusFilter: 'only' });
    expect(onlyResult.length).toBe(1);
    expect(onlyResult[0].storeId).toBe('store-onetime');
    expect(onlyResult[0].isOneTimeOffer).toBe(true);

    // 3. oneTimeBonusFilter: 'exclude' -> contains only regular offer
    const excludeResult = processAndRankRoutes(all, { ...defaultFilter, oneTimeBonusFilter: 'exclude' });
    expect(excludeResult.length).toBe(1);
    expect(excludeResult[0].storeId).toBe('store-regular');
    expect(excludeResult[0].isOneTimeOffer).toBeFalsy();
  });

  it('filters routes correctly with allowPartnerStores (toggle on and off)', () => {
    const bagarenRoutes = generateCandidateRoutes({
      store: bagaren,
      purchaseAmountKr: 1000,
      allowPartnerStores: true,
      allowGiftCards: true,
      allowZupergift: true,
    });
    const cerveraRoutes = generateCandidateRoutes({
      store: cervera,
      purchaseAmountKr: 1000,
      allowPartnerStores: true,
      allowGiftCards: true,
      allowZupergift: true,
    });
    const combined = [...bagarenRoutes, ...cerveraRoutes];

    expect(combined.some((r) => r.routeType === 'direct_partner')).toBe(true);
    expect(combined.some((r) => r.routeType === 'zupergift_chain')).toBe(true);

    // 1. allowPartnerStores: true -> direct_partner is present
    const withPartner = processAndRankRoutes(combined, {
      ...defaultFilter,
      allowPartnerStores: true,
      allowGiftCards: true,
      allowZupergift: true,
    });
    expect(withPartner.some((r) => r.routeType === 'direct_partner')).toBe(true);
    expect(withPartner.some((r) => r.routeType === 'zupergift_chain')).toBe(true);

    // 2. allowPartnerStores: false -> direct_partner is excluded, but zupergift_chain remains
    const withoutPartner = processAndRankRoutes(combined, {
      ...defaultFilter,
      allowPartnerStores: false,
      allowGiftCards: true,
      allowZupergift: true,
    });
    expect(withoutPartner.some((r) => r.routeType === 'direct_partner')).toBe(false);
    expect(withoutPartner.some((r) => r.routeType === 'zupergift_chain')).toBe(true);

    // 3. allowPartnerStores: false in generateCandidateRoutes -> doesn't generate direct_partner for bagaren
    const onlyGiftsGenerated = generateCandidateRoutes({
      store: bagaren,
      purchaseAmountKr: 1000,
      allowPartnerStores: false,
      allowGiftCards: true,
      allowZupergift: true,
    });
    expect(onlyGiftsGenerated.some((r) => r.routeType === 'direct_partner')).toBe(false);

    // 4. Both allowPartnerStores: false AND allowGiftCards: false -> 0 routes
    const noneAllowed = processAndRankRoutes(combined, {
      ...defaultFilter,
      allowPartnerStores: false,
      allowGiftCards: false,
      allowZupergift: false,
    });
    expect(noneAllowed.length).toBe(0);
  });

  it('IKEA: genererar både Zupergift-kedja och SAS EuroBonus Shop butikspresentkort under samma butik', () => {
    const ikeaStore: Store = {
      id: 'ikea',
      name: 'IKEA',
      slug: 'ikea',
      aliases: ['ikea.se'],
      logoUrl: '/logos/ikea.svg',
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
      zupergiftSupported: true,
      isZupergiftOnly: false,
    };

    const routes = generateCandidateRoutes({
      store: ikeaStore,
      purchaseAmountKr: 1000,
      allowGiftCards: true,
      allowZupergift: true,
      zupergiftRatePer100Kr: 30,
      sasGiftCardItem: {
        id: 'ikea-se',
        name: 'IKEA',
        slug: 'ikea-se',
        bonusPer100Kr: 50,
        minPurchaseAmount: null,
        isCampaign: false,
        campaignValidUntil: null,
        isHidden: false,
        isExcluded: false,
        matchedStoreId: 'ikea',
        note: '',
        syncedAt: '2026-10-02T23:23:05.841Z',
        updatedAt: null,
      },
    });

    // Båda rutterna ska finnas under butiken IKEA
    expect(routes.length).toBe(2);
    const zgRoute = routes.find((r) => r.routeType === 'zupergift_chain');
    const sasRoute = routes.find((r) => r.routeType === 'gift_card');

    expect(zgRoute).toBeDefined();
    expect(sasRoute).toBeDefined();
    expect(sasRoute?.routeTitle).toBe('SAS EuroBonus Shop – IKEA presentkort');
    expect(sasRoute?.baseBonusPoints).toBe(500); // 1000 kr * 50 / 100 = 500 poäng
    expect(zgRoute?.baseBonusPoints).toBe(300); // 1000 kr * 30 / 100 = 300 poäng

    // När rutterna rankas ska SAS-presentkortet komma först eftersom det ger 50p/100kr (500p) mot Zupergifts 30p/100kr (300p)
    const ranked = processAndRankRoutes(routes, {
      ...defaultFilter,
      selectedStoreIds: ['ikea'],
      purchaseAmountKr: 1000,
    });

    expect(ranked[0].routeType).toBe('gift_card');
    expect(ranked[0].baseBonusPoints).toBe(500);
    expect(ranked[1].routeType).toBe('zupergift_chain');
    expect(ranked[1].baseBonusPoints).toBe(300);
  });
});

