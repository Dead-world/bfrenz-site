import Link from 'next/link';
import { supportButtons } from '@/lib/support';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { creatorLabel, displayLinks } from '@/lib/creators';

export const metadata = { title: 'Creator stats | BFRENZ.com', robots: { index: false } };

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (d) => new Date(d).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });

export default async function CreatorStatsPage() {
  const me = await requireUser();
  if (!me.creatorType) redirect('/edit?tab=creator');
  const since30 = new Date(Date.now() - 30 * DAY);
  const since14 = new Date(Date.now() - 14 * DAY);

  const [followers, newFollowers, clicks, recentClicks, recentFollows, visitors, posts] = await Promise.all([
    prisma.follow.count({ where: { followingId: me.id } }),
    prisma.follow.count({ where: { followingId: me.id, createdAt: { gte: since30 } } }),
    prisma.linkClick.groupBy({ by: ['label'], where: { ownerId: me.id, createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.linkClick.findMany({ where: { ownerId: me.id, createdAt: { gte: since14 } }, select: { createdAt: true } }),
    prisma.follow.findMany({ where: { followingId: me.id, createdAt: { gte: since14 } }, select: { createdAt: true } }),
    prisma.profileVisit.count({ where: { profileId: me.id, at: { gte: since30 } } }),
    prisma.post.findMany({
      where: { authorId: me.id, createdAt: { gte: since30 } },
      select: { id: true, body: true, visibility: true, createdAt: true, _count: { select: { kudos: true, comments: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  const totalClicks = clicks.reduce((n, c) => n + c._count._all, 0);
  const days = [];
  for (let i = 13; i >= 0; i--) days.push({ key: dayKey(Date.now() - i * DAY), clicks: 0, follows: 0 });
  for (const c of recentClicks) { const d = days.find((x) => x.key === dayKey(c.createdAt)); if (d) d.clicks++; }
  for (const f of recentFollows) { const d = days.find((x) => x.key === dayKey(f.createdAt)); if (d) d.follows++; }
  const max = Math.max(1, ...days.map((d) => d.clicks + d.follows));
  const top = [...posts].sort((a, b) => b._count.kudos + b._count.comments - (a._count.kudos + a._count.comments)).slice(0, 5);
  const lab = creatorLabel(me.creatorType);
  const links = displayLinks(me);

  return (
    <div className="creator-stats">
      <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h1 className="bigname" style={{ margin: 0 }}>📊 Your creator stats</h1>
        <div className="actions">
          <span className="creator-tag">{lab.emoji} {lab.label}</span>
          <Link href="/edit?tab=creator" className="btn ghost small-btn">Settings</Link>
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>Last 30 days. Only you can see this page.</p>

      <div className="stat-row">
        <div className="stat"><b>{followers.toLocaleString()}</b><span>followers</span></div>
        <div className="stat"><b>+{newFollowers.toLocaleString()}</b><span>new followers</span></div>
        <div className="stat"><b>{totalClicks.toLocaleString()}</b><span>link clicks</span></div>
        <div className="stat"><b>{me.profileViews.toLocaleString()}</b><span>profile views (all time)</span></div>
        <div className="stat"><b>{visitors.toLocaleString()}</b><span>members who visited</span></div>
      </div>

      <div className="box">
        <div className="box-h">Last 14 days <span className="right small"><span className="key-clicks">■</span> link clicks <span className="key-follows">■</span> new followers</span></div>
        <div className="growth-bars">
          {days.map((d) => (
            <div key={d.key} className="growth-bar" title={`${d.key}: ${d.clicks} clicks, ${d.follows} follows`}>
              <span className="growth-n small">{d.clicks + d.follows || ''}</span>
              <i className="bar-follows" style={{ height: `${(d.follows / max) * 100}%` }} />
              <i style={{ height: `${Math.max(2, (d.clicks / max) * 100)}%` }} />
              <span className="growth-day">{d.key.replace(/^\w+ /, '')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cols">
        <div className="col-left">
          <div className="box">
            <div className="box-h">Clicks by link</div>
            {links.length === 0 ? (
              <div className="box-b small muted">No links yet. <Link href="/edit?tab=creator">Add your links</Link>.</div>
            ) : (
              <table className="list growth-table">
                <thead><tr><th>Link</th><th>Clicks</th></tr></thead>
                <tbody>
                  {links.map((l) => (
                    <tr key={l.i}><td>{l.emoji} {l.text}</td><td>{clicks.find((c) => c.label === l.text)?._count._all || 0}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="box">
            <div className="box-h">💸 Support button taps <span className="right small muted">30 days</span></div>
            {supportButtons(me).length === 0 ? (
              <div className="box-b small muted">No tip buttons yet. <Link href="/edit?tab=creator#support">Add Cash App, Venmo, PayPal…</Link> and fans can support you from your page.</div>
            ) : (
              <table className="list growth-table">
                <thead><tr><th>App</th><th>Taps</th></tr></thead>
                <tbody>
                  {supportButtons(me).map((b) => (
                    <tr key={b.kind}><td>{b.emoji} {b.label}</td><td>{clicks.find((c) => c.label === `💸 ${b.label}`)?._count._all || 0}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="box-b small muted" style={{ paddingTop: 6 }}>Taps show interest; the actual tips arrive in each app.</div>
          </div>
        </div>
        <div className="col-right">
          <div className="box">
            <div className="box-h">Top posts</div>
            {top.length === 0 ? (
              <div className="box-b small muted">No posts in the last 30 days. <Link href="/home">Post something</Link>, and make it 🌍 Public so all your followers see it.</div>
            ) : (
              <table className="list growth-table">
                <thead><tr><th>Post</th><th>★</th><th>💬</th></tr></thead>
                <tbody>
                  {top.map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/post/${p.id}`}>{p.visibility === 'public' ? '🌍 ' : '👥 '}{(p.body || 'Photo / video / song').slice(0, 70)}</Link></td>
                      <td>{p._count.kudos}</td><td>{p._count.comments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <p className="small muted">Tip: put <b>bfrenz.com/{me.username}</b> in your bio on every app. Fans who tap it land on your page and can follow you in one tap.</p>
    </div>
  );
}
