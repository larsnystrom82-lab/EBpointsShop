import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { syncSasPartnerStores } from '@/lib/services/sas-partner-sync';

export async function POST() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const result = await syncSasPartnerStores();
  return NextResponse.json(result);
}
