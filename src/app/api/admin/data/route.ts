import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase } from '@/lib/db';
import { buildAllStores } from '@/lib/services/store-resolver';

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const db = getDatabase();
  const allStores = buildAllStores(db);
  return NextResponse.json({
    ...db,
    allStores,
  });
}
