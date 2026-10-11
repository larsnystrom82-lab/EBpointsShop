import fs from 'fs';
import path from 'path';

export interface ZupergiftConfig {
  ratePer100Kr: number; // EuroBonus Extrapoäng per 100 kr (t.ex. 30)
  isCampaign: boolean;
  campaignValidUntil: string | null;
  denominationsKr: number[]; // Fasta valörer t.ex. [100, 250, 500, 1000]
  feeKr: number;
  updatedAt: string;
  updatedBy: string;
  note: string;
}

export interface ZupergiftStoreItem {
  id: string; // slug/id t.ex. "cervera", "ikea"
  name: string; // Visningsnamn t.ex. "Cervera", "IKEA"
  slug: string;
  category?: string;
  isHidden: boolean; // Dold av admin (visas inte för besökare)
  isExcluded: boolean; // Borttagen av admin (exkluderas även vid framtida synkningar)
  matchedStoreId?: string; // Motsvarande lokal butik i Poängpiloten
  syncedAt: string;
  isMissingFromSource?: boolean; // True om butiken inte hittades på Zupergifts webbplats vid senaste synk
  missingSince?: string | null; // Tidsstämpel när butiken först upptäcktes saknad
}

export interface StorePartnerRule {
  hasPartnerLink: boolean;
  bonusPer100Kr: number; // Alltid utgå från 100 kr vid löpande bonus
  tierPer100Kr: number;  // Alltid utgå från 100 kr vid löpande bonus
  isCampaign: boolean;
  campaignValidUntil: string | null;
  startUrl: string;
  rewardType?: 'rate' | 'fixed'; // 'rate' = bonusPer100Kr, 'fixed' = fast engångsbonus
  fixedBonusPoints?: number; // t.ex. 2 000 för Factor
  fixedTierPoints?: number; // t.ex. 400 för Factor
  isOneTimeOffer?: boolean; // Flagga om engångserbjudande
  oneTimeTerms?: string; // Villkorsnotis
  regularBonusPer100Kr?: number; // Ordinarie poäng innan kampanj
  regularFixedBonusPoints?: number; // Ordinarie fast bonus innan kampanj
  uuid?: string;
}

export interface StoreGiftCardRule {
  hasDirectGiftCard: boolean;
  bonusPer100Kr: number; // Alltid utgå från 100 kr
  denominationsKr: number[];
  feeKr: number;
  isCampaign: boolean;
  startUrl: string;
}

export interface DbStore {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  logoUrl: string;
  categories: string[];
  isActive: boolean;
  partnerRule: StorePartnerRule;
  giftCardRule: StoreGiftCardRule;
  zupergiftSupported: boolean;
  isZupergiftOnly?: boolean;
  customLogoUrl?: string | null;
  comment?: string | null;
  alias?: string | null;
  isExcluded?: boolean; // Borttagen av admin (t.ex. konkurs eller borttagen från SAS)
  isHidden?: boolean;
  isMissingFromPartner?: boolean; // True om partnerbutiken inte längre finns hos SAS Online Shopping
  partnerMissingSince?: string | null; // Tidsstämpel när butiken togs bort från SAS Online Shopping
}

export interface DbErrorReport {
  id: string;
  storeId?: string;
  storeName?: string;
  routeId?: string;
  routeTitle?: string;
  userText: string;
  category?: 'suggestion' | 'store_missing' | 'bug' | 'general' | 'store_change';
  email?: string;
  pageUrl?: string;
  status: 'new' | 'investigating' | 'resolved';
  createdAt: string;
  adminNotes?: string;
}

export interface DbAuditEvent {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
}

export interface DbCategory {
  id: string;
  name: string;
  order?: number;
  isActive?: boolean;
}

export interface SasGiftCardStoreItem {
  id: string;           // slug e.g. "ikea", "mediamarkt"
  name: string;         // Display name e.g. "IKEA", "MediaMarkt"
  slug: string;         // URL slug from SAS shop
  bonusPer100Kr: number | null;  // null = not yet set by admin = INACTIVE
  minPurchaseAmount?: number | null; // t.ex. 250 kr (null = inget minimiköp)
  isCampaign: boolean;
  campaignValidUntil: string | null;
  isHidden: boolean;    // Hidden by admin
  isExcluded: boolean;  // Permanently excluded by admin
  matchedStoreId?: string; // Corresponding store ID in main stores list
  note: string;
  syncedAt: string;
  updatedAt: string | null; // null = never updated by admin
  isMissingFromSource?: boolean; // True om presentkortet inte hittades på SAS EuroBonus Shop vid senaste synk
  missingSince?: string | null;  // Tidsstämpel när butiken först upptäcktes saknad
}

