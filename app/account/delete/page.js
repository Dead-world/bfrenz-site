import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { deleteAccount } from '@/app/actions/account';
import Notice from '@/components/Notice';

export const metadata = { title: 'Delete your account | BFRENZ.com', robots: { index: false } };

const CONTACT = process.env.CONTACT_EMAIL || 'support@bfrenz.com';

export default async function DeleteAccountPage({ searchParams }) {
  const me = await getCurrentUser();
  const sp = await searchParams;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <Notice sp={sp} />
      <div className="box">
        <div className="box-h">Delete your BFRENZ account</div>
        <div className="box-b">
          <p style={{ marginTop: 0 }}>Deleting your account is <b>permanent</b> and can&apos;t be undone. It removes:</p>
          <ul className="small" style={{ lineHeight: 1.8 }}>
            <li>Your profile, About Me, layout and profile song</li>
            <li>Your photos, albums and videos (including the uploaded files)</li>
            <li>Your posts, comments, bulletins, mail and IMs</li>
            <li>Your friends list and Top 8 spots</li>
          </ul>
          <p className="small muted">
            If you&apos;re a Supporter, your subscription is cancelled right away. Past purchases aren&apos;t refunded.
            We keep basic payment records only where the law requires it, as explained in the{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>

          {me ? (
            <form action={deleteAccount} className="stack delete-form">
              <label className="small">
                Your password
                <input type="password" name="password" required autoComplete="current-password" />
              </label>
              <label className="small">
                Type <b>DELETE</b> to confirm
                <input type="text" name="confirm" required autoComplete="off" placeholder="DELETE" />
              </label>
              <div className="actions">
                <button className="btn danger" type="submit">Permanently delete @{me.username}</button>
                <Link href="/edit" className="btn ghost">Cancel</Link>
              </div>
            </form>
          ) : (
            <div className="stack">
              <p>
                <Link href="/login" className="btn small-btn">Log in</Link> to delete your account, then come back to this page
                (it&apos;s also under <b>Edit Profile → Delete account</b>).
              </p>
              <p className="small muted">
                Can&apos;t log in? Email <a href={`mailto:${CONTACT}?subject=Delete%20my%20BFRENZ%20account`}>{CONTACT}</a> from
                the email address on your account with the subject &ldquo;Delete my BFRENZ account&rdquo; and we&apos;ll delete it
                within 30 days.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
