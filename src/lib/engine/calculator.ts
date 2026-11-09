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

export const ZUPERGIFT_DENOMINATIONS_KR = [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 5000, 10000,
];
export const ZUPERGIFT_MIN_PURCHASE_KR = 50;

function gcdTwo(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export interface GiftCardCoverageResult {
  /** True if at least one valid gift card combination <= purchaseAmountKr and >= effectiveMinKr exists */
  canMatchAmount: boolean;
  /** Effective minimum purchase required for this gift card in SEK */
  effectiveMinKr: number;
  /** Maximum gift card value in SEK that does not exceed purchaseAmountKr (0 if canMatchAmount is false) */
  matchedValueKr: number;
  /** Value in SEK to use when matchPurchaseAmount is false and canMatchAmount is false (equals effectiveMinKr) */
  fallbackMinValueKr: number;
  /** Breakdown of denominations used for matchedValueKr (sorted largest first) */
  combo: { denomKr: number; count: number }[];
}

/**
 * Computes the largest sum of available gift card denominations that is <= purchaseAmountKr,
 * using the fewest number of cards for that sum.
 */
export function computeGiftCardCoverage(
  purchaseAmountKr: number,
  denominationsKr?: number[] | null,
  minPurchaseKr?: number | null
): GiftCardCoverageResult {
  const cleanDenoms = Array.from(
    new Set((denominationsKr || []).map((d) => Math.round(d)).filter((d) => d > 0))
  ).sort((a, b) => a - b);

  const minDenom = cleanDenoms.length > 0 ? cleanDenoms[0] : 0;
  const rawMin = minPurchaseKr && minPurchaseKr > 0 ? Math.round(minPurchaseKr) : 0;
  const effectiveMinKr = Math.max(rawMin, minDenom);

  if (cleanDenoms.length === 0) {
    if (effectiveMinKr > 0 && purchaseAmountKr < effectiveMinKr) {
      return {
        canMatchAmount: false,
        effectiveMinKr,
        matchedValueKr: 0,
        fallbackMinValueKr: effectiveMinKr,
        combo: [],
      };
    }
    return {
      canMatchAmount: true,
      effectiveMinKr,
      matchedValueKr: purchaseAmountKr,
      fallbackMinValueKr: purchaseAmountKr,
      combo: [],
    };
  }

  if (purchaseAmountKr < effectiveMinKr) {
    return {
      canMatchAmount: false,
      effectiveMinKr,
      matchedValueKr: 0,
      fallbackMinValueKr: effectiveMinKr,
      combo: [{ denomKr: minDenom || effectiveMinKr, count: 1 }],
    };
  }

  const maxTargetKr = Math.floor(purchaseAmountKr);
  const g = cleanDenoms.reduce((acc, d) => gcdTwo(acc, d), cleanDenoms[0]);
  const scaledDenoms = cleanDenoms.map((d) => d / g);
  const scaledTarget = Math.floor(maxTargetKr / g);

  if (scaledTarget <= 0) {
    return {
      canMatchAmount: false,
      effectiveMinKr,
      matchedValueKr: 0,
      fallbackMinValueKr: effectiveMinKr,
      combo: [{ denomKr: minDenom, count: 1 }],
    };
  }

  const largestDenom = cleanDenoms[cleanDenoms.length - 1];
  const largestScaled = scaledDenoms[scaledDenoms.length - 1];
  const bulkCount =
    scaledTarget > 20000
      ? Math.max(0, Math.floor((scaledTarget - 10000) / largestScaled))
      : 0;
  const dpTarget = scaledTarget - bulkCount * largestScaled;

  const minCards = new Int32Array(dpTarget + 1).fill(-1);
  const chosenDenom = new Int32Array(dpTarget + 1).fill(0);
  minCards[0] = 0;

  for (let v = 1; v <= dpTarget; v++) {
    for (let i = scaledDenoms.length - 1; i >= 0; i--) {
      const sd = scaledDenoms[i];
      if (v >= sd && minCards[v - sd] !== -1) {
        const candidate = minCards[v - sd] + 1;
        if (minCards[v] === -1 || candidate < minCards[v]) {
          minCards[v] = candidate;
          chosenDenom[v] = cleanDenoms[i];
        }
      }
    }
  }

  let bestV = 0;
  for (let v = dpTarget; v >= 1; v--) {
    if (minCards[v] !== -1) {
      bestV = v;
      break;
    }
  }

  const matchedValueKr = (bestV + bulkCount * largestScaled) * g;
  if (matchedValueKr <= 0 || matchedValueKr < effectiveMinKr) {
    return {
      canMatchAmount: false,
      effectiveMinKr,
      matchedValueKr: 0,
      fallbackMinValueKr: effectiveMinKr,
      combo: [{ denomKr: minDenom, count: 1 }],
    };
  }

  const counts = new Map<number, number>();
  if (bulkCount > 0) {
    counts.set(largestDenom, bulkCount);
  }
  let curr = bestV;
  while (curr > 0) {
    const d = chosenDenom[curr];
    if (!d) break;
    counts.set(d, (counts.get(d) || 0) + 1);
    curr -= d / g;
  }

  const combo = Array.from(counts.entries())
    .map(([denomKr, count]) => ({ denomKr, count }))
    .sort((a, b) => b.denomKr - a.denomKr);

  return {
    canMatchAmount: true,
    effectiveMinKr,
    matchedValueKr,
    fallbackMinValueKr: matchedValueKr,
    combo,
  };
}

export interface RouteGenerationOptions {
  store: Store;
  purchaseAmountKr: number;
  availableCards?: PaymentCard[];
  selectedCardIds?: string[];
  allowPartnerStores?: boolean;
  allowGiftCards?: boolean;
  allowZupergift?: boolean;
  matchPurchaseAmount?: boolean;
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
    matchPurchaseAmount,
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
    totalOutlayOre: number,
    routeAcceptsAmex: boolean = true,
    amexSpendOreOverride?: number
  ) => {
    const cardOutcomes: Record<string, CardCalculationOutcome> = {};
    for (const card of availableCards) {
      const effectiveSpendOre =
        card.network === 'amex'
          ? amexSpendOreOverride !== undefined
            ? amexSpendOreOverride
            : routeAcceptsAmex
            ? cardSpendOre
            : 0
          : cardSpendOre;
      const { bonusPoints, tierPoints } =
        effectiveSpendOre > 0
          ? calculateCardPoints(effectiveSpendOre, card)
          : { bonusPoints: 0, tierPoints: 0 };
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
      (store.partnerRule === undefined &&
        ['bagaren-och-kocken', 'kitchentime', 'ahlens'].includes(store.id)));

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

    const resolvedRegularTierPer100Kr =
      partnerRule?.regularTierPer100Kr !== undefined
        ? partnerRule.regularTierPer100Kr
        : partnerRule?.regularBonusPer100Kr !== undefined &&
          partnerRule.regularBonusPer100Kr > 0 &&
          partnerRule?.bonusPer100Kr !== undefined &&
          partnerRule.bonusPer100Kr > 0 &&
          partnerRule?.tierPer100Kr !== undefined &&
          partnerRule.tierPer100Kr > 0 &&
          partnerRule.bonusPer100Kr !== partnerRule.regularBonusPer100Kr
        ? Math.round(partnerRule.regularBonusPer100Kr * (partnerRule.tierPer100Kr / partnerRule.bonusPer100Kr))
        : partnerRule?.tierPer100Kr;

    let partnerRateTier =
      storePartnerTierPer100Kr ??
      (partnerRule?.tierPer100Kr !== undefined
        ? (isCampaignValid
            ? partnerRule.tierPer100Kr
            : (resolvedRegularTierPer100Kr ?? partnerRule.tierPer100Kr))
        : 0);
    let isExplicitCampaign = isCampaignValid;

    if (storePartnerBonusPer100Kr === undefined && !store.partnerRule?.hasPartnerLink) {
      if (store.id === 'bagaren-och-kocken' || store.id === 'kitchentime') {
        partnerRateBonus = 23.81;
        partnerRateTier = 4.762;
      }
    }

    const isFixedReward =
      partnerRule?.rewardType === 'fixed' ||
      Boolean(partnerRule?.isOneTimeOffer) ||
      (partnerRule?.fixedBonusPoints !== undefined && partnerRule.fixedBonusPoints > 0) ||
      ((partnerRule?.bonusPer100Kr ?? 0) >= 200 && storePartnerBonusPer100Kr === undefined);

    const resolvedRegularFixedTierPoints =
      partnerRule?.regularFixedTierPoints !== undefined
        ? partnerRule.regularFixedTierPoints
        : partnerRule?.regularFixedBonusPoints !== undefined &&
          partnerRule.regularFixedBonusPoints > 0 &&
          (partnerRule?.fixedBonusPoints ?? 0) > 0 &&
          (partnerRule?.fixedTierPoints ?? 0) > 0 &&
          partnerRule.fixedBonusPoints !== partnerRule.regularFixedBonusPoints
        ? Math.round(
            partnerRule.regularFixedBonusPoints *
              ((partnerRule.fixedTierPoints ?? 0) / (partnerRule.fixedBonusPoints ?? 1))
          )
        : partnerRule?.fixedTierPoints;

    let baseBonusPoints: number;
    let baseTierPoints: number;
    let breakdownDesc: string;

    const excludesVat = Boolean(store.excludesVat);
    const qualifyingAmountOre =
      excludesVat && !isFixedReward
        ? Math.round(purchaseAmountOre * 0.8)
        : purchaseAmountOre;

    if (isFixedReward) {
      baseBonusPoints = isCampaignValid
        ? (partnerRule?.fixedBonusPoints ?? partnerRule?.bonusPer100Kr ?? partnerRateBonus)
        : (partnerRule?.regularFixedBonusPoints ?? partnerRule?.fixedBonusPoints ?? partnerRule?.bonusPer100Kr ?? partnerRateBonus);
      baseTierPoints = isCampaignValid
        ? (partnerRule?.fixedTierPoints ?? partnerRule?.tierPer100Kr ?? partnerRateTier)
        : (resolvedRegularFixedTierPoints ?? partnerRule?.fixedTierPoints ?? partnerRule?.tierPer100Kr ?? partnerRateTier);
      breakdownDesc = `Fast engångsbonus (${baseBonusPoints.toLocaleString('sv-SE')} Extrapoäng${baseTierPoints > 0 ? ` + ${baseTierPoints.toLocaleString('sv-SE')} nivåpoäng` : ''})`;
    } else {
      baseBonusPoints = Math.floor((qualifyingAmountOre * partnerRateBonus) / 10000);
      baseTierPoints = partnerRateTier > 0 ? Math.floor((qualifyingAmountOre * partnerRateTier) / 10000) : 0;
      breakdownDesc = excludesVat
        ? `Partnerlänk ger ${partnerRateBonus} bonuspoäng${partnerRateTier > 0 ? ` + ${partnerRateTier} nivåpoäng` : ''} per 100 kr exkl. moms (80 % av köpbeloppet = ${(qualifyingAmountOre / 100).toLocaleString('sv-SE')} kr)`
        : `Partnerlänk ger ${partnerRateBonus} bonuspoäng${partnerRateTier > 0 ? ` + ${partnerRateTier} nivåpoäng` : ''} per 100 kr`;
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
        qualifyingAmountOre,
        note: isFixedReward
          ? (store.partnerRule?.oneTimeTerms || 'Engångsbonus – gäller vanligtvis ny kund vid första köpet')
          : excludesVat
          ? `Ej poäng på moms – partnerpoäng beräknas på 80 % av köpbeloppet (${(qualifyingAmountOre / 100).toLocaleString('sv-SE')} kr)`
          : undefined,
      },
    ];

    // Partner store routes only accept Amex if verified (store.acceptsAmex === true).
    // Note: buildAllStores() explicitly resolves store.acceptsAmex = false for all unverified partner stores.
    const partnerAcceptsAmex =
      store.acceptsAmex !== undefined
        ? Boolean(store.acceptsAmex)
        : true;

    const cardOutcomes = computeCardOutcomes(
      baseBonusPoints,
      baseTierPoints,
      purchaseAmountOre,
      totalOutlayOre,
      partnerAcceptsAmex
    );

    const directUrl =
      store.partnerRule?.startUrl && store.partnerRule.startUrl.includes('/butiker/')
        ? store.partnerRule.startUrl
        : (store.partnerRule?.uuid
            ? `https://onlineshopping.flysas.com/sv-SE/butiker/${store.slug}/${store.partnerRule.uuid}`
            : (store.partnerRule?.startUrl || `https://onlineshopping.flysas.com/sv-SE/butiker/${store.slug}`));

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
          description: `Gå till butikssidan för ${store.name} på SAS Online Shopping och godkänn cookies.`,
          externalUrl: directUrl,
        },
        {
          stepNumber: 2,
          title: 'Genomför köpet i butiken',
          description: isFixedReward
            ? `Handla för ${purchaseAmountKr.toLocaleString('sv-SE')} kr och betala med ditt valda betalkort. Ger en fast engångsbonus på ${baseBonusPoints.toLocaleString('sv-SE')} Extrapoäng${baseTierPoints > 0 ? ` och ${baseTierPoints.toLocaleString('sv-SE')} nivåpoäng` : ''}.`
            : `Handla för ${purchaseAmountKr.toLocaleString('sv-SE')} kr och betala med ditt valda betalkort.${excludesVat ? ` Partnerpoäng hos ${store.name} beräknas exklusive moms (på ${(qualifyingAmountOre / 100).toLocaleString('sv-SE')} kr).` : ''}`,
        },
      ],
      totalSteps: 2,
      purchaseAmountOre,
      qualifyingAmountOre,
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
      regularBonusPer100Kr: partnerRule?.regularBonusPer100Kr,
      regularTierPer100Kr: resolvedRegularTierPer100Kr,
      regularFixedBonusPoints: partnerRule?.regularFixedBonusPoints,
      regularFixedTierPoints: resolvedRegularFixedTierPoints,
      isOneTimeOffer: isFixedReward,
      oneTimeTerms: store.partnerRule?.oneTimeTerms || (isFixedReward ? 'Engångsbonus – gäller vanligtvis ny kund vid första köpet' : undefined),
      rewardType: isFixedReward ? 'fixed' : 'rate',
      lastCheckedAt: store.syncedAt || options.lastCheckedAt || '2026-10-02T10:47:57.278Z',
      uncertainties: [],
      startUrl: directUrl,
      customLogoUrl: store.customLogoUrl || null,
      comment: store.comment || null,
      acceptsAmex: partnerAcceptsAmex,
      excludesVat: excludesVat && !isFixedReward,
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

  const hasActiveSasGiftCardItem = Boolean(
    sasGiftCardItem &&
      !sasGiftCardItem.isHidden &&
      !sasGiftCardItem.isExcluded &&
      !sasGiftCardItem.isMissingFromSource &&
      (sasGiftCardItem.bonusPer100Kr ?? 0) > 0
  );

  if (allowGiftCards && hasDirectGiftCard && !hasActiveSasGiftCardItem) {
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
    const directGiftCardUrl =
      store.giftCardRule?.startUrl && store.giftCardRule.startUrl.trim() !== ''
        ? store.giftCardRule.startUrl
        : `https://www.saseurobonusshop.com/se/${store.slug}`;
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
          externalUrl: directGiftCardUrl,
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
      startUrl: directGiftCardUrl,
      customLogoUrl: store.customLogoUrl || null,
      comment: store.comment || null,
      acceptsAmex: true,
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
    const zgCoverage = computeGiftCardCoverage(
      purchaseAmountKr,
      ZUPERGIFT_DENOMINATIONS_KR,
      ZUPERGIFT_MIN_PURCHASE_KR
    );
    const exceedsPurchaseAmount = !zgCoverage.canMatchAmount;
    const zgCardValueKr = exceedsPurchaseAmount
      ? zgCoverage.fallbackMinValueKr
      : zgCoverage.matchedValueKr;
    const giftCardValueOre = Math.round(zgCardValueKr * 100);
    const directStorePayOre = exceedsPurchaseAmount
      ? 0
      : Math.max(0, purchaseAmountOre - giftCardValueOre);

    const baseBonusPoints = Math.floor((giftCardValueOre * ratePer100Kr) / 10000);
    const baseTierPoints = 0;
    const totalOutlayOre = exceedsPurchaseAmount ? giftCardValueOre : purchaseAmountOre;
    const extraOutlayOre = Math.max(0, totalOutlayOre - purchaseAmountOre);
    const remainingBalanceOre = Math.max(0, giftCardValueOre - purchaseAmountOre);

    const storeAcceptsAmex = store.acceptsAmex !== undefined ? Boolean(store.acceptsAmex) : true;
    const amexSpendOre = giftCardValueOre + (storeAcceptsAmex ? directStorePayOre : 0);

    const breakdown: RouteBreakdownItem[] = [
      {
        sourceName: 'SAS EuroBonus Shop (Zupergift)',
        description: `Köp av Zupergift (${zgCardValueKr.toLocaleString('sv-SE')} kr) ger ${ratePer100Kr} Extrapoäng per 100 kr (administreras i portalen)`,
        bonusPoints: baseBonusPoints,
        tierPoints: 0,
        qualifyingAmountOre: giftCardValueOre,
      },
      {
        sourceName: 'Zupergift → Butikskort',
        description: 'Växling från Zupergift till butikspresentkort (ger inga extra poäng)',
        bonusPoints: 0,
        tierPoints: 0,
        qualifyingAmountOre: giftCardValueOre,
        note: 'Ingen ytterligare bonus vid inlösen enligt regel A14',
      },
    ];

    const cardOutcomes = computeCardOutcomes(
      baseBonusPoints,
      baseTierPoints,
      totalOutlayOre,
      totalOutlayOre,
      true,
      amexSpendOre
    );

    const zupergiftSlug = store.zupergiftSlug || store.slug || store.id;
    const zupergiftItemUrl =
      store.zupergiftUrl ||
      (zupergiftSlug ? `https://zupergift.com/se/${zupergiftSlug}` : 'https://zupergift.com/se/alla-presentkort');

    const step3Desc =
      directStorePayOre > 0
        ? `Lös in presentkortet (${zgCardValueKr.toLocaleString('sv-SE')} kr) i kassan och betala resterande ${(directStorePayOre / 100).toLocaleString('sv-SE')} kr med ditt betalkort.`
        : 'Lös in presentkortet i kassan.';

    results.push({
      id: `${store.id}-zupergift-chain`,
      storeId: store.id,
      storeName: store.name,
      storeLogoUrl: store.logoUrl,
      routeType: 'zupergift_chain',
      routeTitle: 'Zupergift-kedja (SAS → Zupergift → Butik)',
      routeSummary: `Köp Zupergift för ${zgCardValueKr.toLocaleString('sv-SE')} kr och växla till ${store.name}-presentkort.`,
      primaryCategory: store.categories?.[0] || 'department',
      categories: store.categories || ['department'],
      steps: [
        {
          stepNumber: 1,
          title: 'Köp Zupergift med SAS EuroBonus',
          description: `Köp Zupergift-presentkort för ${zgCardValueKr.toLocaleString('sv-SE')} kr på SAS EuroBonus Shop (${ratePer100Kr}p / 100 kr).`,
          externalUrl: 'https://www.saseurobonusshop.com/se/zupergift-presentkort',
        },
        {
          stepNumber: 2,
          title: `Växla till ${store.name}-presentkort`,
          description: `Gå till Zupergift och växla koden till ett ${store.name}-presentkort.`,
          externalUrl: zupergiftItemUrl,
        },
        {
          stepNumber: 3,
          title: `Genomför köpet hos ${store.name}`,
          description: step3Desc,
        },
      ],
      totalSteps: 3,
      purchaseAmountOre,
      totalOutlayOre,
      giftCardValueOre,
      directStorePayOre,
      extraOutlayOre,
      remainingBalanceOre,
      exceedsPurchaseAmount,
      minPurchaseAmountKr: ZUPERGIFT_MIN_PURCHASE_KR,
      breakdown,
      baseBonusPoints,
      baseTierPoints,
      cardOutcomes,
      isEligible: matchPurchaseAmount === true ? !exceedsPurchaseAmount : true,
      eligibilityReason:
        matchPurchaseAmount === true && exceedsPurchaseAmount
          ? `Minsta köp för Zupergift är ${ZUPERGIFT_MIN_PURCHASE_KR} kr`
          : undefined,
      isExplicitCampaign: Boolean(zupergiftIsCampaign),
      lastCheckedAt: store.syncedAt || options.lastCheckedAt || '2026-10-02T11:10:41.783Z',
      uncertainties: exceedsPurchaseAmount
        ? [`Zupergift har ett minimiköp på ${ZUPERGIFT_MIN_PURCHASE_KR} kr. ${(remainingBalanceOre / 100).toLocaleString('sv-SE')} kr sparas på presentkortet.`]
        : [],
      startUrl: 'https://www.saseurobonusshop.com/se/zupergift-presentkort',
      customLogoUrl: store.customLogoUrl || null,
      comment: store.comment || null,
      acceptsAmex: true,
      isDemoFixture: store.zupergiftSupported === undefined,
      demoLabel: store.zupergiftSupported === undefined
        ? 'Demonstrationsdata (syntetiska testregler)'
        : undefined,
    });
  }

  // ROUTE TYPE 4: SAS EuroBonus Shop – butikspresentkort (synkat/konfigurerat)
  // Activated when bonusPer100Kr > 0 for a matched SAS gift card store.
  if (
    allowGiftCards &&
    sasGiftCardItem &&
    !sasGiftCardItem.isHidden &&
    !sasGiftCardItem.isExcluded &&
    !sasGiftCardItem.isMissingFromSource
  ) {
    const rate = sasGiftCardItem.bonusPer100Kr;
    if (rate !== null && rate > 0) {
      const minPurchaseKr = sasGiftCardItem.minPurchaseAmount ?? 0;
      const denoms = sasGiftCardItem.denominationsKr || [];
      const coverage = computeGiftCardCoverage(purchaseAmountKr, denoms, minPurchaseKr);
      const exceedsPurchaseAmount = !coverage.canMatchAmount;

      const cardValueKr = exceedsPurchaseAmount
        ? coverage.fallbackMinValueKr
        : coverage.matchedValueKr;
      const giftCardValueOre = Math.round(cardValueKr * 100);
      const directStorePayOre = exceedsPurchaseAmount
        ? 0
        : Math.max(0, purchaseAmountOre - giftCardValueOre);
      const totalOutlayOre = exceedsPurchaseAmount ? giftCardValueOre : purchaseAmountOre;
      const extraOutlayOre = Math.max(0, totalOutlayOre - purchaseAmountOre);
      const remainingBalanceOre = Math.max(0, giftCardValueOre - purchaseAmountOre);

      const baseBonusPoints = Math.floor((giftCardValueOre * rate) / 10000);
      const baseTierPoints = 0;

      const denomsText =
        denoms.length > 0
          ? ` (valörer: ${denoms.slice(0, 6).map((d) => d.toLocaleString('sv-SE')).join(', ')}${denoms.length > 6 ? ' …' : ''} kr)`
          : '';
      const comboText =
        !exceedsPurchaseAmount && coverage.combo.length > 0 && (coverage.combo.length > 1 || coverage.combo[0].count > 1)
          ? ` (${coverage.combo.map((c) => `${c.count} × ${c.denomKr.toLocaleString('sv-SE')} kr`).join(' + ')})`
          : '';

      const breakdownText = exceedsPurchaseAmount
        ? `Köp av ${sasGiftCardItem.name}-presentkort (${cardValueKr.toLocaleString('sv-SE')} kr, minimiköp ${coverage.effectiveMinKr} kr) ger ${rate} Extrapoäng per 100 kr`
        : directStorePayOre > 0
        ? `Köp av ${sasGiftCardItem.name}-presentkort för ${cardValueKr.toLocaleString('sv-SE')} kr${comboText} ger ${rate} Extrapoäng per 100 kr${denomsText}`
        : `Köp av ${sasGiftCardItem.name}-presentkort ger ${rate} Extrapoäng per 100 kr${denomsText}`;

      const breakdown: RouteBreakdownItem[] = [
        {
          sourceName: 'SAS EuroBonus Shop',
          description: breakdownText,
          bonusPoints: baseBonusPoints,
          tierPoints: 0,
          qualifyingAmountOre: giftCardValueOre,
        },
      ];

      const storeAcceptsAmex = store.acceptsAmex !== undefined ? Boolean(store.acceptsAmex) : true;
      const amexSpendOre = giftCardValueOre + (storeAcceptsAmex ? directStorePayOre : 0);
      const cardOutcomes = computeCardOutcomes(
        baseBonusPoints,
        baseTierPoints,
        totalOutlayOre,
        totalOutlayOre,
        true,
        amexSpendOre
      );

      const step1Desc = exceedsPurchaseAmount
        ? `Besök SAS EuroBonus Shop och köp ett presentkort från ${sasGiftCardItem.name} för ${cardValueKr.toLocaleString('sv-SE')} kr (minimiköp ${coverage.effectiveMinKr} kr, kvarvarande saldo ${(remainingBalanceOre / 100).toLocaleString('sv-SE')} kr sparas till senare köp). Du får ${rate} Extrapoäng per 100 kr.`
        : `Besök SAS EuroBonus Shop och köp presentkort från ${sasGiftCardItem.name} för ${cardValueKr.toLocaleString('sv-SE')} kr${comboText}${denomsText}. Du får ${rate} Extrapoäng per 100 kr.`;

      const step2Desc =
        directStorePayOre > 0
          ? `Använd presentkortet (${cardValueKr.toLocaleString('sv-SE')} kr) i ${store.name}s kassa och betala resterande ${(directStorePayOre / 100).toLocaleString('sv-SE')} kr med ditt betalkort.`
          : `Använd presentkortskoden i ${store.name}s kassa.`;

      const uncertainties = exceedsPurchaseAmount
        ? [`Presentkortet har ett minimiköp på ${coverage.effectiveMinKr} kr. ${(remainingBalanceOre / 100).toLocaleString('sv-SE')} kr sparas på presentkortet för framtida inköp.`]
        : [];

      const sasGiftCardUrl = `https://www.saseurobonusshop.com/se/${sasGiftCardItem.slug || sasGiftCardItem.id}`;
      const isCampValid = isCampaignActive(sasGiftCardItem.isCampaign, sasGiftCardItem.campaignValidUntil);

      results.push({
        id: `${store.id}-sas-giftcard`,
        storeId: store.id,
        storeName: store.name,
        storeLogoUrl: store.logoUrl || sasGiftCardItem.imageUrl || undefined,
        routeType: 'gift_card',
        routeTitle: `SAS EuroBonus Shop – ${sasGiftCardItem.name} presentkort`,
        routeSummary: exceedsPurchaseAmount
          ? `Köp ${sasGiftCardItem.name}-presentkort på SAS EuroBonus Shop (min. ${coverage.effectiveMinKr} kr) och lös in i kassan.`
          : `Köp ${sasGiftCardItem.name}-presentkort på SAS EuroBonus Shop och lös in i kassan.`,
        primaryCategory: store.categories?.[0] || 'department',
        categories: store.categories || ['department'],
        steps: [
          {
            stepNumber: 1,
            title: `Köp ${sasGiftCardItem.name}-presentkort hos SAS EuroBonus Shop`,
            description: step1Desc,
            externalUrl: sasGiftCardUrl,
          },
          {
            stepNumber: 2,
            title: `Lös in presentkortet hos ${store.name}`,
            description: step2Desc,
          },
        ],
        totalSteps: 2,
        purchaseAmountOre,
        totalOutlayOre,
        giftCardValueOre,
        directStorePayOre,
        extraOutlayOre,
        remainingBalanceOre,
        exceedsPurchaseAmount,
        minPurchaseAmountKr: coverage.effectiveMinKr > 0 ? coverage.effectiveMinKr : undefined,
        breakdown,
        baseBonusPoints,
        baseTierPoints,
        cardOutcomes,
        isEligible: matchPurchaseAmount === true ? !exceedsPurchaseAmount : true,
        eligibilityReason:
          matchPurchaseAmount === true && exceedsPurchaseAmount
            ? `Presentkortets lägsta pris (${coverage.effectiveMinKr} kr) överstiger köpbeloppet`
            : undefined,
        isExplicitCampaign: isCampValid,
        campaignValidUntil: isCampValid ? (sasGiftCardItem.campaignValidUntil || undefined) : undefined,
        regularBonusPer100Kr: sasGiftCardItem.regularBonusPer100Kr ?? undefined,
        lastCheckedAt: sasGiftCardItem.updatedAt || sasGiftCardItem.syncedAt || options.lastCheckedAt || new Date().toISOString(),
        uncertainties,
        startUrl: sasGiftCardUrl,
        customLogoUrl: store.customLogoUrl || null,
        comment: store.comment || null,
        acceptsAmex: true,
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

  if (filter.matchPurchaseAmount === true) {
    filtered = filtered.filter(
      (r) =>
        r.routeType === 'direct_partner' ||
        (!r.exceedsPurchaseAmount && r.giftCardValueOre <= r.purchaseAmountOre)
    );
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