export interface StoreMetadataItem {
  customLogoUrl?: string | null;
  comment?: string | null;
  isExcluded?: boolean | null;
  isHidden?: boolean | null;
  categories?: string[] | null;
  alias?: string | null;
  aliases?: string[] | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface ResourceLinkItem {
  id: string;
  name: string;
  tagline: string;
  category: 'awards' | 'shopping' | 'community' | 'routes' | string;
  categoryLabel?: string;
  categoryBadgeColor?: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  features: string[];
  url: string;
  order?: number;
  isHidden?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseSchema {
  zupergiftConfig: ZupergiftConfig;
  zupergiftStores: ZupergiftStoreItem[]; // Fullständig lista över Zupergift-butiker
  sasGiftCards: SasGiftCardStoreItem[];
  resourceLinks?: ResourceLinkItem[];
  stores: DbStore[];
  categories?: DbCategory[];
  storeCustomMetadata?: Record<string, StoreMetadataItem>;
  excludedStoreIds?: string[];
  errorReports: DbErrorReport[];
  auditEvents: DbAuditEvent[];
  lastZupergiftSync: string | null;
  lastPartnerSync?: string | null;
  lastSasGiftCardSync: string | null;
}

const SEED_DB_PATH = path.join(process.cwd(), 'data', 'database.json');
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');

export function getDbPath(): string {
  return DB_PATH;
}

export function getDataDir(): string {
  return DATA_DIR;
}

const INITIAL_ZUPERGIFT_STORES: ZupergiftStoreItem[] = [
  { id: 'cervera', name: 'Cervera', slug: 'cervera', isHidden: false, isExcluded: false, matchedStoreId: 'cervera', syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'ahlens', name: 'Åhléns', slug: 'ahlens', isHidden: false, isExcluded: false, matchedStoreId: 'ahlens', syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'kitchentime', name: 'KitchenTime', slug: 'kitchentime', isHidden: false, isExcluded: false, matchedStoreId: 'kitchentime', syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'elgiganten', name: 'Elgiganten', slug: 'elgiganten', isHidden: false, isExcluded: false, matchedStoreId: 'elgiganten', syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'zalando', name: 'Zalando', slug: 'zalando-presentkort', isHidden: false, isExcluded: false, syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'ikea', name: 'IKEA', slug: 'ikea', isHidden: false, isExcluded: false, syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'akademibokhandeln', name: 'Akademibokhandeln', slug: 'akademibokhandeln-retain24', isHidden: false, isExcluded: false, syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'royaldesign', name: 'RoyalDesign', slug: 'royaldesign', isHidden: false, isExcluded: false, syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'stadium', name: 'Stadium', slug: 'stadium', isHidden: false, isExcluded: false, syncedAt: '2026-10-02T04:00:00.000Z' },
  { id: 'rituals', name: 'Rituals', slug: 'rituals', isHidden: false, isExcluded: false, syncedAt: '2026-10-02T04:00:00.000Z' },
];

export const INITIAL_RESOURCE_LINKS: ResourceLinkItem[] = [
  {
    id: 'bonussok',
    name: 'BonusSøk (bonussok.no/sv)',
    tagline: 'Sök och hitta lediga bonusresor med SAS och SkyTeam',
    category: 'awards',
    categoryLabel: 'Sök bonusresor',
    categoryBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badge: 'Mest populära sökmotorn',
    badgeColor: 'bg-emerald-600 text-white',
    description:
      'Ett av de absolut mest uppskattade verktygen för skandinaviska EuroBonus-jägare. Sök snabbt och smidigt efter tillgängliga bonusplatser hos SAS och partnerflygbolag inom SkyTeam (t.ex. Air France, KLM, Delta och Virgin Atlantic). Kalenderöversikten visar tillgänglighet månad för månad i SAS Go, Plus och Business.',
    features: [
      'Kalendersök över SAS och SkyTeam bonusplatser',
      'Se direkt tillgänglighet i Business, Premium & Economy',
      'Svensk språkversion anpassad för skandinaviska resenärer',
      'Filtrera på direktflyg, allianspartners eller specifika destinationer',
    ],
    url: 'https://www.bonussok.no/sv',
    order: 1,
    isHidden: false,
  },
  {
    id: 'awardfares',
    name: 'AwardFares',
    tagline: 'Modernt och blixtsnabbt sökverktyg med platsbevakning',
    category: 'awards',
    categoryLabel: 'Sök bonusresor',
    categoryBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badge: 'Platsbevakning & Alerts',
    badgeColor: 'bg-blue-600 text-white',
    description:
      'Avancerad sökmotor utvecklad specifikt för frekventa resenärer. Sök bonusresor över flera datum samtidigt, övervaka avgångar och få notiser direkt i samma sekund som en eftertraktad bonusplats i Business Class släpps av flygbolaget.',
    features: [
      'Blixtsnabb sökning av tillgängliga EuroBonus-bonusresor',
      'Automatisk platsbevakning med e-post och pushnotiser',
      'Tidslinjer och historik för hur bonusplatser brukar släppas',
      'Stöd för SAS, SkyTeam och flera andra globala program',
    ],
    url: 'https://awardfares.com/',
    order: 2,
    isHidden: false,
  },
  {
    id: 'seatspy',
    name: 'SeatSpy',
    tagline: 'Överskådlig helårskalender för bonusplatser',
    category: 'awards',
    categoryLabel: 'Sök bonusresor',
    categoryBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badge: 'Kalendersök',
    badgeColor: 'bg-indigo-600 text-white',
    description:
      'Visar ett helt års tillgänglighet av bonusplatser på en enda skärm. Perfekt när du är flexibel med resdatum och letar efter lediga premiumstolar till populära långdistansresmål i USA, Asien eller Sydeuropa.',
    features: [
      'Helårskalender för SAS-avgångar i realtid',
      'Stöd för SAS Business, SAS Plus och SAS Go',
      'Enkelt att sätta upp bevakningar på specifika rutter',
    ],
    url: 'https://www.seatspy.com/',
    order: 3,
    isHidden: false,
  },
  {
    id: 'chatflights',
    name: 'Chatflights',
    tagline: 'Personlig conciergetjänst för att boka din drömresa med poäng',
    category: 'awards',
    categoryLabel: 'Sök bonusresor',
    categoryBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badge: 'Bokningshjälp & App',
    badgeColor: 'bg-purple-600 text-white',
    description:
      'Svensk app och bokningsbyrå specialiserad på poängresor. Erfarna poängexperter hjälper dig att hitta och boka de absolut bästa tillgängliga bonusresorna med dina EuroBonus-poäng och Amex 2-för-1-vouchers.',
    features: [
      'Personlig support via chatt i appen',
      'Hjälper dig nyttja Amex 2-för-1-förmånen optimalt',
      'Perfekt för komplexa rutter och multi-city-bokningar',
    ],
    url: 'https://chatflights.se/',
    order: 4,
    isHidden: false,
  },
  {
    id: 'eurobonusguiden',
    name: 'EuroBonusguiden.se',
    tagline: 'Sveriges ledande guide- och nyhetssajt för EuroBonus',
    category: 'shopping',
    categoryLabel: 'Guider & Kampanjer',
    categoryBadgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    badge: 'Guider & Nyheter',
    badgeColor: 'bg-amber-600 text-white',
    description:
      'En guldgruva av kunskap för alla som vill samla och maximera poäng. Här hittar du pedagogiska guider om aktuella kampanjer, kreditkortstester, strategier för statusjakt och smarta tips för vardagspoäng.',
    features: [
      'Nyheter om poängkampanjer och dubbla poäng-helger',
      'Djupgående tester av SAS kreditkort',
      'Eurobonusskolan från grunderna till expertnivå',
    ],
    url: 'https://eurobonusguiden.se/',
    order: 5,
    isHidden: false,
  },
  {
    id: 'sas-online-shopping',
    name: 'SAS EuroBonus Online Shopping',
    tagline: 'Officiella shoppingportalen med över 450 butiker',
    category: 'shopping',
    categoryLabel: 'Poäng & Shopping',
    categoryBadgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    badge: 'Officiell SAS-portal',
    badgeColor: 'bg-blue-700 text-white',
    description:
      'SAS egen shoppingportal. Genom att klicka dig vidare till anslutna webbutiker tjänar du Extrapoäng och Nivåpoäng på allt från elektronik och kläder till inredning, hotell och böcker.',
    features: [
      '450+ anslutna nätbutiker i Sverige och Norden',
      'Regelbundna kampanjer med upp till 100 poäng per 100 kr',
      'Poängen registreras automatiskt på ditt EuroBonus-konto',
    ],
    url: 'https://onlineshopping.flysas.com/sv-SE/',
    order: 6,
    isHidden: false,
  },
  {
    id: 'sas-giftcards',
    name: 'SAS EuroBonus Shop (Presentkort & Zupergift)',
    tagline: 'Köp digitala presentkort och Zupergift med poängintjäning',
    category: 'shopping',
    categoryLabel: 'Poäng & Shopping',
    categoryBadgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    badge: 'Officiell shop',
    badgeColor: 'bg-blue-700 text-white',
    description:
      'Den officiella poängshopen där du kan köpa digitala presentkort och Zupergift-kort med ditt betalkort och tjäna upp till 50 Extrapoäng per 100 kr vid aktiva kampanjer.',
    features: [
      'Digitala presentkort som levereras direkt via e-post/SMS',
      'Zupergift som kan växlas till över 100 kända butiker',
      'Kombinera med SAS kreditkort för maximal totalintjäning',
    ],
    url: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
    order: 7,
    isHidden: false,
  },
  {
    id: 'businessclass',
    name: 'BusinessClass.se Forum',
    tagline: 'Nordens största mötesplats för frekventa resenärer',
    category: 'community',
    categoryLabel: 'Forum & Community',
    categoryBadgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    badge: 'Nordens största forum',
    badgeColor: 'bg-purple-600 text-white',
    description:
      'Den centrala mötesplatsen för svenska EuroBonus-entusiaster. Här diskuteras de senaste sweetspotsen, nysläppta bonusstolar, kreditkortsstrategier, lounge-upplevelser och flygnyheter.',
    features: [
      'Dedikerad sektion för SAS EuroBonus och SkyTeam',
      'Trådar med tips om nyligen släppta bonusstolar i Business Class',
      'Hjälp från erfarna resenärer med rutter och regler',
    ],
    url: 'https://www.businessclass.com/forum/',
    order: 8,
    isHidden: false,
  },
  {
    id: 'facebook-group',
    name: 'SAS EuroBonus Forum (Facebook)',
    tagline: 'Aktiv Facebook-community med tiotusentals poängjägare',
    category: 'community',
    categoryLabel: 'Forum & Community',
    categoryBadgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    badge: 'Stor community',
    badgeColor: 'bg-indigo-600 text-white',
    description:
      'Sveriges mest aktiva Facebook-grupp om EuroBonus. Tusentals inlägg och kommentarer varje månad med snabba svar på frågor, kampanjtips, kreditkortserfarenheter och medlemsförmåner.',
    features: [
      'Snabba svar på frågor om biljetter, skatter och vouchers',
      'Realtidstips när kampanjer och kampanjkoder dyker upp',
      'Aktivt erfarenhetsutbyte kring kreditkort och intjäning',
    ],
    url: 'https://www.facebook.com/groups/sas.eurobonus/',
    order: 9,
    isHidden: false,
  },
  {
    id: 'flightconnections',
    name: 'FlightConnections',
    tagline: 'Interaktiv ruttkarta över alla världens direktflyg',
    category: 'routes',
    categoryLabel: 'Rutter & Allianser',
    categoryBadgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badge: 'Ruttkarta',
    badgeColor: 'bg-cyan-700 text-white',
    description:
      'Ett ovärderligt verktyg när du planerar bonusresor. Filtrera på flygbolag (t.ex. SAS, KLM, Air France, Delta) eller alliansen SkyTeam för att se alla direktlinjer och möjliga transferflygplatser i världen.',
    features: [
      'Filtrera efter specifika SkyTeam-bolag eller SAS',
      'Se vilka dagar i veckan linjer trafikeras',
      'Upptäck oväntade rutter och transferhubbar för bonusresor',
    ],
    url: 'https://www.flightconnections.com/',
    order: 10,
    isHidden: false,
  },
  {
    id: 'skyteam',
    name: 'SkyTeam Alliance',
    tagline: 'SAS globala flygallians sedan september 2024',
    category: 'routes',
    categoryLabel: 'Rutter & Allianser',
    categoryBadgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badge: 'Officiell allians',
    badgeColor: 'bg-slate-800 text-white',
    description:
      'SAS är officiell medlem i SkyTeam. På alliansens webbplats hittar du information om alla 19 partnerflygbolag (Air France, KLM, Delta, Virgin Atlantic, Korean Air m.fl.), SkyPriority-förmåner och lounger.',
    features: [
      'Översikt över alla 19 medlemsflygbolag',
      'Information om SkyTeam Elite och Elite Plus (motsvarar Silver & Guld)',
      'Lounge-finder för över 750 flygplatslounger i världen',
    ],
    url: 'https://www.skyteam.com/',
    order: 11,
    isHidden: false,
  },
];

export const INITIAL_CATEGORIES: DbCategory[] = [
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
];

const INITIAL_DATA: DatabaseSchema = {
  zupergiftConfig: {
    ratePer100Kr: 30,
    isCampaign: true,
    campaignValidUntil: '2026-10-31',
    denominationsKr: [100, 250, 500, 1000, 2000],
    feeKr: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin',
    note: 'Standardkampanj på SAS EuroBonus Shop för Zupergift',
  },
  zupergiftStores: INITIAL_ZUPERGIFT_STORES,
  resourceLinks: INITIAL_RESOURCE_LINKS,
  categories: INITIAL_CATEGORIES,
  stores: [
    {
      id: 'cervera',
      name: 'Cervera',
      slug: 'cervera',
      aliases: ['cervera.se', 'cervera ab'],
      logoUrl: '/logos/cervera.svg',
      categories: ['kitchen'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: false,
        bonusPer100Kr: 0,
        tierPer100Kr: 0,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://www.cervera.se',
      },
      giftCardRule: {
        hasDirectGiftCard: false,
        bonusPer100Kr: 0,
        denominationsKr: [],
        feeKr: 0,
        isCampaign: false,
        startUrl: 'https://www.saseurobonusshop.com',
      },
      zupergiftSupported: true,
    },
    {
      id: 'bagaren-och-kocken',
      name: 'Bagaren och Kocken',
      slug: 'bagaren-och-kocken',
      aliases: ['bagaren & kocken', 'bagarenochkocken.se', 'bagarenochkocken'],
      logoUrl: '/logos/bagaren-och-kocken.svg',
      categories: ['kitchen'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 24,
        tierPer100Kr: 5,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://onlineshopping.flysas.com/se/bagaren-och-kocken',
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
      id: 'kitchentime',
      name: 'KitchenTime',
      slug: 'kitchentime',
      aliases: ['kitchentime.se', 'kitchen time'],
      logoUrl: '/logos/kitchentime.svg',
      categories: ['kitchen'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 24,
        tierPer100Kr: 5,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://onlineshopping.flysas.com/se/kitchentime',
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
    {
      id: 'elgiganten',
      name: 'Elgiganten',
      slug: 'elgiganten',
      aliases: ['elgiganten.se', 'el-giganten'],
      logoUrl: '/logos/elgiganten.svg',
      categories: ['electronics', 'kitchen'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: false,
        bonusPer100Kr: 0,
        tierPer100Kr: 0,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://www.elgiganten.se',
      },
      giftCardRule: {
        hasDirectGiftCard: true,
        bonusPer100Kr: 10.1,
        denominationsKr: [1000],
        feeKr: 0,
        isCampaign: false,
        startUrl: 'https://www.saseurobonusshop.com/se/gift-cards-vouchers',
      },
      zupergiftSupported: false,
    },
    {
      id: 'ahlens',
      name: 'Åhléns',
      slug: 'ahlens',
      aliases: ['ahlens.se', 'åhlens city'],
      logoUrl: '/logos/ahlens.svg',
      categories: ['fashion', 'kitchen'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 20,
        tierPer100Kr: 0,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://onlineshopping.flysas.com/se/ahlens',
      },
      giftCardRule: {
        hasDirectGiftCard: true,
        bonusPer100Kr: 15,
        denominationsKr: [500, 1000],
        feeKr: 0,
        isCampaign: false,
        startUrl: 'https://www.saseurobonusshop.com',
      },
      zupergiftSupported: true,
    },
    {
      id: 'netonnet',
      name: 'NetOnNet',
      slug: 'netonnet',
      aliases: ['netonnet.se', 'net on net'],
      logoUrl: '/logos/netonnet.svg',
      categories: ['electronics'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 10,
        tierPer100Kr: 0,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://onlineshopping.flysas.com/se/netonnet',
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
      id: 'apotek-hjartat',
      name: 'Apotek Hjärtat',
      slug: 'apotek-hjartat',
      aliases: ['apotekhjartat.se', 'hjartat'],
      logoUrl: '/logos/apotek-hjartat.svg',
      categories: ['health'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 25,
        tierPer100Kr: 0,
        isCampaign: true,
        campaignValidUntil: '2026-10-31',
        startUrl: 'https://onlineshopping.flysas.com/se/apotek-hjartat',
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
      id: 'boozt',
      name: 'Boozt',
      slug: 'boozt',
      aliases: ['boozt.com', 'booztlet'],
      logoUrl: '/logos/boozt.svg',
      categories: ['fashion'],
      isActive: true,
      partnerRule: {
        hasPartnerLink: true,
        bonusPer100Kr: 30,
        tierPer100Kr: 0,
        isCampaign: false,
        campaignValidUntil: null,
        startUrl: 'https://onlineshopping.flysas.com/se/boozt',
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
  errorReports: [],
  sasGiftCards: [],
  auditEvents: [
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      action: 'INIT_SYSTEM',
      details: 'System initialiserat med 100 kr poängbas och Zupergift adminstyrning.',
      user: 'System',
    },
  ],
  lastZupergiftSync: '2026-10-02T04:00:00.000Z',
  lastSasGiftCardSync: null,
};

export function getDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // If we are using a custom DATA_DIR (e.g. persistent disk at /var/data)
      // and the database file does not exist yet on the disk, copy the seed file from project data/database.json.
      if (path.resolve(DB_PATH) !== path.resolve(SEED_DB_PATH) && fs.existsSync(SEED_DB_PATH)) {
        try {
          fs.copyFileSync(SEED_DB_PATH, DB_PATH);
          console.log(`[Database] Initialiserade persistent databas från startdata: ${DB_PATH}`);
        } catch (copyErr) {
          console.error(`[Database] Kunde inte kopiera startdata till ${DB_PATH}:`, copyErr);
          fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
        }
      } else {
        fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
      }
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data) as DatabaseSchema;

    // Backward compatibility if zupergiftStores wasn't initialized yet
    if (!parsed.zupergiftStores) {
      parsed.zupergiftStores = INITIAL_ZUPERGIFT_STORES;
      saveDatabase(parsed);
    }

    // Initialize categories if missing
    if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      parsed.categories = INITIAL_CATEGORIES;
      saveDatabase(parsed);
    }

    // Initialize sasGiftCards if missing (backward compat)
    if (!parsed.sasGiftCards || !Array.isArray(parsed.sasGiftCards)) {
      parsed.sasGiftCards = [];
      saveDatabase(parsed);
    }

    // Initialize lastSasGiftCardSync if missing
    if (!('lastSasGiftCardSync' in parsed)) {
      (parsed as DatabaseSchema).lastSasGiftCardSync = null;
      saveDatabase(parsed);
    }

    // Initialize storeCustomMetadata if missing
    if (!parsed.storeCustomMetadata || typeof parsed.storeCustomMetadata !== 'object') {
      parsed.storeCustomMetadata = {};
      saveDatabase(parsed);
    }

    // Initialize excludedStoreIds if missing
    if (!parsed.excludedStoreIds || !Array.isArray(parsed.excludedStoreIds)) {
      parsed.excludedStoreIds = [];
      saveDatabase(parsed);
    }

    // Initialize resourceLinks if missing (backward compat)
    if (!parsed.resourceLinks || !Array.isArray(parsed.resourceLinks) || parsed.resourceLinks.length === 0) {
      parsed.resourceLinks = INITIAL_RESOURCE_LINKS;
      saveDatabase(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Error reading database, returning initial schema:', err);
    return INITIAL_DATA;
  }
}

export function saveDatabase(data: DatabaseSchema): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database:', err);
    throw err;
  }
}
