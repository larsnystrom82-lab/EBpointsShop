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
  matchedStoreId?: string; // Motsvarande lokal butik i Poängkollen
  syncedAt: string;
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
  isCampaign: boolean;
  campaignValidUntil: string | null;
  isHidden: boolean;    // Hidden by admin
  isExcluded: boolean;  // Permanently excluded by admin
  matchedStoreId?: string; // Corresponding store ID in main stores list
  note: string;
  syncedAt: string;
  updatedAt: string | null; // null = never updated by admin
}

export interface DatabaseSchema {
  zupergiftConfig: ZupergiftConfig;
  zupergiftStores: ZupergiftStoreItem[]; // Fullständig lista över Zupergift-butiker
  sasGiftCards: SasGiftCardStoreItem[];
  stores: DbStore[];
  categories?: DbCategory[];
  errorReports: DbErrorReport[];
  auditEvents: DbAuditEvent[];
  lastZupergiftSync: string | null;
  lastPartnerSync?: string | null;
  lastSasGiftCardSync: string | null;
}

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

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
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
      return INITIAL_DATA;
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
