import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LoginBox from '@/components/LoginBox';
import Notice from '@/components/Notice';

export const metadata = { title: 'Log In | BFRENZ.com' };

export default async function LoginPage({ searchParams }) {
  if (await getCurrentUser()) redirect('/home');
  const sp = await searchParams;
  return (
    <div style={{ maxWidth: 340, margin: '20px auto' }}>
      <Notice sp={sp} />
      <LoginBox />
      <p className="small" style={{ textAlign: 'center' }}>
        Not a member yet? <Link href="/signup">Sign up free!</Link>
      </p>
    </div>
  );
}
