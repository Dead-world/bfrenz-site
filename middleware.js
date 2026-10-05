import { NextResponse } from 'next/server';

/**
 * The Google Play app opens bfrenz.com/home?app=android. Remember that in a cookie
 * so the site knows it's running inside the Android app (purchases are hidden there,
 * because Google Play requires its own billing for digital items sold in apps).
 */
export function middleware(request) {
  // Pass the page path along so pages can use it (e.g. sending old @username links to the new name).
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);
  const next = () => NextResponse.next({ request: { headers } });
  const app = request.nextUrl.searchParams.get('app');
  // Links can carry a source tag (bfrenz.com/?src=tiktok). Remember the first one for 30 days,
  // so sign-ups can be counted by where they came from.
  const src = (request.nextUrl.searchParams.get('src') || '').toLowerCase();
  const tagSrc = /^[a-z0-9_-]{1,30}$/.test(src) && !request.cookies.get('bfrenz_src');
  if (app !== 'android' && app !== 'web' && !tagSrc) return next();
  const res = next();
  if (tagSrc) res.cookies.set('bfrenz_src', src, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  if (app !== 'android' && app !== 'web') return res;
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
