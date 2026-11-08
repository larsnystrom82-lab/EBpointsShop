import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const { storeId, action, scope } = await request.json();
    if (!storeId || typeof storeId !== 'string') {
      return NextResponse.json({ error: 'Ogiltigt butiks-ID' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.excludedStoreIds) {
      db.excludedStoreIds = [];
    }
    if (!db.storeCustomMetadata) {
      db.storeCustomMetadata = {};
    }

    const targetId = storeId.trim().toLowerCase();

    // Find store in base stores, zupergift, and sasGiftCards
    const baseStore = (db.stores || []).find(
      (s) => s.id.toLowerCase() === targetId || s.slug.toLowerCase() === targetId
    );
    const zgStore = (db.zupergiftStores || []).find(
      (s) =>
        s.id.toLowerCase() === targetId ||
        s.slug.toLowerCase() === targetId ||
        s.matchedStoreId?.toLowerCase() === targetId
    );
    const sasStore = (db.sasGiftCards || []).find(
      (s) =>
        s.id.toLowerCase() === targetId ||
        s.slug.toLowerCase() === targetId ||
        s.matchedStoreId?.toLowerCase() === targetId
    );

    const storeName = baseStore?.name || zgStore?.name || sasStore?.name || storeId;

    if (action === 'exclude' || action === 'delete') {
      const candidateIds = new Set<string>([targetId]);
      if (baseStore) {
        candidateIds.add(baseStore.id.toLowerCase());
        candidateIds.add(baseStore.slug.toLowerCase());
      }
      if (scope !== 'partner') {
        if (zgStore) {
          candidateIds.add(zgStore.id.toLowerCase());
          candidateIds.add(zgStore.slug.toLowerCase());
        }
        if (sasStore) {
          candidateIds.add(sasStore.id.toLowerCase());
          candidateIds.add(sasStore.slug.toLowerCase());
        }
      }

      // 1. Remove from db.stores (Partner / base stores)
      db.stores = (db.stores || []).filter(
        (s) => !candidateIds.has(s.id.toLowerCase()) && !candidateIds.has(s.slug.toLowerCase())
      );

      // 2. If scope is not strictly 'partner', also remove from Zupergift and SAS Gift Cards
      if (scope !== 'partner') {
        db.zupergiftStores = (db.zupergiftStores || []).filter(
          (s) =>
            !candidateIds.has(s.id.toLowerCase()) &&
            !candidateIds.has(s.slug.toLowerCase()) &&
            (!s.matchedStoreId || !candidateIds.has(s.matchedStoreId.toLowerCase()))
        );
        db.sasGiftCards = (db.sasGiftCards || []).filter(
          (s) =>
            !candidateIds.has(s.id.toLowerCase()) &&
            !candidateIds.has(s.slug.toLowerCase()) &&
            (!s.matchedStoreId || !candidateIds.has(s.matchedStoreId.toLowerCase()))
        );
      } else {
        // Unlink matchedStoreId if Zupergift / SAS GiftCard still exists
        for (const zs of db.zupergiftStores || []) {
          if (zs.matchedStoreId && candidateIds.has(zs.matchedStoreId.toLowerCase())) {
            delete zs.matchedStoreId;
          }
        }
        for (const gc of db.sasGiftCards || []) {
          if (gc.matchedStoreId && candidateIds.has(gc.matchedStoreId.toLowerCase())) {
            delete gc.matchedStoreId;
          }
        }
      }

      // 3. Ensure store is NOT in excludedStoreIds so it can return as a brand new store if re-added at source
      db.excludedStoreIds = (db.excludedStoreIds || []).filter(
        (id) => !candidateIds.has(id.toLowerCase())
      );

      // 4. Clean up storeCustomMetadata if store is no longer present in any channel (or if scope !== 'partner')
      const stillInOtherChannel =
        scope === 'partner' && Boolean(zgStore || sasStore);
      if (!stillInOtherChannel && db.storeCustomMetadata) {
        for (const key of Object.keys(db.storeCustomMetadata)) {
          if (candidateIds.has(key.toLowerCase())) {
            delete db.storeCustomMetadata[key];
          }
        }
      } else if (db.storeCustomMetadata) {
        for (const key of Object.keys(db.storeCustomMetadata)) {
          if (candidateIds.has(key.toLowerCase()) && db.storeCustomMetadata[key]?.isExcluded) {
            db.storeCustomMetadata[key].isExcluded = false;
          }
        }
      }

      // 5. Clean up syncNewStores log so if it returns in a future sync it is logged fresh
      if (db.syncNewStores) {
        db.syncNewStores = db.syncNewStores.filter((entry) => {
          if (scope === 'partner' && entry.source !== 'partner') return true;
          const matchesId = entry.storeId && candidateIds.has(entry.storeId.toLowerCase());
          const matchesSlug = entry.slug && candidateIds.has(entry.slug.toLowerCase());
          const matchesMatched = entry.matchedStoreId && candidateIds.has(entry.matchedStoreId.toLowerCase());
          return !(matchesId || matchesSlug || matchesMatched);
        });
      }

      db.auditEvents.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'DELETE_STORE',
        details: `Tog bort butik "${storeName}" (${storeId}) från databasen. Om butiken återkommer vid framtida synk läggs den till som en helt ny butik.`,
        user: 'Admin',
      });

      saveDatabase(db);

      return NextResponse.json({
        success: true,
        message: `Butiken "${storeName}" har tagits bort från databasen. Om den kommer tillbaka i framtiden läggs den till som en ny butik.`,
        storeId,
      });
    } else if (action === 'restore') {
      // Restore in base stores
      if (baseStore) {
        baseStore.isExcluded = false;
        baseStore.isActive = true;
      }

      // Restore in Zupergift
      if (zgStore) {
        zgStore.isExcluded = false;
        zgStore.isHidden = false;
      }

      // Restore in SAS gift cards
      if (sasStore) {
        sasStore.isExcluded = false;
      }

      // Remove from excludedStoreIds
      db.excludedStoreIds = db.excludedStoreIds.filter(
        (id) =>
          id.toLowerCase() !== targetId &&
          (!baseStore ||
            (id.toLowerCase() !== baseStore.id.toLowerCase() &&
              id.toLowerCase() !== baseStore.slug.toLowerCase()))
      );

      // Remove exclusion flag in metadata
      if (db.storeCustomMetadata[targetId]) {
        db.storeCustomMetadata[targetId].isExcluded = false;
        db.storeCustomMetadata[targetId].updatedAt = new Date().toISOString();
        db.storeCustomMetadata[targetId].updatedBy = 'Admin';
      }
      if (baseStore && db.storeCustomMetadata[baseStore.id]) {
        db.storeCustomMetadata[baseStore.id].isExcluded = false;
      }

      db.auditEvents.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'RESTORE_STORE',
        details: `Återställde butik "${storeName}" (${storeId}) till aktiva butiker.`,
        user: 'Admin',
      });

      saveDatabase(db);

      return NextResponse.json({
        success: true,
        message: `Butik "${storeName}" har återställts.`,
        storeId,
      });
    } else {
      return NextResponse.json({ error: 'Okänd åtgärd' }, { status: 400 });
    }
  } catch (err) {
    console.error('Error performing store action:', err);
    return NextResponse.json(
      { error: 'Ett serverfel inträffade vid butiksåtgärd' },
      { status: 500 }
    );
  }
}
