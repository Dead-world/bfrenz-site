import { NextResponse } from 'next/server';

/**
 * Digital Asset Links (served at /.well-known/assetlinks.json via a rewrite).
 * Proves the Google Play app belongs to bfrenz.com, so it opens full screen with no browser bar.
 * Set in Vercel:
 *   ANDROID_PACKAGE = the package name you chose in PWABuilder (e.g. com.bfrenz.app)
 *   ANDROID_SHA256  = the SHA-256 fingerprint(s), comma separated (from PWABuilder and/or Play Console)
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const pkg = String(process.env.ANDROID_PACKAGE || 'com.bfrenz.app').trim();
  const prints = String(process.env.ANDROID_SHA256 || '')
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  const body = prints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: prints },
        },
      ]
    : [];
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
