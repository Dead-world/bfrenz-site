export const metadata = { title: 'Terms of Service | BFRENZ.com' };

// TEMPLATE: a starting point written for BFRENZ. Have a lawyer review it
// before relying on it, and update the date whenever it changes.
const UPDATED = 'September 29, 2026';
const CONTACT = process.env.CONTACT_EMAIL || 'support@bfrenz.com';

export default function TermsPage() {
  return (
    <div className="box legal" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="box-h">Terms of Service</div>
      <div className="box-b">
        <p className="small muted">Last updated {UPDATED}</p>

        <h2>1. Using BFRENZ</h2>
        <p>
          BFRENZ.com is a free social network. You must be at least 13 years old to make an account. If you&apos;re
          under 18, you need a parent or guardian&apos;s permission to use BFRENZ and to buy anything here. Keep your
          password safe; you&apos;re responsible for what happens on your account.
        </p>

        <h2>2. Your content</h2>
        <p>
          You own what you post (profile text, photos, songs, comments, bulletins and messages). By posting it, you
          let BFRENZ store and show it on the site so the service works. Only post things you have the right to share,
          including music you upload as a profile song.
        </p>

        <h2>3. Not allowed</h2>
        <ul>
          <li>Harassment, threats, hate speech, or bullying</li>
          <li>Sexual content involving minors, or any illegal content</li>
          <li>Spam, scams, impersonation, or fake accounts</li>
          <li>Posting other people&apos;s private information</li>
          <li>Uploading music, photos or other work you don&apos;t have the rights to</li>
          <li>Trying to break, hack, or overload the site</li>
        </ul>
        <p>We can remove content or suspend accounts that break these rules.</p>

        <h2>4. Paid extras</h2>
        <p>
          BFRENZ is free. Paid extras (Supporter membership, profile themes, Pro Artist badge, featured spots, promoted
          songs, sponsored bulletins and tips) are optional. Prices are shown before you pay. Payments are processed
          by Stripe; we never see or store your full card details.
        </p>
        <ul>
          <li><b>Supporter</b> renews every month until you cancel. Cancel any time from the Shop (&ldquo;Manage or cancel subscription&rdquo;); you keep your perks until the end of the period you paid for.</li>
          <li><b>Themes</b> and the <b>Pro Artist</b> badge are one-time purchases for as long as BFRENZ runs them. Themes are included for Supporters while they&apos;re subscribed.</li>
          <li><b>Featured spots, promoted songs and sponsored bulletins</b> start right away and run for the time shown.</li>
          <li><b>Sponsored bulletins</b> must follow these Terms and are labeled &ldquo;Sponsored&rdquo;. We can remove one that breaks the rules without a refund.</li>
          <li><b>Tips</b> are gifts to support the site and don&apos;t buy anything.</li>
        </ul>

        <h2>5. Refunds</h2>
        <p>
          Because paid extras are digital and start right away, purchases are generally final. If something didn&apos;t
          work, you were charged by mistake, or you have another problem, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> within
          14 days and we&apos;ll make it right. Nothing here limits any refund rights you have under the law where you live.
        </p>

        <h2>6. Ads</h2>
        <p>Some pages may show ads, labeled &ldquo;Advertisement&rdquo;. Supporters don&apos;t see ads. Ads are never shown on profile pages.</p>

        <h2>7. The service</h2>
        <p>
          We work hard to keep BFRENZ running, but it&apos;s provided &ldquo;as is&rdquo; and may change, have downtime,
          or lose features. We&apos;re not responsible for what other members post. You can delete your account at any time
          by contacting us.
        </p>

        <h2>8. Changes and contact</h2>
        <p>
          We may update these Terms and will change the date above when we do. Questions or copyright complaints:{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </div>
    </div>
  );
}
