import Link from 'next/link';
import { login } from '@/app/actions/auth';

export default function LoginBox() {
  return (
    <div className="box orange login-box">
      <div className="box-h orange">Member login</div>
      <div className="box-b">
        <form action={login}>
          <label htmlFor="who">Email or username</label>
          <input id="who" type="text" name="who" required autoComplete="username" />
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" name="password" required autoComplete="current-password" />
          <div className="actions" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <button className="btn" type="submit">Log in</button>
            <Link href="/signup" className="small">New here? <b>Sign up</b></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
