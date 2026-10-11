import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.hostname;
  const cleanHost = host.split(':')[0].toLowerCase();

  // Redirect legacy bonuslotsen.se (including subdomains)
  // as well as apex domain poangpiloten.se (without www) to canonical www.poangpiloten.se
  if (
    cleanHost === 'bonuslotsen.se' ||
    cleanHost === 'www.bonuslotsen.se' ||
    cleanHost.endsWith('.bonuslotsen.se') ||
    cleanHost === 'poangpiloten.se'
  ) {
    const url = request.nextUrl.clone();
    url.protocol = 'https';
    url.hostname = 'www.poangpiloten.se';
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except internal assets and metadata files
     */
    '/((?!_next/static|_next/image|icon.png|favicon.ico).*)',
  ],
};
