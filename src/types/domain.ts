export type PointType = 'bonus' | 'tier';
export type SourceType = 'sas_shopping' | 'sas_shop_giftcard' | 'zupergift';
export type CardNetwork = 'amex' | 'mastercard';

export interface StorePartnerRule {
  hasPartnerLink: boolean;
  bonusPer100Kr: number;
  tierPer100Kr: number;
  isCampaign: boolean;
  campaignValidUntil: string | null;
  startUrl: string;
  rewardType?: 'rate' | 'fixed';
  fixedBonusPoints?: number;
  fixedTierPoints?: number;
  isOneTimeOffer?: boolean;
  oneTimeTerms?: string;
  regularBonusPer100Kr?: number;
  regularFixedBonusPoints?: number;
}

export interface StoreGiftCardRule {
  hasDirectGiftCard: boolean;
  bonusPer100Kr: number;
  denominationsKr: number[];
  feeKr: number;
  isCampaign: boolean;
  startUrl: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  logoUrl?: string;
  categories: string[];
  isActive: boolean;
  zupergiftSupported?: boolean;
  isZupergiftOnly?: boolean;
  syncedAt?: string;
  partnerRule?: StorePartnerRule;
  giftCardRule?: StoreGiftCardRule;
  customLogoUrl?: string | null;
  comment?: string | null;
  alias?: string | null;
  hasPartnerLink?: boolean;
  hasSasGiftCard?: boolean;
  sasGiftCardBonusPer100Kr?: number | null;
  isExcluded?: boolean;
  isHidden?: boolean;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  sourceUrl: string;
  lastAttempt: string;
  lastSuccess: string;
  status: 'ok' | 'degraded' | 'failed';
}

export interface PointRule {
  id: string;
  pointType: PointType;
  qualifyingBasis: 'purchase_amount' | 'giftcard_amount';
  ratePer100Kr?: number; // e.g. 20 means 20 points per 100 SEK
  fixedPoints?: number; // e.g. 101 points per card
  rounding: 'floor_total' | 'floor_per_100' | 'exact';
  source: string;
  termsNote?: string;
}

export interface Offer {
  id: string;
  storeId: string;
  sourceId: string;
  pointRuleIds: string[];
  isExplicitCampaign: boolean;
  campaignValidUntil?: string;
  checkedAt: string;
  isActive: boolean;
}

export interface GiftCardProduct {
  id: string;
  provider: string; // e.g. "SAS EuroBonus Shop", "Zupergift"
  targetStoreId: string;
  fixedDenominationsOre?: number[]; // e.g. [50000, 100000] for 500 kr, 1000 kr
  minOre?: number;
  maxOre?: number;
  maxCardsAllowed?: number;
  feeOre: number; // fee in öre
  allowsSplitPayment: boolean; // can pay rest in cash/card at store
  allowsCombining: boolean; // can combine multiple gift cards in single checkout
}

export interface PaymentCard {
  id: string;
  name: string;
  network: CardNetwork;
  bonusPer100Kr: number;
  tierPer100Kr: number;
  termsNote: string;
  requiresStatusOrSpend?: boolean;
}

export interface InstructionStep {
  stepNumber: number;
  title: string;
  description: string;
  externalUrl?: string;
}

export interface CardCalculationOutcome {
  cardId: string;
  cardName: string;
  cardBonusPoints: number;
  cardTierPoints: number;
  totalBonusPoints: number;
  totalTierPoints: number;
  pointsPerKronor: number; // calculated as totalBonusPoints / (totalOutlayOre / 100)
}

export interface RouteBreakdownItem {
  sourceName: string;
  pointRuleId?: string;
  description: string;
  bonusPoints: number;
  tierPoints: number;
  qualifyingAmountOre: number;
  note?: string;
}

export interface RouteCalculationResult {
  id: string;
  storeId: string;
  storeName: string;
  storeLogoUrl?: string;
  routeType: 'direct_partner' | 'gift_card' | 'zupergift_chain';
  routeTitle: string;
  routeSummary: string;
  primaryCategory?: string;
  categories?: string[];
  steps: InstructionStep[];
  totalSteps: number;

  purchaseAmountOre: number;
  totalOutlayOre: number;
  giftCardValueOre: number;
  extraOutlayOre: number;
  remainingBalanceOre: number;

  breakdown: RouteBreakdownItem[];
  baseBonusPoints: number;
  baseTierPoints: number;

  cardOutcomes: Record<string, CardCalculationOutcome>;
  selectedCardOutcome?: CardCalculationOutcome;

  isEligible: boolean; // extraOutlayOre <= 1000 (10 kr limit)
  eligibilityReason?: string;

  isExplicitCampaign: boolean;
  campaignValidUntil?: string;
  isOneTimeOffer?: boolean;
  oneTimeTerms?: string;
  rewardType?: 'rate' | 'fixed';
  lastCheckedAt: string;
  uncertainties: string[];
  startUrl: string;

  customLogoUrl?: string | null;
  comment?: string | null;

  isDemoFixture?: boolean;
  demoLabel?: string;
}

export type SortOption =
  | 'most_bonus'
  | 'most_tier'
  | 'name_asc'
  | 'name_desc';

export type OneTimeBonusFilter = 'all' | 'only' | 'exclude';

export interface FilterState {
  selectedStoreIds: string[];
  purchaseAmountKr: number | null;
  rawAmountInput: string;
  allowPartnerStores?: boolean;
  allowGiftCards: boolean;
  allowZupergift: boolean;
  tierPointsImportant: boolean;
  onlyCampaigns?: boolean;
  oneTimeBonusFilter?: OneTimeBonusFilter;
  selectedCardIds: string[];
  sortBy: SortOption;
  searchQuery: string;
  selectedCategory: string | null;
}

