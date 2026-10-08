import {
  Store,
  PaymentCard,
  RouteCalculationResult,
  CardCalculationOutcome,
  RouteBreakdownItem,
  FilterState,
  SortOption,
  PointRule,
} from '@/types/domain';
import { DEMO_CARDS } from '../fixtures/demo-data';
import type { SasGiftCardStoreItem } from '@/lib/db';
import { isCampaignActive } from '../utils/campaign';

/**
 * Calculates point yield according to a specific PointRule and an amount in öre.
 * All monetary amounts are handled strictly in integer ören to avoid floating point bugs.
 * ALWAYS anchored on the 100 kr baseline: ratePer100Kr.
 */
export function calculatePoints(
  qualifyingAmountOre: number,
  rule: PointRule,
  numberOfCards: number = 1
): number {
  if (rule.fixedPoints !== undefined && rule.fixedPoints > 0) {
    return rule.fixedPoints * numberOfCards;
  }

  if (rule.ratePer100Kr !== undefined && rule.ratePer100Kr > 0) {
    if (rule.rounding === 'floor_per_100') {
      // Acceptanstest A13: whole 100 SEK multiples before multiplication
      const wholeHundreds = Math.floor(qualifyingAmountOre / 10000);
      return wholeHundreds * rule.ratePer100Kr;
    } else if (rule.rounding === 'floor_total') {
      // Acceptanstest A12: proportional and floor end result
      return Math.floor((qualifyingAmountOre * rule.ratePer100Kr) / 10000);
    } else {
      // Exact or standard round
      return Math.round((qualifyingAmountOre * rule.ratePer100Kr) / 10000);
    }
  }

  return 0;
}

/**
 * Calculate card bonus and tier points.
 * All card rules are anchored on rate per 100 kr.
 * Crucial rule (F08, 5.4, A11): Card points are earned only on actual new card spend,
 * NEVER on redeeming a gift card.
 */
export function calculateCardPoints(
  newCardSpendOre: number,
  card: PaymentCard
): { bonusPoints: number; tierPoints: number } {
  // Proportional per 100 kr
  const bonus = Math.floor((newCardSpendOre * card.bonusPer100Kr) / 10000);
  const tier = card.tierPer100Kr > 0 ? Math.floor((newCardSpendOre * card.tierPer100Kr) / 10000) : 0;
  return { bonusPoints: bonus, tierPoints: tier };
}

export interface RouteGenerationOptions {
  store: Store;
  purchaseAmountKr: number;
  availableCards?: PaymentCard[];
  selectedCardIds?: string[];
  allowPartnerStores?: boolean;
  allowGiftCards?: boolean;
  allowZupergift?: boolean;
  zupergiftRatePer100Kr?: number; // Configured by admin!
  zupergiftIsCampaign?: boolean;
  storePartnerBonusPer100Kr?: number;
  storePartnerTierPer100Kr?: number;
  storeIsZupergiftSupported?: boolean;
  lastCheckedAt?: string;
  /** SAS EuroBonus Shop gift card entry for this store (if any, admin-configured) */
  sasGiftCardItem?: SasGiftCardStoreItem | null;
}

/**
 * Generates all candidate routes for a store and purchase amount.
 */
