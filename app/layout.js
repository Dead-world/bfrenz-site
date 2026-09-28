import './globals.css';
import Link from 'next/link';
import Header from '@/components/Header';

export const metadata = {
  title: 'BFRENZ.com | where your frenz are at',
  description: 'BFRENZ — make a profile, pick your Top 8, post bulletins and leave comments for your frenz.',
};

export const viewport = { themeColor: '#0b0b0c' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <div className="wrap">
          <Header />
          <main className="content">{children}</main>
          <footer>
            <Link href="/help">Help</Link> &middot; <Link href="/browse">Browse</Link> &middot;{' '}
            <Link href="/signup">Sign Up</Link>
            <br />
            &copy; {new Date().getFullYear()} BFRENZ.com &mdash; all your frenz, one place.
          </footer>
        </div>
      </body>
    </html>
  );
}
