import { DatabaseSchema, SasGiftCardStoreItem } from '@/lib/db';
import { Store } from '@/types/domain';
import { isCampaignActive } from '../utils/campaign';

const KNOWN_LOCAL_LOGOS = new Set([
  'ahlens',
  'apotek-hjartat',
  'bagaren-och-kocken',
  'boozt',
  'cervera',
  'elgiganten',
  'ikea',
  'kitchentime',
  'netonnet',
  'neutral-store',
  'stadium',
  'zalando',
]);

function isStoreMissingOwnLogo(store: {
  customLogoUrl?: string | null;
  logoUrl?: string | null;
  id?: string;
  slug?: string;
}): boolean {
  if (store.customLogoUrl && store.customLogoUrl.trim()) return false;
  if (!store.logoUrl || !store.logoUrl.trim()) return true;
  if (store.logoUrl.startsWith('http://') || store.logoUrl.startsWith('https://')) return false;
  if (store.logoUrl.startsWith('/logos/')) {
    const rawName = store.logoUrl
      .replace('/logos/', '')
      .replace(/\.(svg|png|jpg|webp)$/i, '')
      .toLowerCase();
    if (KNOWN_LOCAL_LOGOS.has(rawName)) return false;
    if (store.id && KNOWN_LOCAL_LOGOS.has(store.id.toLowerCase())) return false;
    if (store.slug && KNOWN_LOCAL_LOGOS.has(store.slug.toLowerCase())) return false;
    return true;
  }
  return true;
}

export function cleanStoreSlug(slug: string): string {
  return (slug || '')
    .toLowerCase()
    .replace(/^presentkort-/, '')
    .replace(/-presentkort$/, '')
    .replace(/-se$/, '')
    .replace(/-r24$/, '')
    .replace(/-sek$/, '');
}

/**
 * Builds the consolidated, deduplicated list of all stores across:
 * 1. SAS Online Shopping partner stores (db.stores)
 * 2. Zupergift catalog stores (db.zupergiftStores)
 * 3. SAS EuroBonus Shop gift card stores (db.sasGiftCards)
 *
 * Injects customLogoUrl and comment from db.storeCustomMetadata.
 */
