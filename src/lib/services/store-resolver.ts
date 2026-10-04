import { DatabaseSchema, SasGiftCardStoreItem } from '@/lib/db';
import { Store } from '@/types/domain';

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
      const isExcluded = isStoreExcluded(s.id, s.slug, s);
      const isHidden = isStoreHidden(s.id, s.slug, s);

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        aliases: (meta?.aliases && meta.aliases.length > 0) ? meta.aliases : (s.aliases || []),
        logoUrl: customLogoUrl || s.logoUrl || `/logos/${s.id}.svg`,
        customLogoUrl,
        comment,
        categories: (meta?.categories && meta.categories.length > 0) ? meta.categories : (s.categories || ['department']),
        isActive: isExcluded || isHidden ? false : (s.isActive ?? true),
        isExcluded,
        isHidden,
        partnerRule: s.partnerRule,
        giftCardRule: s.giftCardRule,
        zupergiftSupported: Boolean(s.zupergiftSupported),
        isZupergiftOnly: false,
        hasPartnerLink: isExcluded || isHidden ? false : Boolean(s.partnerRule?.hasPartnerLink),
        syncedAt: (s as any).syncedAt || db.lastPartnerSync || undefined,
      };
    });

  const baseStoreIds = new Set(db.stores.map((s) => s.id));

  const extraZuperStores: Store[] = (db.zupergiftStores || [])
    .filter((zs) => {
      if (baseStoreIds.has(zs.id) || (zs.matchedStoreId && baseStoreIds.has(zs.matchedStoreId))) {
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
      const isExcluded = isStoreExcluded(zs.id, zs.slug, zs);
      const isHidden = isStoreHidden(zs.id, zs.slug, zs);

      return {
        id: zs.id,
        name: zs.name,
        slug: zs.slug,
        aliases: (meta?.aliases && meta.aliases.length > 0) ? meta.aliases : [zs.slug, `${zs.id}.se`],
        logoUrl: customLogoUrl || `/logos/${zs.id}.svg`,
        customLogoUrl,
        comment,
        categories: (meta?.categories && meta.categories.length > 0) ? meta.categories : (zs.category ? [zs.category] : ['department']),
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
        zupergiftSupported: !isExcluded && !isHidden,
        isZupergiftOnly: true,
        hasPartnerLink: false,
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

    // New store only available via SAS gift card
    const meta = metadata[gc.id] || metadata[gc.slug];
    const customLogoUrl = meta?.customLogoUrl?.trim() || (gc as any).customLogoUrl || null;
    const comment = meta?.comment?.trim() || (gc as any).comment || null;

    const newStore: Store = {
      id: gc.id,
      name: gc.name,
      slug: gc.slug,
      aliases: (meta?.aliases && meta.aliases.length > 0) ? meta.aliases : [gc.slug, `${gc.id}.se`],
      logoUrl: customLogoUrl || `/logos/${gc.id}.svg`,
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
      sasMap.set(matchedId, gc);
    }
    sasMap.set(gc.id, gc);
    sasMap.set(gc.slug, gc);
  }

  for (const s of allStores) {
    const gc = sasMap.get(s.id) || sasMap.get(s.slug);
    if (gc) {
      s.hasSasGiftCard = true;
      s.sasGiftCardBonusPer100Kr = gc.bonusPer100Kr;
    } else {
      s.hasSasGiftCard = false;
      s.sasGiftCardBonusPer100Kr = null;
    }
  }

  return allStores.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}
