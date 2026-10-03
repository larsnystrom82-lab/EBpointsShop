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
    const { storeId, customLogoUrl, comment } = body;

    if (!storeId || typeof storeId !== 'string') {
      return NextResponse.json({ error: 'Ogiltigt butiks-ID' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.storeCustomMetadata) {
      db.storeCustomMetadata = {};
    }

    const cleanLogoUrl = typeof customLogoUrl === 'string' && customLogoUrl.trim() ? customLogoUrl.trim() : null;
    const cleanComment = typeof comment === 'string' && comment.trim() ? comment.trim() : null;

    db.storeCustomMetadata[storeId] = {
      customLogoUrl: cleanLogoUrl,
      comment: cleanComment,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin',
    };

    // Also update any in-memory references if store exists in db.stores
    const baseStore = db.stores.find((s) => s.id === storeId || s.slug === storeId);
    if (baseStore) {
      baseStore.customLogoUrl = cleanLogoUrl;
      baseStore.comment = cleanComment;
    }

    // Update in zupergiftStores if exists
    const zgStore = (db.zupergiftStores || []).find((s) => s.id === storeId || s.slug === storeId || s.matchedStoreId === storeId);
    if (zgStore) {
      (zgStore as any).customLogoUrl = cleanLogoUrl;
      (zgStore as any).comment = cleanComment;
    }

    // Update in sasGiftCards if exists
    const sasStore = (db.sasGiftCards || []).find((s) => s.id === storeId || s.slug === storeId || s.matchedStoreId === storeId);
    if (sasStore) {
      (sasStore as any).customLogoUrl = cleanLogoUrl;
      (sasStore as any).comment = cleanComment;
    }

    const storeName = baseStore?.name || zgStore?.name || sasStore?.name || storeId;

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATE_STORE_METADATA',
      details: `Uppdaterade butik "${storeName}" (${storeId}): logga=${cleanLogoUrl || 'standard'}, kommentar=${cleanComment ? `"${cleanComment}"` : 'ingen'}.`,
      user: 'Admin',
    });

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: `Ändringar sparades för "${storeName}"`,
      metadata: db.storeCustomMetadata[storeId],
    });
  } catch (err) {
    console.error('Error saving store metadata:', err);
    return NextResponse.json({ error: 'Kunde inte spara butiksmetadata' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}
