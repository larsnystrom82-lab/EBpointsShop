import { cookies, headers } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'poangkollen_admin_auth';
export const ADMIN_SECRET = process.env.ADMIN_PASSWORD || 'eurobonus2026';
export const CRON_SECRET = process.env.CRON_SECRET || ADMIN_SECRET;

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  if (session?.value === 'authenticated_valid_token') {
    return true;
  }

  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && (token === CRON_SECRET || token === ADMIN_SECRET || token === 'authenticated_valid_token')) {
      return true;
    }
  }

  return false;
}
