import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { safeBack } from '@/lib/util';
import LoginBox from '@/components/LoginBox';
import Notice from '@/components/Notice';

export const metadata = { title: 'Log In | BFRENZ.com' };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = sp?.next ? safeBack(String(sp.next), '') : '';
  if (await getCurrentUser()) redirect(next || '/home');
  return (
    <div style={{ maxWidth: 340, margin: '20px auto' }}>
      <Notice sp={sp} />
      <LoginBox next={next} />
      <p className="small" style={{ textAlign: 'center' }}>
        Not a member yet? <Link href="/signup">Sign up free!</Link>
      </p>
    </div>
  );
}
