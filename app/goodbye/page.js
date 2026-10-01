import Link from 'next/link';

export const metadata = { title: 'Account deleted | BFRENZ.com', robots: { index: false } };

export default function GoodbyePage() {
  return (
    <div className="box" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
      <div className="box-b">
        <h1 className="bigname">Your account was deleted</h1>
        <p className="muted">Thanks for being part of BFRENZ. You&apos;re always welcome back.</p>
        <Link href="/" className="btn">Back to BFRENZ</Link>
      </div>
    </div>
  );
}
