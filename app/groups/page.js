import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { GROUP_CATEGORIES } from '@/lib/groups';
import Notice from '@/components/Notice';
import { timeAgo } from '@/lib/util';

export const metadata = {
  title: 'Groups | BFRENZ.com',
  description: 'Fan clubs, local scenes and hangouts. Find your people on BFRENZ.',
  alternates: { canonical: '/groups' },
};

function GroupTile({ g, mine }) {
  return (
    <Link href={`/groups/${g.slug}`} className="group-tile">
      <img src={g.avatarUrl || '/no-pic.svg'} alt="" width={56} height={56} className="pic" />
      <span className="group-tile-main">
        <b>{g.name}</b>
        <span className="small muted">
          {g.category} · {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
          {g.lastPostAt ? ` · active ${timeAgo(g.lastPostAt)}` : ''}
        </span>
        {g.description && <span className="small group-tile-desc">{g.description.slice(0, 110)}{g.description.length > 110 ? '…' : ''}</span>}
      </span>
      {mine && <span className="group-joined small">✓ Joined</span>}
    </Link>
  );
}

export default async function GroupsPage({ searchParams }) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const q = String(sp?.q || '').trim().slice(0, 60);
  const cat = GROUP_CATEGORIES.includes(String(sp?.cat || '')) ? String(sp.cat) : '';
  const filtered = !!(q || cat);
  const where = {
    owner: { bannedAt: null },
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
    ...(cat ? { category: cat } : {}),
  };

  const [mine, popular, fresh] = await Promise.all([
    me
      ? prisma.groupMember.findMany({ where: { userId: me.id, role: { not: 'banned' } }, include: { group: true }, orderBy: { joinedAt: 'desc' } })
      : [],
    prisma.group.findMany({ where, orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }], take: filtered ? 60 : 24 }),
    filtered ? [] : prisma.group.findMany({ where, orderBy: { createdAt: 'desc' }, take: 8 }),
  ]);
  const joined = new Set(mine.map((m) => m.groupId));

  return (
    <div className="groups-page">
      <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 className="bigname" style={{ margin: 0 }}>Groups 👥</h1>
        <Link href={me ? '/groups/new' : '/signup'} className="btn small-btn">+ Start a group</Link>
      </div>
      <Notice sp={sp} />
      {sp?.deleted && <div className="notice ok">Group deleted.</div>}

      <form className="group-search box" action="/groups">
        <div className="box-b actions">
          <input type="search" name="q" defaultValue={q} placeholder="Find a group…" aria-label="Search groups" />
          <select name="cat" defaultValue={cat} aria-label="Category">
            <option value="">All categories</option>
            {GROUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn small-btn">Search</button>
          {filtered && <Link href="/groups" className="small">Clear</Link>}
        </div>
      </form>

      {mine.length > 0 && !filtered && (
        <section className="box">
          <div className="box-h">My groups</div>
          <div className="group-grid">
            {mine.map((m) => <GroupTile key={m.id} g={m.group} />)}
          </div>
        </section>
      )}

      <section className="box">
        <div className="box-h">{filtered ? `Results (${popular.length})` : 'Popular groups'}</div>
        {popular.length === 0 ? (
          <div className="box-b small muted">
            {filtered ? 'No groups match that.' : 'No groups yet.'}{' '}
            <Link href={me ? '/groups/new' : '/signup'}>Start the first one!</Link>
          </div>
        ) : (
          <div className="group-grid">
            {popular.map((g) => <GroupTile key={g.id} g={g} mine={joined.has(g.id)} />)}
          </div>
        )}
      </section>

      {fresh.length > 0 && (
        <section className="box">
          <div className="box-h">New groups</div>
          <div className="group-grid">
            {fresh.map((g) => <GroupTile key={g.id} g={g} mine={joined.has(g.id)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
