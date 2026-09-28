import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="box" style={{ maxWidth: 520, margin: '40px auto' }}>
      <div className="box-h">Page not found</div>
      <div className="box-b">
        <p style={{ marginTop: 0 }}>That profile or page doesn&apos;t exist (or you don&apos;t have access to it).</p>
        <div className="actions">
          <Link href="/" className="btn small-btn">Go home</Link>
          <Link href="/browse" className="btn ghost small-btn">Browse people</Link>
        </div>
      </div>
    </div>
  );
}
