import Link from 'next/link';
import { resetPassword } from '@/app/actions/password';

export const metadata = { title: 'Reset Password | BFRENZ.com' };

export default async function ResetPage({ searchParams }) {
  const sp = await searchParams;
  const token = String(sp?.token || '');

  return (
    <div style={{ maxWidth: 400, margin: '20px auto' }}>
      <div className="box orange login-box">
        <div className="box-h orange">Set a new password</div>
        <div className="box-b">
          {sp?.error && <div className="notice error">{String(sp.error)}</div>}
          {!token ? (
            <p style={{ marginTop: 0 }}>
              This page needs the link from your reset email. <Link href="/forgot">Request a new link</Link>.
            </p>
          ) : (
            <form action={resetPassword}>
              <input type="hidden" name="token" value={token} />
              <label htmlFor="pw">New password</label>
              <input id="pw" type="password" name="password" required minLength={8} autoComplete="new-password" />
              <label htmlFor="pw2">Confirm new password</label>
              <input id="pw2" type="password" name="confirm" required minLength={8} autoComplete="new-password" />
              <p className="small muted">At least 8 characters. This logs you out everywhere else.</p>
              <button className="btn" type="submit">Save new password</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
