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
  const allStores = buildAllStores(db, { includeExcluded: true });
  const stores = (db.stores || []).map((s) => {
    const metaAmex = db.storeCustomMetadata?.[s.id]?.acceptsAmex ?? db.storeCustomMetadata?.[s.slug]?.acceptsAmex;
    const defaultAcceptsAmex = !s.partnerRule?.hasPartnerLink;
    return {
      ...s,
      acceptsAmex: metaAmex !== undefined && metaAmex !== null
        ? Boolean(metaAmex)
        : s.acceptsAmex !== undefined
          ? Boolean(s.acceptsAmex)
          : defaultAcceptsAmex,
    };
  });
  return NextResponse.json({
    ...db,
    stores,
    allStores,
  });
}
