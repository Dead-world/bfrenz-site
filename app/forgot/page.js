import Link from 'next/link';
import { requestPasswordReset } from '@/app/actions/password';
import Notice from '@/components/Notice';

export const metadata = { title: 'Forgot Password | BFRENZ.com' };

export default async function ForgotPage({ searchParams }) {
  const sp = await searchParams;
  return (
    <div style={{ maxWidth: 400, margin: '20px auto' }}>
      <div className="box orange login-box">
        <div className="box-h orange">Forgot your password?</div>
        <div className="box-b">
          {sp?.error && <div className="notice error">{String(sp.error)}</div>}
          {sp?.sent ? (
            <>
              <div className="notice ok">Check your email!</div>
              <p className="small" style={{ marginTop: 0 }}>
                If an account matches what you entered, we sent it a link to reset the password. The link works
                once and expires in 1 hour. Check your spam folder if you don&apos;t see it.
              </p>
              <Link href="/login" className="btn small-btn">Back to log in</Link>
            </>
          ) : (
            <form action={requestPasswordReset}>
              <p className="small muted" style={{ marginTop: 0 }}>
                Enter the email or username on your account and we&apos;ll email you a link to set a new password.
              </p>
              <label htmlFor="who">Email or username</label>
              <input id="who" type="text" name="who" required autoComplete="username" />
              <div className="actions" style={{ marginTop: 16, justifyContent: 'space-between' }}>
                <button className="btn" type="submit">Send reset link</button>
                <Link href="/login" className="small">Back to log in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
