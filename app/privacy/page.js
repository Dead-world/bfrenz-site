export const metadata = { title: 'Privacy Policy | BFRENZ.com' };

// TEMPLATE: a starting point written for BFRENZ. Have a lawyer review it
// before relying on it, and update the date whenever it changes.
const UPDATED = 'September 29, 2026';
const CONTACT = process.env.CONTACT_EMAIL || 'support@bfrenz.com';

export default function PrivacyPage() {
  return (
    <div className="box legal" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="box-h">Privacy Policy</div>
      <div className="box-b">
        <p className="small muted">Last updated {UPDATED}</p>

        <h2>What we collect</h2>
        <ul>
          <li><b>Account info:</b> username, display name, email address and a scrambled (hashed) version of your password.</li>
          <li><b>What you post:</b> profile details, photos, songs, comments, bulletins, messages, friends and your Top 8.</li>
          <li><b>Basic activity:</b> when you were last online and how many times your profile was viewed.</li>
          <li><b>Purchases:</b> what you bought and when. Card details go straight to Stripe; we never see or store them.</li>
        </ul>

        <h2>What&apos;s public</h2>
        <p>
          Your profile page, photos, Top 8, friends list and profile comments can be seen by anyone who visits
          bfrenz.com. Private messages are only visible to you and the person you&apos;re messaging. Your email address
          is never shown to other members.
        </p>

        <h2>How we use it</h2>
        <p>
          To run the site, keep you logged in, send password reset emails, give you what you paid for, prevent spam and
          abuse, and keep BFRENZ working. We don&apos;t sell your personal information.
        </p>

        <h2>Services we use</h2>
        <ul>
          <li><b>Vercel</b> hosts the site and stores uploaded photos and songs.</li>
          <li><b>Neon</b> stores the database.</li>
          <li><b>Stripe</b> processes payments.</li>
          <li><b>Resend</b> sends account emails such as password resets.</li>
          <li><b>Google AdSense</b> may show ads on some pages (never on profiles, and not to Supporters). Google may use cookies to show ads; see Google&apos;s ad settings to control this.</li>
        </ul>

        <h2>Cookies</h2>
        <p>We use one cookie to keep you logged in. Ads, if shown, may add their own cookies.</p>

        <h2>Kids</h2>
        <p>
          BFRENZ isn&apos;t for children under 13, and we don&apos;t knowingly collect their information. If you think a
          child under 13 has an account, email us and we&apos;ll delete it.
        </p>

        <h2>Your choices</h2>
        <p>
          You can edit your profile at any time. To download or delete your account and data, email{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We keep purchase records as long as the law requires.
        </p>

        <h2>Changes and contact</h2>
        <p>
          We&apos;ll update the date above if this policy changes. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </div>
    </div>
  );
}