export function generateCandidateRoutes(options: RouteGenerationOptions): RouteCalculationResult[] {
  const {
    store,
    purchaseAmountKr,
    availableCards = DEMO_CARDS,
    allowPartnerStores = true,
    allowGiftCards = true,
    allowZupergift = true,
    zupergiftRatePer100Kr,
    zupergiftIsCampaign,
    storePartnerBonusPer100Kr,
    storePartnerTierPer100Kr,
    storeIsZupergiftSupported,
    sasGiftCardItem,
  } = options;

  const purchaseAmountOre = Math.round(purchaseAmountKr * 100);
  const results: RouteCalculationResult[] = [];

  // Helper for computing card outcomes
  const computeCardOutcomes = (
    baseBonus: number,
    baseTier: number,
    cardSpendOre: number,
    totalOutlayOre: number
  ) => {
    const cardOutcomes: Record<string, CardCalculationOutcome> = {};
    for (const card of availableCards) {
      const { bonusPoints, tierPoints } = calculateCardPoints(cardSpendOre, card);
      const totalBonus = baseBonus + bonusPoints;
      const totalTier = baseTier + tierPoints;
      const pointsPerKronor = totalOutlayOre > 0 ? totalBonus / (totalOutlayOre / 100) : 0;

      cardOutcomes[card.id] = {
        cardId: card.id,
        cardName: card.name,
        cardBonusPoints: bonusPoints,
        cardTierPoints: tierPoints,
        totalBonusPoints: totalBonus,
        totalTierPoints: totalTier,
        pointsPerKronor: Number(pointsPerKronor.toFixed(4)),
      };
    }
    return cardOutcomes;
  };

  // ROUTE TYPE 1: Direktköp via SAS Online Shopping
  const isDirectPartner =
    allowPartnerStores &&
    (Boolean(store.partnerRule?.hasPartnerLink) ||
      storePartnerBonusPer100Kr !== undefined ||
      ['bagaren-och-kocken', 'kitchentime', 'netonnet', 'apotek-hjartat', 'boozt', 'ahlens'].includes(store.id));

  if (isDirectPartner) {
    const partnerRule = store.partnerRule;
    const isCampaignValid = isCampaignActive(partnerRule?.isCampaign, partnerRule?.campaignValidUntil);

    let partnerRateBonus =
      storePartnerBonusPer100Kr ??
      (partnerRule?.bonusPer100Kr !== undefined && partnerRule.bonusPer100Kr > 0
        ? (isCampaignValid
            ? partnerRule.bonusPer100Kr
            : (partnerRule.regularBonusPer100Kr ?? partnerRule.bonusPer100Kr))
        : 20);
    let partnerRateTier =
      storePartnerTierPer100Kr ??
      (partnerRule?.tierPer100Kr !== undefined
        ? partnerRule.tierPer100Kr
        : 0);
    let isExplicitCampaign = isCampaignValid;

    if (storePartnerBonusPer100Kr === undefined && !store.partnerRule?.hasPartnerLink) {
      if (store.id === 'bagaren-och-kocken' || store.id === 'kitchentime') {
        partnerRateBonus = 23.81;
        partnerRateTier = 4.762;
      } else if (store.id === 'netonnet') {
        partnerRateBonus = 10;
        partnerRateTier = 0;
      } else if (store.id === 'apotek-hjartat') {
        partnerRateBonus = 25;
        partnerRateTier = 0;
        isExplicitCampaign = true;
      }
    }

    const isFixedReward =
      partnerRule?.rewardType === 'fixed' ||
      Boolean(partnerRule?.isOneTimeOffer) ||
      (partnerRule?.fixedBonusPoints !== undefined && partnerRule.fixedBonusPoints > 0) ||
      ((partnerRule?.bonusPer100Kr ?? 0) >= 200 && storePartnerBonusPer100Kr === undefined);

    let baseBonusPoints: number;
    let baseTierPoints: number;
    let breakdownDesc: string;

    if (isFixedReward) {
      baseBonusPoints = isCampaignValid
        ? (partnerRule?.fixedBonusPoints ?? partnerRule?.bonusPer100Kr ?? partnerRateBonus)
        : (partnerRule?.regularFixedBonusPoints ?? partnerRule?.fixedBonusPoints ?? partnerRule?.bonusPer100Kr ?? partnerRateBonus);
      baseTierPoints =
        partnerRule?.fixedTierPoints ??
        partnerRule?.tierPer100Kr ??
        partnerRateTier;
      breakdownDesc = `Fast engångsbonus (${baseBonusPoints.toLocaleString('sv-SE')} Extrapoäng${baseTierPoints > 0 ? ` + ${baseTierPoints.toLocaleString('sv-SE')} nivåpoäng` : ''})`;
    } else {
      baseBonusPoints = Math.floor((purchaseAmountOre * partnerRateBonus) / 10000);
      baseTierPoints = partnerRateTier > 0 ? Math.floor((purchaseAmountOre * partnerRateTier) / 10000) : 0;
      breakdownDesc = `Partnerlänk ger ${partnerRateBonus} bonuspoäng per 100 kr`;
    }

    const totalOutlayOre = purchaseAmountOre;
    const extraOutlayOre = 0;
    const remainingBalanceOre = 0;

    const breakdown: RouteBreakdownItem[] = [
      {
        sourceName: 'SAS Online Shopping',
        description: breakdownDesc,
        bonusPoints: baseBonusPoints,
        tierPoints: baseTierPoints,
        qualifyingAmountOre: purchaseAmountOre,
        note: isFixedReward
          ? (store.partnerRule?.oneTimeTerms || 'Engångsbonus – gäller vanligtvis ny kund vid första köpet')
          : undefined,
      },
    ];

    const cardOutcomes = computeCardOutcomes(baseBonusPoints, baseTierPoints, purchaseAmountOre, totalOutlayOre);

    const directUrl = store.partnerRule?.startUrl || `https://onlineshopping.flysas.com/sv-SE/${store.slug}`;

    results.push({
      id: `${store.id}-direct-partner`,
      storeId: store.id,
      storeName: store.name,
      storeLogoUrl: store.logoUrl,
      routeType: 'direct_partner',
      routeTitle: isFixedReward ? 'Direktköp (fast engångsbonus)' : 'Direktköp via SAS Online Shopping',
      routeSummary: isFixedReward
        ? `Gå via partnersidan och genomför köpet för att få en fast engångsbonus på ${baseBonusPoints.toLocaleString('sv-SE')} Extrapoäng.`
        : `Gå via partnersidan, handla för ${purchaseAmountKr.toLocaleString('sv-SE')} kr och betala i butiken.`,
      primaryCategory: store.categories?.[0] || 'department',
      categories: store.categories || ['department'],
      steps: [
        {
          stepNumber: 1,
          title: 'Gå till SAS Online Shopping',
          description: `Klicka på butikslänken för ${store.name} och godkänn cookies.`,
          externalUrl: directUrl,
        },
        {
          stepNumber: 2,
          title: 'Genomför köpet i butiken',
          description: isFixedReward
            ? `Handla för ${purchaseAmountKr.toLocaleString('sv-SE')} kr och betala med ditt valda betalkort. Ger en fast engångsbonus på ${baseBonusPoints.toLocaleString('sv-SE')} Extrapoäng${baseTierPoints > 0 ? ` och ${baseTierPoints.toLocaleString('sv-SE')} nivåpoäng` : ''}.`
            : `Handla för ${purchaseAmountKr.toLocaleString('sv-SE')} kr och betala med ditt valda betalkort.`,
        },
      ],
      totalSteps: 2,
      purchaseAmountOre,
      totalOutlayOre,
      giftCardValueOre: 0,
      extraOutlayOre,
      remainingBalanceOre,
      breakdown,
      baseBonusPoints,
      baseTierPoints,
      cardOutcomes,
      isEligible: true,
      isExplicitCampaign,
      campaignValidUntil: isCampaignValid ? (partnerRule?.campaignValidUntil || undefined) : undefined,
      isOneTimeOffer: isFixedReward,
      oneTimeTerms: store.partnerRule?.oneTimeTerms || (isFixedReward ? 'Engångsbonus – gäller vanligtvis ny kund vid första köpet' : undefined),
      rewardType: isFixedReward ? 'fixed' : 'rate',
      lastCheckedAt: store.syncedAt || options.lastCheckedAt || '2026-10-02T10:47:57.278Z',
      uncertainties: [],
      startUrl: directUrl,
      customLogoUrl: store.customLogoUrl || null,
      comment: store.comment || null,
      isDemoFixture: !store.partnerRule?.hasPartnerLink,
      demoLabel: !store.partnerRule?.hasPartnerLink
        ? ((store.id === 'bagaren-och-kocken' || store.id === 'kitchentime')
            ? 'Exempel från presentation – inte aktuellt erbjudande'
            : 'Demonstrationsdata (syntetiska testregler)')
        : undefined,
    });
  }

  // ROUTE TYPE 2: Presentkort via SAS EuroBonus Shop
  const hasDirectGiftCard =
    store.giftCardRule !== undefined
      ? Boolean(store.giftCardRule.hasDirectGiftCard)
      : ['elgiganten', 'ahlens'].includes(store.id);

  if (allowGiftCards && hasDirectGiftCard) {
    const denominationOre = 100000; // 1 000 kr valör
    const neededCards = Math.ceil(purchaseAmountOre / denominationOre);
    const giftCardTotalValueOre = neededCards * denominationOre;
    const feeOre = 0;
    const totalOutlayOre = giftCardTotalValueOre + feeOre;
    const extraOutlayOre = Math.max(0, totalOutlayOre - purchaseAmountOre);
    const remainingBalanceOre = giftCardTotalValueOre - purchaseAmountOre;

    const pointsPerCard = store.id === 'elgiganten' ? 101 : 100;
    const baseBonusPoints = pointsPerCard * neededCards;
    const baseTierPoints = 0;

    const breakdown: RouteBreakdownItem[] = [
      {
        sourceName: 'SAS EuroBonus Shop',
        description: `${neededCards} st presentkort à ${(denominationOre / 100).toLocaleString('sv-SE')} kr ger ${pointsPerCard} bonuspoäng per kort`,
        bonusPoints: baseBonusPoints,
        tierPoints: 0,
        qualifyingAmountOre: giftCardTotalValueOre,
      },
    ];

    const cardOutcomes = computeCardOutcomes(baseBonusPoints, baseTierPoints, totalOutlayOre, totalOutlayOre);
    const isEligible = extraOutlayOre <= 1000;

    results.push({
      id: `${store.id}-giftcard`,
      storeId: store.id,
      storeName: store.name,
      storeLogoUrl: store.logoUrl,
      routeType: 'gift_card',
      routeTitle: 'Butikspresentkort via SAS EuroBonus Shop',
      routeSummary: `Köp ${neededCards} st presentkort och lös in i kassan.`,
      primaryCategory: store.categories?.[0] || 'department',
      categories: store.categories || ['department'],
      steps: [
        {
          stepNumber: 1,
          title: 'Köp presentkort hos SAS EuroBonus Shop',
          description: `Köp ${neededCards} st presentkort för totalt ${(giftCardTotalValueOre / 100).toLocaleString('sv-SE')} kr.`,
          externalUrl: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
        },
        {
          stepNumber: 2,
          title: `Lös in presentkorten hos ${store.name}`,
          description: `Använd koderna i butikens kassa.`,
        },
      ],
      totalSteps: 2,
      purchaseAmountOre,
      totalOutlayOre,
      giftCardValueOre: giftCardTotalValueOre,
      extraOutlayOre,
      remainingBalanceOre,
      breakdown,
      baseBonusPoints,
      baseTierPoints,
      cardOutcomes,
      isEligible,
      isExplicitCampaign: false,
      lastCheckedAt: store.syncedAt || options.lastCheckedAt || '2026-10-02T10:47:57.278Z',
      uncertainties: [],
      startUrl: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
      customLogoUrl: store.customLogoUrl || null,
      comment: store.comment || null,
      isDemoFixture: store.giftCardRule === undefined,
      demoLabel: store.giftCardRule === undefined
        ? (store.id === 'elgiganten'
            ? 'Exempel från presentation – inte aktuellt erbjudande'
            : 'Demonstrationsdata (syntetiska testregler)')
        : undefined,
    });
  }

  // ROUTE TYPE 3: Zupergift-kedja (Zupergift presentkort växlas till butikspresentkort)
  const isZuperSupported =
    storeIsZupergiftSupported ??
    (store.zupergiftSupported !== undefined
      ? store.zupergiftSupported
      : ['cervera', 'ahlens', 'kitchentime'].includes(store.id));

  if (allowGiftCards && allowZupergift && isZuperSupported) {
    // Admin configured rate per 100 kr, fallback to standard 30p / 100 kr
    const ratePer100Kr = zupergiftRatePer100Kr ?? 30;
    const baseBonusPoints = Math.floor((purchaseAmountOre * ratePer100Kr) / 10000);

    const baseTierPoints = 0;
    const totalOutlayOre = purchaseAmountOre;
    const extraOutlayOre = 0;
    const remainingBalanceOre = 0;

    const breakdown: RouteBreakdownItem[] = [
      {
        sourceName: 'SAS EuroBonus Shop (Zupergift)',
        description: `Köp av Zupergift ger ${ratePer100Kr} Extrapoäng per 100 kr (administreras i portalen)`,
        bonusPoints: baseBonusPoints,
        tierPoints: 0,
        qualifyingAmountOre: purchaseAmountOre,
      },
      {
        sourceName: 'Zupergift → Butikskort',
        description: 'Växling från Zupergift till butikspresentkort (ger inga extra poäng)',
        bonusPoints: 0,
        tierPoints: 0,
        qualifyingAmountOre: purchaseAmountOre,
        note: 'Ingen ytterligare bonus vid inlösen enligt regel A14',
      },
    ];

    const cardOutcomes = computeCardOutcomes(baseBonusPoints, baseTierPoints, totalOutlayOre, totalOutlayOre);

    results.push({
      id: `${store.id}-zupergift-chain`,
      storeId: store.id,
      storeName: store.name,
      storeLogoUrl: store.logoUrl,
      routeType: 'zupergift_chain',
      routeTitle: 'Zupergift-kedja (SAS → Zupergift → Butik)',
      routeSummary: `Köp Zupergift för ${purchaseAmountKr.toLocaleString('sv-SE')} kr och växla till ${store.name}-presentkort.`,
      primaryCategory: store.categories?.[0] || 'department',
      categories: store.categories || ['department'],
      steps: [
        {
          stepNumber: 1,
          title: 'Köp Zupergift med SAS EuroBonus',
          description: `Köp Zupergift-presentkort för ${purchaseAmountKr.toLocaleString('sv-SE')} kr på SAS EuroBonus Shop (${ratePer100Kr}p / 100 kr).`,
          externalUrl: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
        },
        {
          stepNumber: 2,
          title: `Växla till ${store.name}-presentkort`,
          description: `Gå till Zupergift och växla koden till ett ${store.name}-presentkort.`,
          externalUrl: 'https://zupergift.com/se/alla-presentkort',
        },
        {
          stepNumber: 3,
          title: `Genomför köpet hos ${store.name}`,
          description: 'Lös in presentkortet i kassan.',
        },
      ],
      totalSteps: 3,
      purchaseAmountOre,
      totalOutlayOre,
      giftCardValueOre: purchaseAmountOre,
      extraOutlayOre,
      remainingBalanceOre,
      breakdown,
      baseBonusPoints,
      baseTierPoints,
      cardOutcomes,
      isEligible: true,
      isExplicitCampaign: Boolean(zupergiftIsCampaign),
      lastCheckedAt: store.syncedAt || options.lastCheckedAt || '2026-10-02T11:10:41.783Z',
      uncertainties: [],
      startUrl: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
      customLogoUrl: store.customLogoUrl || null,
      comment: store.comment || null,
      isDemoFixture: store.zupergiftSupported === undefined,
      demoLabel: store.zupergiftSupported === undefined
        ? 'Demonstrationsdata (syntetiska testregler)'
        : undefined,
    });
  }

  // ROUTE TYPE 4: SAS EuroBonus Shop – butikspresentkort (admin-konfigurerat)
  // Activated when admin has filled in bonusPer100Kr > 0 for a matched SAS gift card store.
  if (allowGiftCards && sasGiftCardItem && !sasGiftCardItem.isHidden && !sasGiftCardItem.isExcluded) {
    const rate = sasGiftCardItem.bonusPer100Kr;
    if (rate !== null && rate > 0) {
      const minPurchaseKr = sasGiftCardItem.minPurchaseAmount ?? 0;
      const minPurchaseOre = minPurchaseKr * 100;
      const giftCardValueOre = Math.max(purchaseAmountOre, minPurchaseOre);
      const totalOutlayOre = giftCardValueOre;
      const extraOutlayOre = Math.max(0, totalOutlayOre - purchaseAmountOre);
      const remainingBalanceOre = Math.max(0, giftCardValueOre - purchaseAmountOre);

      const baseBonusPoints = Math.floor((giftCardValueOre * rate) / 10000);
      const baseTierPoints = 0;

      const cardValueKr = giftCardValueOre / 100;
      const breakdownText =
        minPurchaseKr > 0 && purchaseAmountKr < minPurchaseKr
          ? `Köp av ${sasGiftCardItem.name}-presentkort (${cardValueKr.toLocaleString('sv-SE')} kr, minimiköp ${minPurchaseKr} kr) ger ${rate} Extrapoäng per 100 kr`
          : `Köp av ${sasGiftCardItem.name}-presentkort ger ${rate} Extrapoäng per 100 kr (administreras av admin)`;

      const breakdown: RouteBreakdownItem[] = [
        {
          sourceName: 'SAS EuroBonus Shop',
          description: breakdownText,
          bonusPoints: baseBonusPoints,
          tierPoints: 0,
          qualifyingAmountOre: giftCardValueOre,
        },
      ];

      const cardOutcomes = computeCardOutcomes(baseBonusPoints, baseTierPoints, totalOutlayOre, totalOutlayOre);

      const step1Desc =
        minPurchaseKr > 0 && purchaseAmountKr < minPurchaseKr
          ? `Besök SAS EuroBonus Shop och köp ett presentkort från ${sasGiftCardItem.name} för ${cardValueKr.toLocaleString('sv-SE')} kr (minimiköp ${minPurchaseKr} kr, kvarvarande saldo ${(remainingBalanceOre / 100).toLocaleString('sv-SE')} kr sparas till senare köp). Du får ${rate} Extrapoäng per 100 kr.`
          : `Besök SAS EuroBonus Shop och köp ett presentkort från ${sasGiftCardItem.name} för ${purchaseAmountKr.toLocaleString('sv-SE')} kr. Du får ${rate} Extrapoäng per 100 kr.`;

      const uncertainties =
        minPurchaseKr > 0 && purchaseAmountKr < minPurchaseKr
          ? [`Presentkortet har ett minimiköp på ${minPurchaseKr} kr. ${(remainingBalanceOre / 100).toLocaleString('sv-SE')} kr sparas på presentkortet för framtida inköp.`]
          : [];

      results.push({
        id: `${store.id}-sas-giftcard`,
        storeId: store.id,
        storeName: store.name,
        storeLogoUrl: store.logoUrl,
        routeType: 'gift_card',
        routeTitle: `SAS EuroBonus Shop – ${sasGiftCardItem.name} presentkort`,
        routeSummary:
          minPurchaseKr > 0 && purchaseAmountKr < minPurchaseKr
            ? `Köp ${sasGiftCardItem.name}-presentkort på SAS EuroBonus Shop (min. ${minPurchaseKr} kr) och lös in i kassan.`
            : `Köp ${sasGiftCardItem.name}-presentkort på SAS EuroBonus Shop och lös in i kassan.`,
        primaryCategory: store.categories?.[0] || 'department',
        categories: store.categories || ['department'],
        steps: [
          {
            stepNumber: 1,
            title: `Köp ${sasGiftCardItem.name}-presentkort hos SAS EuroBonus Shop`,
            description: step1Desc,
            externalUrl: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
          },
          {
            stepNumber: 2,
            title: `Lös in presentkortet hos ${store.name}`,
            description: `Använd presentkortskoden i ${store.name}s kassa.`,
          },
        ],
        totalSteps: 2,
        purchaseAmountOre,
        totalOutlayOre,
        giftCardValueOre,
        extraOutlayOre,
        remainingBalanceOre,
        breakdown,
        baseBonusPoints,
        baseTierPoints,
        cardOutcomes,
        isEligible: true,
        isExplicitCampaign: isCampaignActive(sasGiftCardItem.isCampaign, sasGiftCardItem.campaignValidUntil),
        campaignValidUntil: isCampaignActive(sasGiftCardItem.isCampaign, sasGiftCardItem.campaignValidUntil) ? (sasGiftCardItem.campaignValidUntil || undefined) : undefined,
        lastCheckedAt: sasGiftCardItem.updatedAt || sasGiftCardItem.syncedAt || options.lastCheckedAt || new Date().toISOString(),
        uncertainties,
        startUrl: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
        customLogoUrl: store.customLogoUrl || null,
        comment: store.comment || null,
        isDemoFixture: false,
      });
    }
  }

  return results;
}

