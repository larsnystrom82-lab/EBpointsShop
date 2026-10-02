import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { syncSasGiftCardStores } from '@/lib/services/sas-giftcard-sync';

export async function POST() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const result = await syncSasGiftCardStores();
  return NextResponse.json(result);
}
