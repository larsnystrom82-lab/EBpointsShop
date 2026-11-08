import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const { action, storeId, category } = await request.json();
    const db = getDatabase();

    const zgStore = db.zupergiftStores.find((s) => s.id === storeId || s.slug === storeId);
    if (!zgStore) {
      return NextResponse.json({ error: 'Zupergift-butik hittades inte' }, { status: 404 });
    }

    let detailMsg = '';

    if (action === 'set-category') {
      const targetCategory = typeof category === 'string' && category.trim() ? category.trim() : 'department';
      zgStore.category = targetCategory;
      detailMsg = `Ändrade kategori för "${zgStore.name}" till "${targetCategory}".`;
      if (zgStore.matchedStoreId) {
        const localStore = db.stores.find((s) => s.id === zgStore.matchedStoreId);
        if (localStore) {
          localStore.categories = [targetCategory];
        }
      }
      const directLocal = db.stores.find((s) => s.id === zgStore.id || s.slug === zgStore.slug);
      if (directLocal) {
        directLocal.categories = [targetCategory];
      }
    } else if (action === 'hide') {
      zgStore.isHidden = true;
      detailMsg = `Döljde butik "${zgStore.name}" från Zupergift-vägar.`;
    } else if (action === 'unhide') {
      zgStore.isHidden = false;
      detailMsg = `Gjorde butik "${zgStore.name}" synlig igen för Zupergift-vägar.`;
    } else if (action === 'exclude' || action === 'delete') {
      const targetIds = new Set([zgStore.id.toLowerCase(), zgStore.slug.toLowerCase()]);
      db.zupergiftStores = db.zupergiftStores.filter(
        (s) => s.id !== zgStore.id && s.slug !== zgStore.slug
      );
      if (db.syncNewStores) {
        db.syncNewStores = db.syncNewStores.filter(
          (entry) =>
            entry.source !== 'zupergift' ||
            (!targetIds.has((entry.storeId || '').toLowerCase()) &&
              !targetIds.has((entry.slug || '').toLowerCase()))
        );
      }
      if (db.excludedStoreIds) {
        db.excludedStoreIds = db.excludedStoreIds.filter((id) => !targetIds.has(id.toLowerCase()));
      }
      const stillInOtherChannel =
        (db.stores || []).some(
          (s) => targetIds.has(s.id.toLowerCase()) || targetIds.has(s.slug.toLowerCase())
        ) ||
        (db.sasGiftCards || []).some(
          (s) => targetIds.has(s.id.toLowerCase()) || targetIds.has(s.slug.toLowerCase())
        );
      if (!stillInOtherChannel && db.storeCustomMetadata) {
        for (const key of Object.keys(db.storeCustomMetadata)) {
          if (targetIds.has(key.toLowerCase())) {
            delete db.storeCustomMetadata[key];
          }
        }
      }
      detailMsg = `Tog bort butik "${zgStore.name}" från Zupergift i databasen. Om den kommer tillbaka vid synk läggs den till som en ny butik.`;
    } else if (action === 'restore') {
      zgStore.isExcluded = false;
      zgStore.isHidden = false;
      detailMsg = `Återställde butik "${zgStore.name}" till aktiva Zupergift-butiker.`;
    } else {
      return NextResponse.json({ error: 'Ogiltig åtgärd' }, { status: 400 });
    }

    // Synchronize corresponding local store if matched
    const isZgActive =
      action !== 'exclude' && action !== 'delete' && !zgStore.isHidden && !zgStore.isExcluded;
    if (zgStore.matchedStoreId) {
      const localStore = db.stores.find((s) => s.id === zgStore.matchedStoreId);
      if (localStore) {
        localStore.zupergiftSupported = isZgActive;
      }
    }

    // Also check direct match
    const directLocalStore = db.stores.find((s) => s.id === zgStore.id || s.slug === zgStore.slug);
    if (directLocalStore) {
      directLocalStore.zupergiftSupported = isZgActive;
    }

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: `ZUPERGIFT_${action.toUpperCase()}`,
      details: detailMsg,
      user: 'Admin',
    });

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: detailMsg,
      zupergiftStore: zgStore,
    });
  } catch (err) {
    console.error('Error modifying Zupergift store:', err);
    return NextResponse.json({ error: 'Kunde inte uppdatera butik' }, { status: 500 });
  }
}
