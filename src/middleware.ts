import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host ||
    '';
  const hostname = host.split(':')[0].toLowerCase();

  // Exclude local development and test environments
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local')
  ) {
    return NextResponse.next();
  }

  const canonicalHost = 'bonuslotsen.se';

  // If request is from an alternative domain (e.g. www.bonuslotsen.se, ebpointsshop.onrender.com, etc.)
  if (hostname !== canonicalHost) {
    const targetUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      'https://bonuslotsen.se'
    );
    return NextResponse.redirect(targetUrl, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except Next.js internals:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    '/((?!_next/static|_next/image).*)',
  ],
};
