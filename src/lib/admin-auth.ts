import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'poangkollen_admin_auth';
export const ADMIN_SECRET = process.env.ADMIN_PASSWORD || 'eurobonus2026';

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  return session?.value === 'authenticated_valid_token';
}
