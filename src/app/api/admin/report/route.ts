import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const { reportId, status, adminNotes } = await request.json();
    const db = getDatabase();
    const report = db.errorReports.find((r) => r.id === reportId);
    if (!report) {
      return NextResponse.json({ error: 'Rapport hittades inte' }, { status: 404 });
    }

    report.status = status;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATE_REPORT_STATUS',
      details: `Ändrade felrapport ${reportId} till status '${status}'.`,
      user: 'Admin',
    });

    saveDatabase(db);
    return NextResponse.json({ success: true, report });
  } catch (err) {
    console.error('Error updating report:', err);
    return NextResponse.json({ error: 'Kunde inte uppdatera rapport' }, { status: 500 });
  }
}
