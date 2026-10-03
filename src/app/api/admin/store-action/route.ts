import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const { storeId, action } = await request.json();
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
      // Mark as excluded in base stores
      if (baseStore) {
        baseStore.isExcluded = true;
        baseStore.isActive = false;
      }

      // Mark as excluded in Zupergift
      if (zgStore) {
        zgStore.isExcluded = true;
      }

      // Mark as excluded in SAS gift cards
      if (sasStore) {
        sasStore.isExcluded = true;
      }

      // Add to excludedStoreIds
      if (!db.excludedStoreIds.includes(targetId)) {
        db.excludedStoreIds.push(targetId);
      }
      if (baseStore && !db.excludedStoreIds.includes(baseStore.id.toLowerCase())) {
        db.excludedStoreIds.push(baseStore.id.toLowerCase());
      }
      if (baseStore?.slug && !db.excludedStoreIds.includes(baseStore.slug.toLowerCase())) {
        db.excludedStoreIds.push(baseStore.slug.toLowerCase());
      }

      // Store in custom metadata so it persists forever
      const existingMeta = db.storeCustomMetadata[targetId] || {};
      db.storeCustomMetadata[targetId] = {
        ...existingMeta,
        isExcluded: true,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin',
      };
      if (baseStore && baseStore.id.toLowerCase() !== targetId) {
        db.storeCustomMetadata[baseStore.id] = {
          ...db.storeCustomMetadata[baseStore.id],
          isExcluded: true,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin',
        };
      }

      db.auditEvents.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'DELETE_STORE',
        details: `Tog bort butik "${storeName}" (${storeId}) - konkurs / borttagen från SAS. Exkluderas från sökning och framtida synkningar.`,
        user: 'Admin',
      });

      saveDatabase(db);

      return NextResponse.json({
        success: true,
        message: `Butik "${storeName}" har tagits bort och exkluderats från synkningar.`,
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
