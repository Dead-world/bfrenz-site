import Link from 'next/link';
import InstallApp from '@/components/InstallApp';

export const metadata = {
  title: 'Get the BFRENZ app',
  description: 'Install BFRENZ on your phone: free, full screen, with your Top 8, feed and IM one tap away.',
  alternates: { canonical: '/app' },
};

export default function GetTheAppPage() {
  return (
    <div className="app-page">
      <div className="app-hero">
        <img src="/icons/icon-512.png" alt="BFRENZ app icon" width={140} height={140} className="app-hero-icon" />
        <h1>Get the BFRENZ app</h1>
        <p className="muted">Free. Full screen. Your feed, Top 8, mail and IM one tap away, right on your home screen.</p>
      </div>

      <InstallApp />

      <div className="app-perks">
        <div><span>⚡</span><b>Opens instantly</b><small>No typing the address, no browser bars.</small></div>
        <div><span>🔄</span><b>Always up to date</b><small>New features show up automatically.</small></div>
        <div><span>💾</span><b>Tiny</b><small>Takes almost no space on your phone.</small></div>
      </div>

      <p className="small muted" style={{ textAlign: 'center' }}>
        Coming to Google Play soon. Already a member? <Link href="/home">Go to your feed</Link>.
      </p>
    </div>
  );
}
