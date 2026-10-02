import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signup } from '@/app/actions/auth';
import { getCurrentUser } from '@/lib/auth';
import Notice from '@/components/Notice';
import { prisma } from '@/lib/db';
import { Pic } from '@/components/Avatar';
import { cookies } from 'next/headers';
import { HEARD_FROM, cleanSrc } from '@/lib/sources';

export const metadata = { title: 'Sign Up | BFRENZ.com' };

export default async function SignupPage({ searchParams }) {
  if (await getCurrentUser()) redirect('/home');
  const sp = await searchParams;
  const ref = String(sp?.ref || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40);
  const inviter = ref
    ? await prisma.user.findFirst({ where: { username: ref, bannedAt: null } })
    : null;
  // Pre-pick the answer when they came in on a tagged link (bfrenz.com/?src=tiktok) or an invite.
  const src = cleanSrc((await cookies()).get('bfrenz_src')?.value);
  const guess = inviter ? 'friend' : HEARD_FROM.some(([k]) => k === src) ? src : '';
  return (
    <div className="cols">
      <div className="col-right">
        <div className="box">
          <div className="box-h">Join BFRENZ.com — it&apos;s free!</div>
          <div className="box-b">
            <Notice sp={sp} />
            {inviter && (
              <div className="invite-banner">
                <Pic user={inviter} size={56} />
                <div>
                  <b>{inviter.displayName}</b> invited you to BFRENZ!
                  <div className="small muted">Sign up and you&apos;ll be frenz right away.</div>
                </div>
              </div>
            )}
            <form action={signup}>
              {inviter && <input type="hidden" name="ref" value={inviter.username} />}
              <table className="form-table">
                <tbody>
                  <tr>
                    <td className="lbl">Username:</td>
                    <td>
                      <input type="text" name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" />
                      <div className="small muted">Your page will be bfrenz.com/<b>username</b></div>
                    </td>
                  </tr>
                  <tr>
                    <td className="lbl">Display Name:</td>
                    <td><input type="text" name="displayName" maxLength={40} placeholder="what your frenz call you" /></td>
                  </tr>
                  <tr>
                    <td className="lbl">Email:</td>
                    <td><input type="email" name="email" required maxLength={200} /></td>
                  </tr>
                  <tr>
                    <td className="lbl">Password:</td>
                    <td><input type="password" name="password" required minLength={8} /></td>
                  </tr>
                  <tr>
                    <td className="lbl">Confirm Password:</td>
                    <td><input type="password" name="confirm" required minLength={8} /></td>
                  </tr>
                  <tr>
                    <td className="lbl">How did you hear about BFRENZ?</td>
                    <td>
                      <select name="heardFrom" defaultValue={guess} aria-label="How did you hear about BFRENZ?">
                        <option value="">Pick one (optional)</option>
                        {HEARD_FROM.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td />
                    <td><button className="btn" type="submit">Sign Up &raquo;</button></td>
                  </tr>
                </tbody>
              </table>
            </form>
            <p className="small muted">
              By signing up you agree to the <Link href="/terms">Terms</Link> and{' '}
              <Link href="/privacy">Privacy Policy</Link>. You must be 13 or older.
            </p>
            <p className="small">Already a member? <Link href="/login">Log in here</Link>.</p>
          </div>
        </div>
      </div>
      <div className="col-left">
        <div className="box orange">
          <div className="box-h orange">Why join?</div>
          <div className="box-b">
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Make your profile look however you want</li>
              <li>Pick your Top 8</li>
              <li>Put a song on your page</li>
              <li>Post bulletins to all your frenz</li>
              <li>Leave comments &amp; send messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
