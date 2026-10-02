import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { syncZupergiftCatalog } from '@/lib/services/zupergift-sync';

export async function POST() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const result = await syncZupergiftCatalog();
  return NextResponse.json(result);
}
