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
    const metaInvoiceOnly = db.storeCustomMetadata?.[s.id]?.invoiceOnly ?? db.storeCustomMetadata?.[s.slug]?.invoiceOnly;
    const resolvedInvoiceOnly =
      metaInvoiceOnly !== undefined && metaInvoiceOnly !== null
        ? Boolean(metaInvoiceOnly)
        : Boolean(s.invoiceOnly);
    const metaAmex = db.storeCustomMetadata?.[s.id]?.acceptsAmex ?? db.storeCustomMetadata?.[s.slug]?.acceptsAmex;
    const defaultAcceptsAmex = !s.partnerRule?.hasPartnerLink;
    const isFixedPartner =
      s.partnerRule?.rewardType === 'fixed' ||
      Boolean(s.partnerRule?.isOneTimeOffer) ||
      ((s.partnerRule?.fixedBonusPoints ?? 0) > 0);
    const metaExcludesVat = db.storeCustomMetadata?.[s.id]?.excludesVat ?? db.storeCustomMetadata?.[s.slug]?.excludesVat;
    const defaultExcludesVat = Boolean(s.partnerRule?.hasPartnerLink && !isFixedPartner);
    return {
      ...s,
      invoiceOnly: resolvedInvoiceOnly,
      acceptsAmex: resolvedInvoiceOnly
        ? false
        : metaAmex !== undefined && metaAmex !== null
        ? Boolean(metaAmex)
        : s.acceptsAmex !== undefined
          ? Boolean(s.acceptsAmex)
          : defaultAcceptsAmex,
      excludesVat: isFixedPartner
        ? false
        : metaExcludesVat !== undefined && metaExcludesVat !== null
          ? Boolean(metaExcludesVat)
          : s.excludesVat !== undefined
            ? Boolean(s.excludesVat)
            : defaultExcludesVat,
    };
  });
  return NextResponse.json({
    ...db,
    stores,
    allStores,
  });
}
