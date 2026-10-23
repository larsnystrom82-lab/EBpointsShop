import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { syncSasPartnerStores } from '@/lib/services/sas-partner-sync';
import { syncSasGiftCardStores } from '@/lib/services/sas-giftcard-sync';
import { syncZupergiftCatalog } from '@/lib/services/zupergift-sync';

async function runAllSyncs() {
  const startedAt = new Date().toISOString();

  const partner = await syncSasPartnerStores().catch((err) => ({
    success: false,
    message: err instanceof Error ? err.message : 'Partner-synk misslyckades',
  }));

  const sasGiftCards = await syncSasGiftCardStores().catch((err) => ({
    success: false,
    message: err instanceof Error ? err.message : 'SAS Presentkort-synk misslyckades',
  }));

  const zupergift = await syncZupergiftCatalog().catch((err) => ({
    success: false,
    message: err instanceof Error ? err.message : 'Zupergift-synk misslyckades',
  }));

  return {
    success: partner.success && sasGiftCards.success && zupergift.success,
    startedAt,
    completedAt: new Date().toISOString(),
    results: {
      partner,
      sasGiftCards,
      zupergift,
    },
  };
}

export async function POST() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const summary = await runAllSyncs();
  return NextResponse.json(summary);
}

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const summary = await runAllSyncs();
  return NextResponse.json(summary);
}
