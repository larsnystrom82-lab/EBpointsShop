import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  let body: {
    id: string;
    bonusPer100Kr?: number | null;
    minPurchaseAmount?: number | null;
    isCampaign?: boolean;
    campaignValidUntil?: string | null;
    isHidden?: boolean;
    isExcluded?: boolean;
    note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ogiltig JSON' }, { status: 400 });
  }

  const { id, bonusPer100Kr, minPurchaseAmount, isCampaign, campaignValidUntil, isHidden, isExcluded, note } = body;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id saknas' }, { status: 400 });
  }

  // Validate bonusPer100Kr
  if (bonusPer100Kr !== undefined && bonusPer100Kr !== null) {
    if (typeof bonusPer100Kr !== 'number' || bonusPer100Kr < 0) {
      return NextResponse.json({ error: 'bonusPer100Kr måste vara ett tal >= 0 eller null' }, { status: 400 });
    }
  }

  // Validate minPurchaseAmount
  if (minPurchaseAmount !== undefined && minPurchaseAmount !== null) {
    if (typeof minPurchaseAmount !== 'number' || minPurchaseAmount < 0) {
      return NextResponse.json({ error: 'minPurchaseAmount måste vara ett tal >= 0 eller null' }, { status: 400 });
    }
  }

  const db = getDatabase();
  const item = db.sasGiftCards.find((s) => s.id === id);

  if (!item) {
    return NextResponse.json({ error: `Butik med id "${id}" hittades inte` }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (bonusPer100Kr !== undefined) item.bonusPer100Kr = bonusPer100Kr;
  if (minPurchaseAmount !== undefined) item.minPurchaseAmount = minPurchaseAmount;
  if (isCampaign !== undefined) item.isCampaign = Boolean(isCampaign);
  if (campaignValidUntil !== undefined) item.campaignValidUntil = campaignValidUntil ?? null;
  if (isHidden !== undefined) item.isHidden = Boolean(isHidden);
  if (isExcluded !== undefined) item.isExcluded = Boolean(isExcluded);
  if (note !== undefined) item.note = note ?? '';
  item.updatedAt = now;

  db.auditEvents.push({
    id: `audit-${Date.now()}`,
    timestamp: now,
    action: 'UPDATE_SAS_GIFTCARD',
    details: `SAS presentkortsbutik "${item.name}" uppdaterades. bonusPer100Kr=${item.bonusPer100Kr}, minPurchaseAmount=${item.minPurchaseAmount ?? 'inget'}, isHidden=${item.isHidden}, isExcluded=${item.isExcluded}.`,
    user: 'Admin',
  });

  saveDatabase(db);

  return NextResponse.json({ success: true, message: `"${item.name}" sparades.`, item });
}
