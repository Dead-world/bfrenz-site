import { NextResponse } from 'next/server';

/**
 * The Google Play app opens bfrenz.com/home?app=android. Remember that in a cookie
 * so the site knows it's running inside the Android app (purchases are hidden there,
 * because Google Play requires its own billing for digital items sold in apps).
 */
export function middleware(request) {
  const app = request.nextUrl.searchParams.get('app');
  if (app !== 'android' && app !== 'web') return NextResponse.next();
  const res = NextResponse.next();
  if (app === 'android') {
    res.cookies.set('bfrenz_app', 'android', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  } else {
    res.cookies.delete('bfrenz_app');
  }
  return res;
}

export const config = {
  // Only pages, never files or the API.
  matcher: ['/((?!api|_next|icons|themes|about|.*\\..*).*)'],
};