/**
 * Filter and sort results based on user preferences.
 */
export function processAndRankRoutes(
  routes: RouteCalculationResult[],
  filter: FilterState
): RouteCalculationResult[] {
  let filtered = routes.filter((route) => route.isEligible);

  if (filter.allowPartnerStores === false) {
    filtered = filtered.filter((r) => r.routeType !== 'direct_partner');
  }

  if (!filter.allowGiftCards) {
    filtered = filtered.filter((r) => r.routeType !== 'gift_card' && r.routeType !== 'zupergift_chain');
  } else if (!filter.allowZupergift) {
    filtered = filtered.filter((r) => r.routeType !== 'zupergift_chain');
  }

  const activeCardIds = filter.selectedCardIds.length > 0 ? filter.selectedCardIds : [];

  let enriched = filtered.map((route) => {
    let bestOutcome: CardCalculationOutcome | undefined;

    if (activeCardIds.length > 0) {
      for (const cardId of activeCardIds) {
        const outcome = route.cardOutcomes[cardId];
        if (!outcome) continue;

        if (!bestOutcome) {
          bestOutcome = outcome;
        } else {
          if (filter.tierPointsImportant) {
            if (outcome.totalTierPoints > bestOutcome.totalTierPoints) {
              bestOutcome = outcome;
            } else if (
              outcome.totalTierPoints === bestOutcome.totalTierPoints &&
              outcome.totalBonusPoints > bestOutcome.totalBonusPoints
            ) {
              bestOutcome = outcome;
            }
          } else {
            if (outcome.totalBonusPoints > bestOutcome.totalBonusPoints) {
              bestOutcome = outcome;
            }
          }
        }
      }
    }

    return {
      ...route,
      selectedCardOutcome: bestOutcome,
    };
  });

  // Filter: When tier points are marked important, only include routes that actually award tier points (> 0)
  if (filter.tierPointsImportant) {
    enriched = enriched.filter((route) => {
      const tierPoints = route.selectedCardOutcome?.totalTierPoints ?? route.baseTierPoints;
      return tierPoints > 0;
    });
  }

  // Filter: When onlyCampaigns is true, only include routes that have an active campaign
  if (filter.onlyCampaigns) {
    enriched = enriched.filter((route) => route.isExplicitCampaign);
  }

  // Filter: One-time bonus handling ('all' | 'only' | 'exclude')
  if (filter.oneTimeBonusFilter === 'only') {
    enriched = enriched.filter((route) => Boolean(route.isOneTimeOffer));
  } else if (filter.oneTimeBonusFilter === 'exclude') {
    enriched = enriched.filter((route) => !route.isOneTimeOffer);
  }

  const effectiveSort: SortOption =
    filter.tierPointsImportant && filter.sortBy === 'most_bonus'
      ? 'most_tier'
      : filter.sortBy;

  enriched.sort((a, b) => {
    const aBonus = a.selectedCardOutcome?.totalBonusPoints ?? a.baseBonusPoints;
    const bBonus = b.selectedCardOutcome?.totalBonusPoints ?? b.baseBonusPoints;
    const aTier = a.selectedCardOutcome?.totalTierPoints ?? a.baseTierPoints;
    const bTier = b.selectedCardOutcome?.totalTierPoints ?? b.baseTierPoints;
    switch (effectiveSort) {
      case 'most_tier': {
        if (bTier !== aTier) return bTier - aTier;
        if (bBonus !== aBonus) return bBonus - aBonus;
        break;
      }
      case 'most_bonus': {
        if (bBonus !== aBonus) return bBonus - aBonus;
        if (bTier !== aTier) return bTier - aTier;
        break;
      }
      case 'name_asc': {
        const nameCmp = a.storeName.localeCompare(b.storeName, 'sv');
        if (nameCmp !== 0) return nameCmp;
        if (bBonus !== aBonus) return bBonus - aBonus;
        break;
      }
      case 'name_desc': {
        const nameCmp = b.storeName.localeCompare(a.storeName, 'sv');
        if (nameCmp !== 0) return nameCmp;
        if (bBonus !== aBonus) return bBonus - aBonus;
        break;
      }
    }

    if (a.totalOutlayOre !== b.totalOutlayOre) return a.totalOutlayOre - b.totalOutlayOre;
    if (a.totalSteps !== b.totalSteps) return a.totalSteps - b.totalSteps;
    return a.storeName.localeCompare(b.storeName, 'sv');
  });

  return enriched;
}
