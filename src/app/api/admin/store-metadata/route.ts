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
    const { storeId, customLogoUrl, comment, isHidden, categories, alias, aliases } = body;

    if (!storeId || typeof storeId !== 'string') {
      return NextResponse.json({ error: 'Ogiltigt butiks-ID' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.storeCustomMetadata) {
      db.storeCustomMetadata = {};
    }

    const cleanLogoUrl = typeof customLogoUrl === 'string' && customLogoUrl.trim() ? customLogoUrl.trim() : null;
    const cleanComment = typeof comment === 'string' && comment.trim() ? comment.trim() : null;
    const existingMeta = db.storeCustomMetadata[storeId] || {};
    const cleanIsHidden = typeof isHidden === 'boolean' ? isHidden : Boolean(existingMeta.isHidden);
    const cleanAlias = typeof alias === 'string' ? (alias.trim() || null) : alias === null ? null : (existingMeta.alias || null);

    let cleanCategories: string[] | null | undefined = undefined;
    if (Array.isArray(categories)) {
      cleanCategories = categories.map((c: unknown) => String(c).trim()).filter(Boolean);
    }

    let cleanAliases: string[] | null | undefined = undefined;
    if (Array.isArray(aliases)) {
      cleanAliases = aliases.map((a: unknown) => String(a).trim()).filter(Boolean);
    } else if (typeof aliases === 'string') {
      cleanAliases = aliases.split(',').map((a: string) => a.trim()).filter(Boolean);
    }

    db.storeCustomMetadata[storeId] = {
      ...existingMeta,
      customLogoUrl: cleanLogoUrl,
      comment: cleanComment,
      isHidden: cleanIsHidden,
      alias: cleanAlias,
      ...(cleanCategories !== undefined ? { categories: cleanCategories } : {}),
      ...(cleanAliases !== undefined ? { aliases: cleanAliases } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin',
    };

    // Also update any in-memory references if store exists in db.stores
    const baseStore = db.stores.find((s) => s.id === storeId || s.slug === storeId);
    if (baseStore) {
      baseStore.customLogoUrl = cleanLogoUrl;
      baseStore.comment = cleanComment;
      baseStore.isHidden = cleanIsHidden;
      baseStore.alias = cleanAlias;
      if (cleanCategories && cleanCategories.length > 0) {
        baseStore.categories = cleanCategories;
      }
      if (cleanAliases) {
        baseStore.aliases = cleanAliases;
      }
    }

    // Update in zupergiftStores if exists
    const zgStore = (db.zupergiftStores || []).find((s) => s.id === storeId || s.slug === storeId || s.matchedStoreId === storeId);
    if (zgStore) {
      (zgStore as any).customLogoUrl = cleanLogoUrl;
      (zgStore as any).comment = cleanComment;
      (zgStore as any).alias = cleanAlias;
      zgStore.isHidden = cleanIsHidden;
      if (cleanCategories && cleanCategories.length > 0) {
        zgStore.category = cleanCategories[0];
      }
    }

    // Update in sasGiftCards if exists
    const sasStore = (db.sasGiftCards || []).find((s) => s.id === storeId || s.slug === storeId || s.matchedStoreId === storeId);
    if (sasStore) {
      (sasStore as any).customLogoUrl = cleanLogoUrl;
      (sasStore as any).comment = cleanComment;
      (sasStore as any).alias = cleanAlias;
      sasStore.isHidden = cleanIsHidden;
    }

    const storeName = baseStore?.name || zgStore?.name || sasStore?.name || storeId;

    const catDetails = cleanCategories ? `, kategorier=[${cleanCategories.join(', ')}]` : '';
    const aliasDetails = cleanAlias ? `, alias="${cleanAlias}"` : '';
    const aliasesDetails = cleanAliases ? `, sökord=[${cleanAliases.join(', ')}]` : '';

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATE_STORE_METADATA',
      details: `Uppdaterade butik "${storeName}" (${storeId}): logga=${cleanLogoUrl || 'standard'}, kommentar=${cleanComment ? `"${cleanComment}"` : 'ingen'}, dölj=${cleanIsHidden ? 'ja' : 'nej'}${aliasDetails}${catDetails}${aliasesDetails}.`,
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
