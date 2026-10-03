import './globals.css';
import Link from 'next/link';
import Header from '@/components/Header';
import Messenger from '@/components/Messenger';
import CallLayer from '@/components/CallLayer';
import PwaRegister from '@/components/PwaRegister';
import AppBanner from '@/components/AppBanner';
import { getCurrentUser } from '@/lib/auth';

// Google AdSense publisher id (public, safe to have in code). NEXT_PUBLIC_ADSENSE_CLIENT overrides it.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-6605746910542515';

const DESCRIPTION = 'BFRENZ — make a profile, pick your Top 8, post bulletins and leave comments for your frenz.';

export const metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://www.bfrenz.com'),
  title: 'BFRENZ.com | where your frenz are at',
  description: DESCRIPTION,
  // Link previews (Facebook, iMessage, Discord, X, etc.). The share picture
  // itself comes from app/opengraph-image.png and app/twitter-image.png.
  openGraph: {
    siteName: 'BFRENZ',
    type: 'website',
    title: 'BFRENZ.com | where your frenz are at',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BFRENZ.com | where your frenz are at',
    description: DESCRIPTION,
  },
  applicationName: 'BFRENZ',
  appleWebApp: { capable: true, title: 'BFRENZ', statusBarStyle: 'black-translucent' },
  keywords: ['BFRENZ', 'social network', 'Top 8', 'MySpace alternative', 'profile song', 'custom profile', 'friends'],
  // AdSense "meta tag" verification.
  other: { 'google-adsense-account': ADSENSE_CLIENT },
  // Google Search Console: paste the "content" value of its HTML-tag check into GOOGLE_SITE_VERIFICATION.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport = { themeColor: '#0b0b0c', viewportFit: 'cover' };

export default async function RootLayout({ children }) {
  const me = await getCurrentUser();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
        {ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <div className="wrap">
          <Header />
          <main className="content">{children}</main>
          <footer>
            <Link href="/app">📲 Get the app</Link> &middot; <Link href="/help">Help</Link> &middot; <Link href="/browse">Browse</Link> &middot;{' '}
            <Link href="/shop">Shop</Link> &middot; <Link href="/shop#tip">Support BFRENZ</Link> &middot;{' '}
            {process.env.MERCH_URL && (
              <>
                <a href={process.env.MERCH_URL} target="_blank" rel="noopener noreferrer">Merch</a> &middot;{' '}
              </>
            )}
            <Link href="/terms">Terms</Link> &middot; <Link href="/privacy">Privacy</Link> &middot;{' '}
            <Link href="/account/delete">Delete account</Link>
            <br />
            &copy; {new Date().getFullYear()} BFRENZ.com &mdash; all your frenz, one place.
          </footer>
        </div>
        <PwaRegister />
        <AppBanner />
        {me && (
          <>
            <Messenger me={{ id: me.id, name: me.displayName, pic: me.avatarUrl || '/no-pic.svg', away: me.awayMessage || '' }} />
            <CallLayer me={{ id: me.id }} />
          </>
        )}
      </body>
    </html>
  );
}
