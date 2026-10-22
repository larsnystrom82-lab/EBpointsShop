import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, id, source } = body as {
      action: 'toggle-review' | 'mark-all-reviewed' | 'clear-reviewed' | 'delete';
      id?: string;
      source?: 'partner' | 'sas_giftcard' | 'zupergift';
    };

    const db = getDatabase();
    if (!db.syncNewStores) {
      db.syncNewStores = [];
    }

    const now = new Date().toISOString();

    if (action === 'toggle-review' && id) {
      const entry = db.syncNewStores.find((item) => item.id === id);
      if (!entry) {
        return NextResponse.json({ error: 'Loggraden hittades inte' }, { status: 404 });
      }
      entry.isReviewed = !entry.isReviewed;
      entry.reviewedAt = entry.isReviewed ? now : null;
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        message: entry.isReviewed
          ? `"${entry.name}" markerades som kontrollerad.`
          : `"${entry.name}" markerades som okontrollerad.`,
      });
    }

    if (action === 'mark-all-reviewed') {
      let count = 0;
      for (const item of db.syncNewStores) {
        if ((!source || item.source === source) && !item.isReviewed) {
          item.isReviewed = true;
          item.reviewedAt = now;
          count++;
        }
      }
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        message: `${count} nya butiker markerades som kontrollerade.`,
      });
    }

    if (action === 'clear-reviewed') {
      const before = db.syncNewStores.length;
      db.syncNewStores = db.syncNewStores.filter((item) => {
        if (source && item.source !== source) return true;
        return !item.isReviewed;
      });
      const removed = before - db.syncNewStores.length;
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        message: `${removed} kontrollerade butiker rensades från synkloggen.`,
      });
    }

    if (action === 'delete' && id) {
      db.syncNewStores = db.syncNewStores.filter((item) => item.id !== id);
      saveDatabase(db);
      return NextResponse.json({
        success: true,
        message: 'Posten togs bort från synkloggen.',
      });
    }

    return NextResponse.json({ error: 'Ogiltig åtgärd' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Fel i synklogg: ${message}` }, { status: 500 });
  }
}
