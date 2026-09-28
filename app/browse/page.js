import Link from 'next/link';
import { prisma } from '@/lib/db';
import { FriendTile } from '@/components/Avatar';

export const metadata = { title: 'Browse | BFRENZ.com' };

const PER_PAGE = 40;

export default async function BrowsePage({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim().slice(0, 60);
  const view = sp?.view === 'online' ? 'online' : 'new';
  const page = Math.max(1, parseInt(sp?.page || '1', 10) || 1);

  const where = {};
  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
    ];
  } else if (view === 'online') {
    where.lastSeen = { gte: new Date(Date.now() - 10 * 60 * 1000) };
  }

  const [people, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: view === 'online' && !q ? { lastSeen: 'desc' } : { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (p) =>
    `/browse?${new URLSearchParams({ ...(q ? { q } : { view }), page: String(p) }).toString()}`;

  return (
    <div>
      <div className="tabs">
        <Link href="/browse" className={!q && view === 'new' ? 'on' : ''}>Newest members</Link>
        <Link href="/browse?view=online" className={!q && view === 'online' ? 'on' : ''}>Online now</Link>
        {q && <Link href={`/browse?q=${encodeURIComponent(q)}`} className="on">Results for &ldquo;{q}&rdquo;</Link>}
      </div>
      <div className="box">
        <div className="box-h">
          {q ? `Search: ${q}` : view === 'online' ? 'Online now' : 'Newest members'}
          <span className="right muted">{total.toLocaleString()} found</span>
        </div>
        {people.length === 0 ? (
          <div className="box-b muted">Nobody found. Try another search.</div>
        ) : (
          <div className="people-grid">
            {people.map((u) => (
              <div key={u.id}>
                <FriendTile user={u} />
                {u.location && <div className="small muted" style={{ textAlign: 'center', marginTop: 4 }}>{u.location}</div>}
              </div>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="pager">
            {page > 1 && <Link href={link(page - 1)}>&laquo; Prev</Link>}
            <span className="muted">Page {page} of {pages}</span>
            {page < pages && <Link href={link(page + 1)}>Next &raquo;</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
