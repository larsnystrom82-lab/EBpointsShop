import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userText, category, email, pageUrl, storeName } = body;

    if (!userText || !userText.trim()) {
      return NextResponse.json({ error: 'Beskrivning saknas' }, { status: 400 });
    }

    const validCategories = ['suggestion', 'store_missing', 'bug', 'general', 'store_change'];
    const assignedCategory = validCategories.includes(category) ? category : 'suggestion';

    const db = getDatabase();

    const categoryTitles: Record<string, string> = {
      suggestion: 'Förbättringsförslag',
      store_missing: storeName ? `Saknad butik: ${storeName}` : 'Saknad butik',
      bug: 'Bugg / tekniskt fel',
      general: 'Allmän feedback',
      store_change: 'Ändrat poängvillkor',
    };

    const newFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      storeId: assignedCategory === 'store_missing' ? 'missing_store' : 'website',
      storeName: categoryTitles[assignedCategory] || 'Förbättringsförslag',
      routeId: 'user_feedback',
      routeTitle: assignedCategory === 'suggestion' ? 'Idé eller ny funktion' : categoryTitles[assignedCategory],
      category: assignedCategory as 'suggestion' | 'store_missing' | 'bug' | 'general' | 'store_change',
      userText: userText.trim().substring(0, 3000),
      email: email ? String(email).trim().substring(0, 100) : undefined,
      pageUrl: pageUrl ? String(pageUrl).trim().substring(0, 200) : undefined,
      status: 'new' as const,
      createdAt: new Date().toISOString(),
    };

    db.errorReports.unshift(newFeedback);

    // Also add to audit trail
    db.auditEvents.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'FEEDBACK_SUBMITTED',
      details: `${categoryTitles[assignedCategory]}: "${newFeedback.userText.substring(0, 60)}${newFeedback.userText.length > 60 ? '...' : ''}"`,
      user: email || 'Anonym besökare',
    });

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      feedbackId: newFeedback.id,
      message: 'Tack för din feedback! Ditt förslag har tagits emot.',
    });
  } catch (err) {
    console.error('Error saving feedback:', err);
    return NextResponse.json({ error: 'Kunde inte spara feedback' }, { status: 500 });
  }
}
