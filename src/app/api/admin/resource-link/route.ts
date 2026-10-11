import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase, ResourceLinkItem, INITIAL_RESOURCE_LINKS } from '@/lib/db';

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const db = getDatabase();
  const links = (db.resourceLinks && db.resourceLinks.length > 0)
    ? db.resourceLinks
    : INITIAL_RESOURCE_LINKS;

  const sorted = [...links].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return NextResponse.json({ links: sorted });
}

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, tagline, category, categoryLabel, badge, badgeColor, description, features, url, order, isHidden } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Namn är obligatoriskt' }, { status: 400 });
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'Webbadress (URL) är obligatoriskt' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.resourceLinks || !Array.isArray(db.resourceLinks)) {
      db.resourceLinks = [...INITIAL_RESOURCE_LINKS];
    }

    const trimmedName = name.trim();
    let slugId = trimmedName
      .toLowerCase()
      .replace(/[åä]/g, 'a')
      .replace(/[ö]/g, 'o')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slugId) slugId = `link-${Date.now()}`;

    // Ensure uniqueness
    let finalId = slugId;
    let counter = 1;
    while (db.resourceLinks.some((l) => l.id === finalId)) {
      finalId = `${slugId}-${counter++}`;
    }

    const cleanFeatures = Array.isArray(features)
      ? features.map((f: unknown) => String(f).trim()).filter(Boolean)
      : [];

    const newLink: ResourceLinkItem = {
      id: finalId,
      name: trimmedName,
      tagline: (tagline && typeof tagline === 'string') ? tagline.trim() : '',
      category: category || 'awards',
      categoryLabel: categoryLabel || 'Sök bonusresor',
      badge: badge ? String(badge).trim() : undefined,
      badgeColor: badgeColor ? String(badgeColor).trim() : undefined,
      description: (description && typeof description === 'string') ? description.trim() : '',
      features: cleanFeatures,
      url: url.trim(),
      order: typeof order === 'number' ? order : db.resourceLinks.length + 1,
      isHidden: Boolean(isHidden),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.resourceLinks.push(newLink);

    // Audit log
    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CREATE_RESOURCE_LINK',
      details: `Skapade länken "${newLink.name}" (${newLink.url})`,
      user: 'Admin',
    });

    saveDatabase(db);
    return NextResponse.json({ success: true, link: newLink });
  } catch (error) {
    console.error('Error creating resource link:', error);
    return NextResponse.json({ error: 'Kunde inte skapa länken' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, tagline, category, categoryLabel, badge, badgeColor, description, features, url, order, isHidden } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Länk-ID saknas' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.resourceLinks || !Array.isArray(db.resourceLinks)) {
      db.resourceLinks = [...INITIAL_RESOURCE_LINKS];
    }

    const index = db.resourceLinks.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Länken hittades inte' }, { status: 404 });
    }

    const existing = db.resourceLinks[index];

    if (name !== undefined) existing.name = String(name).trim();
    if (tagline !== undefined) existing.tagline = String(tagline).trim();
    if (category !== undefined) existing.category = String(category).trim();
    if (categoryLabel !== undefined) existing.categoryLabel = String(categoryLabel).trim();
    if (badge !== undefined) existing.badge = badge ? String(badge).trim() : undefined;
    if (badgeColor !== undefined) existing.badgeColor = badgeColor ? String(badgeColor).trim() : undefined;
    if (description !== undefined) existing.description = String(description).trim();
    if (features !== undefined && Array.isArray(features)) {
      existing.features = features.map((f: unknown) => String(f).trim()).filter(Boolean);
    }
    if (url !== undefined) existing.url = String(url).trim();
    if (order !== undefined) existing.order = Number(order);
    if (isHidden !== undefined) existing.isHidden = Boolean(isHidden);
    existing.updatedAt = new Date().toISOString();

    db.resourceLinks[index] = existing;

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATE_RESOURCE_LINK',
      details: `Uppdaterade länken "${existing.name}" (dold: ${existing.isHidden})`,
      user: 'Admin',
    });

    saveDatabase(db);
    return NextResponse.json({ success: true, link: existing });
  } catch (error) {
    console.error('Error updating resource link:', error);
    return NextResponse.json({ error: 'Kunde inte uppdatera länken' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID saknas' }, { status: 400 });
    }

    const db = getDatabase();
    if (!db.resourceLinks || !Array.isArray(db.resourceLinks)) {
      db.resourceLinks = [...INITIAL_RESOURCE_LINKS];
    }

    const index = db.resourceLinks.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Länken hittades inte' }, { status: 404 });
    }

    const removed = db.resourceLinks.splice(index, 1)[0];

    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DELETE_RESOURCE_LINK',
      details: `Tog bort länken "${removed.name}" (${removed.url})`,
      user: 'Admin',
    });

    saveDatabase(db);
    return NextResponse.json({ success: true, removedId: id });
  } catch (error) {
    console.error('Error deleting resource link:', error);
    return NextResponse.json({ error: 'Kunde inte ta bort länken' }, { status: 500 });
  }
}
