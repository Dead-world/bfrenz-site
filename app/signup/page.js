import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signup } from '@/app/actions/auth';
import { getCurrentUser } from '@/lib/auth';
import Notice from '@/components/Notice';

export const metadata = { title: 'Sign Up | BFRENZ.com' };

export default async function SignupPage({ searchParams }) {
  if (await getCurrentUser()) redirect('/home');
  const sp = await searchParams;
  return (
    <div className="cols">
      <div className="col-right">
        <div className="box">
          <div className="box-h">Join BFRENZ.com — it&apos;s free!</div>
          <div className="box-b">
            <Notice sp={sp} />
            <form action={signup}>
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
                    <td />
                    <td><button className="btn" type="submit">Sign Up &raquo;</button></td>
                  </tr>
                </tbody>
              </table>
            </form>
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
