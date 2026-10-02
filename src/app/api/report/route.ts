import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, storeName, routeId, routeTitle, userText } = body;

    if (!userText || !userText.trim()) {
      return NextResponse.json({ error: 'Beskrivning saknas' }, { status: 400 });
    }

    const db = getDatabase();
    const newReport = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      storeId: storeId || 'unknown',
      storeName: storeName || 'Okänd butik',
      routeId: routeId || 'unknown',
      routeTitle: routeTitle || 'Okänd rutt',
      userText: userText.trim().substring(0, 1000), // Max 1000 chars
      status: 'new' as const,
      createdAt: new Date().toISOString(),
    };

    db.errorReports.unshift(newReport);
    saveDatabase(db);

    return NextResponse.json({ success: true, reportId: newReport.id });
  } catch (err) {
    console.error('Error saving error report:', err);
    return NextResponse.json({ error: 'Kunde inte spara rapport' }, { status: 500 });
  }
}
