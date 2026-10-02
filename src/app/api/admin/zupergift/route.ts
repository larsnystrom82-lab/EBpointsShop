import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ratePer100Kr, isCampaign, campaignValidUntil, note } = body;

    if (typeof ratePer100Kr !== 'number' || ratePer100Kr < 0) {
      return NextResponse.json({ error: 'Ogiltig poängsats per 100 kr' }, { status: 400 });
    }

    const db = getDatabase();
    const oldRate = db.zupergiftConfig.ratePer100Kr;

    db.zupergiftConfig = {
      ...db.zupergiftConfig,
      ratePer100Kr,
      isCampaign: Boolean(isCampaign),
      campaignValidUntil: campaignValidUntil || null,
      note: note || '',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin',
    };

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATE_ZUPERGIFT_RATE',
      details: `Ändrade Zupergift EuroBonus-intjäning från ${oldRate}p till ${ratePer100Kr}p per 100 kr. Kampanj: ${isCampaign ? 'Ja' : 'Nej'}.`,
      user: 'Admin',
    });

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: `Zupergift-intjäning uppdaterad till ${ratePer100Kr} Extrapoäng per 100 kr.`,
      config: db.zupergiftConfig,
    });
  } catch (err) {
    console.error('Error updating Zupergift:', err);
    return NextResponse.json({ error: 'Kunde inte spara Zupergift-inställningar' }, { status: 500 });
  }
}
