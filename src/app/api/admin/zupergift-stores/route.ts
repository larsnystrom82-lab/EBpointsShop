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
    } else if (action === 'exclude') {
      zgStore.isExcluded = true;
      detailMsg = `Tog bort och exkluderade butik "${zgStore.name}" från Zupergift.`;
    } else if (action === 'restore') {
      zgStore.isExcluded = false;
      zgStore.isHidden = false;
      detailMsg = `Återställde butik "${zgStore.name}" till aktiva Zupergift-butiker.`;
    } else {
      return NextResponse.json({ error: 'Ogiltig åtgärd' }, { status: 400 });
    }

    // Synchronize corresponding local store if matched
    if (zgStore.matchedStoreId) {
      const localStore = db.stores.find((s) => s.id === zgStore.matchedStoreId);
      if (localStore) {
        localStore.zupergiftSupported = !zgStore.isHidden && !zgStore.isExcluded;
      }
    }

    // Also check direct match
    const directLocalStore = db.stores.find((s) => s.id === zgStore.id || s.slug === zgStore.slug);
    if (directLocalStore) {
      directLocalStore.zupergiftSupported = !zgStore.isHidden && !zgStore.isExcluded;
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
