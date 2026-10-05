import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getDatabase, saveDatabase, DbCategory, INITIAL_CATEGORIES } from '@/lib/db';

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  const db = getDatabase();
  return NextResponse.json({ categories: db.categories || INITIAL_CATEGORIES });
}

export async function POST(request: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Behörighet saknas' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, id, name } = body;

    const db = getDatabase();
    if (!db.categories || !Array.isArray(db.categories)) {
      db.categories = [...INITIAL_CATEGORIES];
    }

    if (action === 'create') {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Kategorinamn är obligatoriskt' }, { status: 400 });
      }

      const trimmedName = name.trim();

      // Generate or clean ID slug
      let slugId = (id && typeof id === 'string' && id.trim())
        ? id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
        : trimmedName
            .toLowerCase()
            .replace(/[åä]/g, 'a')
            .replace(/[ö]/g, 'o')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

      if (!slugId) {
        slugId = `cat-${Date.now()}`;
      }

      // Check for duplicates
      const existingId = db.categories.some((c) => c.id === slugId);
      if (existingId) {
        return NextResponse.json(
          { error: `En kategori med ID "${slugId}" finns redan` },
          { status: 400 }
        );
      }

      const existingName = db.categories.some(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingName) {
        return NextResponse.json(
          { error: `En kategori med namnet "${trimmedName}" finns redan` },
          { status: 400 }
        );
      }

      const newCategory: DbCategory = {
        id: slugId,
        name: trimmedName,
        order: db.categories.length + 1,
        isActive: true,
      };

      db.categories.push(newCategory);

      // Audit event
      db.auditEvents.unshift({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CATEGORY_CREATED',
        details: `Skapade ny kategori: "${trimmedName}" (ID: ${slugId})`,
        user: 'Admin',
      });

      saveDatabase(db);

      return NextResponse.json({
        success: true,
        category: newCategory,
        categories: db.categories,
      });
    }

    if (action === 'update' || action === 'rename') {
      if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'Kategori-ID saknas' }, { status: 400 });
      }

      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Kategorinamn kan inte vara tomt' }, { status: 400 });
      }

      const trimmedName = name.trim();
      const catToUpdate = db.categories.find((c) => c.id === id);
      if (!catToUpdate) {
        return NextResponse.json({ error: 'Kategorin hittades inte' }, { status: 404 });
      }

      // Check if another category has the same name
      const duplicateName = db.categories.some(
        (c) => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicateName) {
        return NextResponse.json(
          { error: `En annan kategori heter redan "${trimmedName}"` },
          { status: 400 }
        );
      }

      const oldName = catToUpdate.name;
      catToUpdate.name = trimmedName;

      // Audit event
      db.auditEvents.unshift({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CATEGORY_UPDATED',
        details: `Ändrade namn på kategori "${oldName}" till "${trimmedName}" (ID: ${id})`,
        user: 'Admin',
      });

      saveDatabase(db);

      return NextResponse.json({
        success: true,
        message: `Kategorinamnet ändrades till "${trimmedName}"`,
        category: catToUpdate,
        categories: db.categories,
      });
    }

    if (action === 'delete') {
      if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'Kategori-ID saknas' }, { status: 400 });
      }

      const catToDelete = db.categories.find((c) => c.id === id);
      if (!catToDelete) {
        return NextResponse.json({ error: 'Kategorin hittades inte' }, { status: 404 });
      }

      // Count stores using this category
      const storesUsingCategory = db.stores.filter((s) => s.categories?.includes(id));
      const zuperUsingCategory = db.zupergiftStores.filter((zs) => zs.category === id);
      const totalUsing = storesUsingCategory.length + zuperUsingCategory.length;

      db.categories = db.categories.filter((c) => c.id !== id);

      // Audit event
      db.auditEvents.unshift({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CATEGORY_DELETED',
        details: `Tog bort kategori: "${catToDelete.name}" (ID: ${id}). Butiker som påverkades: ${totalUsing}`,
        user: 'Admin',
      });

      saveDatabase(db);

      return NextResponse.json({
        success: true,
        categories: db.categories,
      });
    }

    return NextResponse.json({ error: 'Ogiltig åtgärd' }, { status: 400 });
  } catch (err) {
    console.error('Category admin error:', err);
    return NextResponse.json({ error: 'Serverfel vid hantering av kategori' }, { status: 500 });
  }
}
