import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase } from '@/lib/db';
import { buildAllStores } from '@/lib/services/store-resolver';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const db = getDatabase();
  const allStores = buildAllStores(db, { includeExcluded: true });

  const headers = [
    'Ursprungligt butiksnamn',
    'Alias',
    'URL till logga',
    'URL till alternativ logga',
    'Kommentarer',
    'Kategorier',
    'Presentkort',
    'Zupergift',
    'Partnerbutik',
    'Status',
    'Partner poäng/100 kr',
    'Presentkort poäng/100 kr',
  ];

  const rows = allStores.map((store) => {
    const isPresentkort = store.hasSasGiftCard ? 'Ja' : 'Nej';
    const isZupergift = store.zupergiftSupported ? 'Ja' : 'Nej';
    const isPartner = store.hasPartnerLink ? 'Ja' : 'Nej';
    const status = store.isExcluded ? 'Borttagen' : store.isHidden ? 'Dold' : 'Aktiv';
    const partnerBonus = store.partnerRule?.bonusPer100Kr ?? '';
    const sasBonus = store.sasGiftCardBonusPer100Kr ?? '';
    const categoriesStr = (store.categories || []).join(', ');

    return [
      escapeCsv(store.name),
      escapeCsv(store.alias || ''),
      escapeCsv(store.logoUrl || ''),
      escapeCsv(store.customLogoUrl || ''),
      escapeCsv(store.comment || ''),
      escapeCsv(categoriesStr),
      escapeCsv(isPresentkort),
      escapeCsv(isZupergift),
      escapeCsv(isPartner),
      escapeCsv(status),
      escapeCsv(partnerBonus),
      escapeCsv(sasBonus),
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) for Excel compatibility with Swedish characters
  const csv = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="eurobonus-jakten-butiker-${dateStr}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