export function buildAllStores(db: DatabaseSchema, options?: { includeExcluded?: boolean }): Store[] {
  const metadata = db.storeCustomMetadata || {};
  const excludedSet = new Set((db.excludedStoreIds || []).map((id) => id.toLowerCase()));

  const isStoreExcluded = (id: string, slug?: string, obj?: { isExcluded?: boolean }): boolean => {
    if (obj?.isExcluded) return true;
    if (excludedSet.has(id.toLowerCase())) return true;
    if (slug && excludedSet.has(slug.toLowerCase())) return true;
    if (metadata[id]?.isExcluded || metadata[id.toLowerCase()]?.isExcluded) return true;
    if (slug && (metadata[slug]?.isExcluded || metadata[slug.toLowerCase()]?.isExcluded)) return true;
    return false;
  };

  const isStoreHidden = (id: string, slug?: string, obj?: { isHidden?: boolean }): boolean => {
    const m =
      metadata[id] ||
      metadata[id.toLowerCase()] ||
      (slug ? metadata[slug] || metadata[slug.toLowerCase()] : undefined);
    if (m?.isHidden !== undefined && m?.isHidden !== null) {
      return Boolean(m.isHidden);
    }
    return Boolean(obj?.isHidden);
  };

  const baseStores: Store[] = (db.stores || [])
    .filter((s) => {
      if (options?.includeExcluded) return true;
      if (isStoreExcluded(s.id, s.slug, s)) return false;
      if (isStoreHidden(s.id, s.slug, s)) return false;
      return true;
    })
    .map((s) => {
      const meta = metadata[s.id] || metadata[s.slug];
      const customLogoUrl = meta?.customLogoUrl?.trim() || s.customLogoUrl || null;
      const comment = meta?.comment?.trim() || s.comment || null;
      const alias = meta?.alias !== undefined ? (meta.alias?.trim() || null) : (s.alias?.trim() || null);
      const isExcluded = isStoreExcluded(s.id, s.slug, s);
      const isHidden = isStoreHidden(s.id, s.slug, s);
      const acceptsAmex =
        meta?.acceptsAmex !== undefined && meta?.acceptsAmex !== null
          ? Boolean(meta.acceptsAmex)
          : s.acceptsAmex !== undefined
          ? Boolean(s.acceptsAmex)
          : !s.partnerRule?.hasPartnerLink;

      let resolvedPartnerRule = s.partnerRule;
      if (s.partnerRule) {
        const isCampActive = isCampaignActive(s.partnerRule.isCampaign, s.partnerRule.campaignValidUntil);
        if (s.partnerRule.isCampaign && !isCampActive) {
          const fallbackBonus = s.partnerRule.regularBonusPer100Kr ?? s.partnerRule.bonusPer100Kr;
          const fallbackFixedBonus = s.partnerRule.regularFixedBonusPoints ?? s.partnerRule.fixedBonusPoints;
          const fallbackTier =
            s.partnerRule.regularTierPer100Kr !== undefined
              ? s.partnerRule.regularTierPer100Kr
              : s.partnerRule.regularBonusPer100Kr !== undefined &&
                s.partnerRule.bonusPer100Kr > 0 &&
                s.partnerRule.tierPer100Kr > 0 &&
                s.partnerRule.bonusPer100Kr !== s.partnerRule.regularBonusPer100Kr
              ? Math.round(s.partnerRule.regularBonusPer100Kr * (s.partnerRule.tierPer100Kr / s.partnerRule.bonusPer100Kr))
              : s.partnerRule.tierPer100Kr;
          const fallbackFixedTier =
            s.partnerRule.regularFixedTierPoints !== undefined
              ? s.partnerRule.regularFixedTierPoints
              : s.partnerRule.regularFixedBonusPoints !== undefined &&
                (s.partnerRule.fixedBonusPoints ?? 0) > 0 &&
                (s.partnerRule.fixedTierPoints ?? 0) > 0 &&
                s.partnerRule.fixedBonusPoints !== s.partnerRule.regularFixedBonusPoints
              ? Math.round(
                  s.partnerRule.regularFixedBonusPoints *
                    ((s.partnerRule.fixedTierPoints ?? 0) / (s.partnerRule.fixedBonusPoints ?? 1))
                )
              : s.partnerRule.fixedTierPoints;

          resolvedPartnerRule = {
            ...s.partnerRule,
            isCampaign: false,
            campaignValidUntil: null,
            bonusPer100Kr: fallbackBonus,
            fixedBonusPoints: fallbackFixedBonus,
            tierPer100Kr: fallbackTier,
            fixedTierPoints: fallbackFixedTier,
          };
        }
      }

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        alias: alias || null,
        aliases: Array.from(new Set([
          ...((meta?.aliases && meta.aliases.length > 0) ? meta.aliases : (s.aliases || [])),
          ...(alias ? [alias] : []),
        ])),
        logoUrl: customLogoUrl || s.logoUrl || `/logos/${s.id}.svg`,
        customLogoUrl,
        comment,
        categories: (meta?.categories && meta.categories.length > 0) ? meta.categories : (s.categories || ['department']),
        isActive: isExcluded || isHidden ? false : (s.isActive ?? true),
        isExcluded,
        isHidden,
        acceptsAmex,
        partnerRule: resolvedPartnerRule,
        giftCardRule: s.giftCardRule,
        zupergiftSupported: Boolean(s.zupergiftSupported),
        isZupergiftOnly: false,
        hasPartnerLink: isExcluded || isHidden ? false : Boolean(resolvedPartnerRule?.hasPartnerLink),
        isMissingFromPartner: Boolean(s.isMissingFromPartner),
        missingSince: s.partnerMissingSince || null,
        partnerMissingSince: s.partnerMissingSince || null,
        syncedAt: (s as any).syncedAt || db.lastPartnerSync || undefined,
      };
    });

  const allBaseStoreKeys = new Set<string>();
  for (const s of db.stores || []) {
    allBaseStoreKeys.add(s.id.toLowerCase());
    if (s.slug) allBaseStoreKeys.add(s.slug.toLowerCase());
    allBaseStoreKeys.add(cleanStoreSlug(s.id));
    if (s.slug) allBaseStoreKeys.add(cleanStoreSlug(s.slug));
    allBaseStoreKeys.add(s.name.trim().toLowerCase());
  }

  const extraZuperStores: Store[] = (db.zupergiftStores || [])
    .filter((zs) => {
      if (
        allBaseStoreKeys.has(zs.id.toLowerCase()) ||
        (zs.slug && allBaseStoreKeys.has(zs.slug.toLowerCase())) ||
        allBaseStoreKeys.has(cleanStoreSlug(zs.id)) ||
        (zs.slug && allBaseStoreKeys.has(cleanStoreSlug(zs.slug))) ||
        (zs.name && allBaseStoreKeys.has(zs.name.trim().toLowerCase())) ||
        (zs.matchedStoreId && allBaseStoreKeys.has(zs.matchedStoreId.toLowerCase()))
      ) {
        return false;
      }
      if (options?.includeExcluded) return true;
      if (isStoreExcluded(zs.id, zs.slug, zs)) return false;
      if (isStoreHidden(zs.id, zs.slug, zs)) return false;
      return true;
    })
    .map((zs) => {
      const meta = metadata[zs.id] || metadata[zs.slug];
      const customLogoUrl = meta?.customLogoUrl?.trim() || (zs as any).customLogoUrl || null;
      const comment = meta?.comment?.trim() || (zs as any).comment || null;
      const alias = meta?.alias !== undefined ? (meta.alias?.trim() || null) : ((zs as any).alias?.trim() || null);
      const isExcluded = isStoreExcluded(zs.id, zs.slug, zs);
      const isHidden = isStoreHidden(zs.id, zs.slug, zs);

      return {
        id: zs.id,
        name: zs.name,
        slug: zs.slug,
        alias: alias || null,
        aliases: Array.from(new Set([
          ...((meta?.aliases && meta.aliases.length > 0) ? meta.aliases : [zs.slug, `${zs.id}.se`]),
          ...(alias ? [alias] : []),
        ])),
        logoUrl: customLogoUrl || `/logos/${zs.id}.svg`,
        customLogoUrl,
        comment,
        categories: (meta?.categories && meta.categories.length > 0) ? meta.categories : (zs.category ? [zs.category] : ['department']),
        isActive: isExcluded || isHidden ? false : true,
        isExcluded,
        isHidden,
        acceptsAmex: meta?.acceptsAmex !== undefined && meta?.acceptsAmex !== null ? Boolean(meta.acceptsAmex) : true,
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
        zupergiftSupported: !isExcluded && !isHidden,
        zupergiftSlug: zs.slug,
        zupergiftUrl: `https://zupergift.com/se/${zs.slug}`,
        isZupergiftOnly: true,
        hasPartnerLink: false,
        isMissingFromSource: Boolean(zs.isMissingFromSource),
        missingSince: zs.missingSince || null,
        syncedAt: zs.syncedAt || db.lastZupergiftSync || undefined,
      };
    });

  const existingStores: Store[] = [...baseStores, ...extraZuperStores];
  const existingStoreIds = new Set<string>();
  const cleanSlugMap = new Map<string, string>();
  const nameToIdMap = new Map<string, string>();

  for (const s of existingStores) {
    existingStoreIds.add(s.id);
    existingStoreIds.add(s.slug);
    if (s.aliases) {
      for (const a of s.aliases) existingStoreIds.add(a.toLowerCase());
    }
    cleanSlugMap.set(cleanStoreSlug(s.id), s.id);
    cleanSlugMap.set(cleanStoreSlug(s.slug), s.id);
    nameToIdMap.set(s.name.trim().toLowerCase(), s.id);
  }

  function findExistingStoreId(gc: SasGiftCardStoreItem): string | undefined {
    if (gc.matchedStoreId && existingStoreIds.has(gc.matchedStoreId)) {
      return gc.matchedStoreId;
    }
    if (existingStoreIds.has(gc.id)) return gc.id;
    if (existingStoreIds.has(gc.slug)) return gc.slug;

    const gcClean = cleanStoreSlug(gc.slug || gc.id);
    if (cleanSlugMap.has(gcClean)) {
      return cleanSlugMap.get(gcClean);
    }

    const nameLower = (gc.name || '').trim().toLowerCase();
    return nameToIdMap.get(nameLower);
  }

  const extraSasStores: Store[] = [];

  for (const gc of db.sasGiftCards || []) {
    const isExcluded = isStoreExcluded(gc.id, gc.slug, gc);
    const isHidden = isStoreHidden(gc.id, gc.slug, gc);
    if (!options?.includeExcluded && (isHidden || isExcluded)) {
      continue;
    }

    const matchedId = findExistingStoreId(gc);
    if (matchedId) {
      // Store already exists (either in baseStores or extraZuperStores)
      continue;
    }

    // If this gift card belongs to a base store that is already defined in db.stores,
    // do not create a duplicate or resurrected extraSasStore
    const isBaseStoreMatch =
      allBaseStoreKeys.has(gc.id.toLowerCase()) ||
      (gc.slug && allBaseStoreKeys.has(gc.slug.toLowerCase())) ||
      allBaseStoreKeys.has(cleanStoreSlug(gc.id)) ||
      (gc.slug && allBaseStoreKeys.has(cleanStoreSlug(gc.slug))) ||
      (gc.name && allBaseStoreKeys.has(gc.name.trim().toLowerCase())) ||
      (gc.matchedStoreId && allBaseStoreKeys.has(gc.matchedStoreId.toLowerCase()));

    if (isBaseStoreMatch) {
      continue;
    }

    // New store only available via SAS gift card
    const meta = metadata[gc.id] || metadata[gc.slug];
    const customLogoUrl = meta?.customLogoUrl?.trim() || (gc as any).customLogoUrl || null;
    const comment = meta?.comment?.trim() || (gc as any).comment || null;
    const alias = meta?.alias !== undefined ? (meta.alias?.trim() || null) : ((gc as any).alias?.trim() || null);

    const newStore: Store = {
      id: gc.id,
      name: gc.name,
      slug: gc.slug,
      alias: alias || null,
      aliases: Array.from(new Set([
        ...((meta?.aliases && meta.aliases.length > 0) ? meta.aliases : [gc.slug, `${gc.id}.se`]),
        ...(alias ? [alias] : []),
      ])),
      logoUrl: customLogoUrl || gc.imageUrl || `/logos/${gc.id}.svg`,
      customLogoUrl,
      comment,
      categories: (meta?.categories && meta.categories.length > 0) ? meta.categories : ['department'],
      isActive: isExcluded || isHidden ? false : true,
      isExcluded,
      isHidden,
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
      isZupergiftOnly: false,
      hasPartnerLink: false,
      acceptsAmex: meta?.acceptsAmex !== undefined && meta?.acceptsAmex !== null ? Boolean(meta.acceptsAmex) : true,
      isMissingFromSource: Boolean(gc.isMissingFromSource),
      missingSince: gc.missingSince || null,
      syncedAt: gc.syncedAt || undefined,
    };

    extraSasStores.push(newStore);
    existingStores.push(newStore);
    existingStoreIds.add(gc.id);
    existingStoreIds.add(gc.slug);
    cleanSlugMap.set(cleanStoreSlug(gc.id), gc.id);
    cleanSlugMap.set(cleanStoreSlug(gc.slug), gc.id);
    nameToIdMap.set(gc.name.trim().toLowerCase(), gc.id);
  }

  const allStores = [...baseStores, ...extraZuperStores, ...extraSasStores];

  // Enrich all stores with SAS gift card availability info
  const sasMap = new Map<string, SasGiftCardStoreItem>();
  for (const gc of db.sasGiftCards || []) {
    if (gc.isHidden || gc.isExcluded) continue;
    const matchedId = findExistingStoreId(gc);
    if (matchedId) {
      const prev = sasMap.get(matchedId);
      // Do not overwrite an active gift card (>0 points) with a 0-point or missing entry
      if (!prev || ((gc.bonusPer100Kr ?? 0) > 0 && ((prev.bonusPer100Kr ?? 0) <= 0 || prev.isMissingFromSource))) {
        sasMap.set(matchedId, gc);
      }
    }
    sasMap.set(gc.id, gc);
    sasMap.set(gc.slug, gc);
  }

  // Enrich all stores with Zupergift item info (slug & direct presentkort URL)
  const zgMap = new Map<string, { slug: string }>();
  for (const zg of db.zupergiftStores || []) {
    if (zg.isHidden || zg.isExcluded) continue;
    if (zg.matchedStoreId) {
      zgMap.set(zg.matchedStoreId.toLowerCase(), zg);
    }
    zgMap.set(zg.id.toLowerCase(), zg);
    zgMap.set(zg.slug.toLowerCase(), zg);
    zgMap.set(cleanStoreSlug(zg.id), zg);
    zgMap.set(cleanStoreSlug(zg.slug), zg);
    zgMap.set(zg.name.trim().toLowerCase(), zg);
  }

  for (const s of allStores) {
    const gc = sasMap.get(s.id) || sasMap.get(s.slug);
    if (gc) {
      const hasActivePoints = !gc.isMissingFromSource && (gc.bonusPer100Kr ?? 0) > 0;
      s.hasSasGiftCard = options?.includeExcluded ? true : hasActivePoints;
      s.sasGiftCardBonusPer100Kr = gc.bonusPer100Kr;
      s.sasGiftCardMinPurchaseKr = gc.minPurchaseAmount ?? null;
      s.sasGiftCardDenominationsKr = gc.denominationsKr || [];
      s.sasGiftCardImageUrl = gc.imageUrl || null;
      if (isStoreMissingOwnLogo(s) && gc.imageUrl) {
        s.logoUrl = gc.imageUrl;
      }
    } else {
      s.hasSasGiftCard = false;
      s.sasGiftCardBonusPer100Kr = null;
    }

    if (s.zupergiftSupported) {
      const zg =
        (s.zupergiftSlug ? zgMap.get(s.zupergiftSlug.toLowerCase()) : undefined) ||
        zgMap.get(s.id.toLowerCase()) ||
        zgMap.get(s.slug.toLowerCase()) ||
        zgMap.get(cleanStoreSlug(s.id)) ||
        zgMap.get(cleanStoreSlug(s.slug)) ||
        zgMap.get(s.name.trim().toLowerCase());

      const resolvedSlug = zg?.slug || s.zupergiftSlug || s.slug || s.id;
      s.zupergiftSlug = resolvedSlug;
      s.zupergiftUrl = `https://zupergift.com/se/${resolvedSlug}`;
    }
  }

  const validStores = options?.includeExcluded
    ? allStores
    : allStores.filter(
        (s) =>
          Boolean(s.hasPartnerLink) ||
          Boolean(s.zupergiftSupported) ||
          Boolean(s.hasSasGiftCard) ||
          Boolean(s.giftCardRule?.hasDirectGiftCard)
      );

  return validStores.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}
