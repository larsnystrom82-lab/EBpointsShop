import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, ADMIN_SECRET } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_SECRET) {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_COOKIE_NAME, 'authenticated_valid_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return NextResponse.json({ success: true, message: 'Inloggning lyckades' });
    }

    return NextResponse.json(
      { success: false, error: 'Felaktigt administratörslösenord' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunde inte behandla inloggningen' },
      { status: 400 }
    );
  }
}
