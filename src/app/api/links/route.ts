import { NextResponse } from 'next/server';
import { getDatabase, INITIAL_RESOURCE_LINKS } from '@/lib/db';

export async function GET() {
  try {
    const db = getDatabase();
    const links = (db.resourceLinks && db.resourceLinks.length > 0)
      ? db.resourceLinks
      : INITIAL_RESOURCE_LINKS;

    // Filter out hidden links and sort by order
    const visibleLinks = links
      .filter((item) => !item.isHidden)
      .sort((a, b) => (a.order || 999) - (b.order || 999));

    return NextResponse.json({
      links: visibleLinks,
    });
  } catch (error) {
    console.error('Error fetching resource links:', error);
    return NextResponse.json({ links: INITIAL_RESOURCE_LINKS }, { status: 500 });
  }
}
