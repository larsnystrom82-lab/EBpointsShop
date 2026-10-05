import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      storeId,
      partnerBonusPer100Kr,
      partnerTierPer100Kr,
      isCampaign,
      zupergiftSupported,
      categories,
      category,
      alias,
      aliases,
      rewardType,
      fixedBonusPoints,
      fixedTierPoints,
      isOneTimeOffer,
      oneTimeTerms,
    } = body;

    const db = getDatabase();
    const store = db.stores.find((s) => s.id === storeId);
    if (!store) {
      return NextResponse.json({ error: 'Butik hittades inte' }, { status: 404 });
    }

    if (alias !== undefined) {
      store.alias = typeof alias === 'string' ? (alias.trim() || null) : null;
    }

    if (Array.isArray(categories)) {
      store.categories = categories;
    } else if (typeof category === 'string' && category.trim()) {
      store.categories = [category.trim()];
    }

    if (Array.isArray(aliases)) {
      store.aliases = aliases.map((a: unknown) => String(a).trim()).filter(Boolean);
    } else if (typeof aliases === 'string') {
      store.aliases = aliases.split(',').map((a: string) => a.trim()).filter(Boolean);
    }

    if (typeof partnerBonusPer100Kr === 'number') {
      store.partnerRule.bonusPer100Kr = partnerBonusPer100Kr;
    }
    if (typeof partnerTierPer100Kr === 'number') {
      store.partnerRule.tierPer100Kr = partnerTierPer100Kr;
    }
    if (rewardType === 'fixed' || rewardType === 'rate') {
      store.partnerRule.rewardType = rewardType;
    }
    if (typeof fixedBonusPoints === 'number') {
      store.partnerRule.fixedBonusPoints = fixedBonusPoints;
    }
    if (typeof fixedTierPoints === 'number') {
      store.partnerRule.fixedTierPoints = fixedTierPoints;
    }
    if (typeof isOneTimeOffer === 'boolean') {
      store.partnerRule.isOneTimeOffer = isOneTimeOffer;
    }
    if (typeof oneTimeTerms === 'string') {
      store.partnerRule.oneTimeTerms = oneTimeTerms;
    }
    if (typeof isCampaign === 'boolean') {
      store.partnerRule.isCampaign = isCampaign;
    }
    if (typeof zupergiftSupported === 'boolean') {
      store.zupergiftSupported = zupergiftSupported;
    }

    // Sync category with Zupergift store if matched
    const zgMatch = (db.zupergiftStores || []).find(
      (z) => z.id === store.id || z.slug === store.slug || z.matchedStoreId === store.id
    );
    if (zgMatch && store.categories.length > 0) {
      zgMatch.category = store.categories[0];
    }

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATE_STORE_RULE',
      details: `Uppdaterade regler för ${store.name}: Kategori [${store.categories.join(', ')}], ${store.partnerRule.bonusPer100Kr}p/100 kr, ${store.partnerRule.tierPer100Kr} nivå/100 kr, Zupergift: ${store.zupergiftSupported ? 'Ja' : 'Nej'}.`,
      user: 'Admin',
    });

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: `Regler sparade för ${store.name}`,
      store,
    });
  } catch (err) {
    console.error('Error saving store rule:', err);
    return NextResponse.json({ error: 'Kunde inte uppdatera butik' }, { status: 500 });
  }
}
