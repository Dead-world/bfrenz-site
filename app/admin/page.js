import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, reasonLabel, reportTarget } from '@/lib/moderation';
import { handleReport, banUser, unbanUser, giftPerk } from '@/app/actions/moderation';
import { fmtDate, fmtDay } from '@/lib/util';
import { Pic } from '@/components/Avatar';
import Notice from '@/components/Notice';

export const metadata = { title: 'Admin | BFRENZ.com', robots: { index: false } };

const TABS = [
  ['reports', 'Open reports'],
  ['closed', 'Closed reports'],
  ['members', 'Members'],
  ['banned', 'Banned'],
];

function BanForm({ user, back }) {
  return (
    <details className="ban-form">
      <summary className="linkbtn small">Ban @{user.username}…</summary>
      <form action={banUser} className="stack" style={{ marginTop: 8 }}>
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="back" value={back} />
        <input type="text" name="reason" maxLength={300} placeholder="Reason (only admins see this)" />
        <label className="small">
          <input type="checkbox" name="wipe" /> Also delete all their comments, bulletins, messages and photos
        </label>
        <div><button className="btn small-btn danger" type="submit">Ban member</button></div>
      </form>
    </details>
  );
}

function GiftForm({ user, back }) {
  return (
    <details className="gift-form">
      <summary className="linkbtn small">🎁 Gift…</summary>
      <form action={giftPerk} className="actions" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="back" value={back} />
        <select name="gift" defaultValue={user.songUrl ? 'song_boost' : 'feature'}>
          <option value="song_boost" disabled={!user.songUrl}>Featured Music{user.songUrl ? '' : ' (needs a song)'}</option>
          <option value="feature">Featured Profile</option>
          <option value="supporter">Supporter</option>
          <option value="pro_artist">Pro Artist badge (forever)</option>
        </select>
        <select name="days" defaultValue="7" aria-label="How long">
          <option value="7">7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
        </select>
        <button className="btn small-btn" type="submit">Give</button>
      </form>
    </details>
  );
}

export default async function AdminPage({ searchParams }) {
  const me = await requireUser();
  if (!isAdmin(me)) notFound();
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp?.tab) ? sp.tab : 'reports';
  const q = String(sp?.q || '').trim().slice(0, 60);
  const back = `/admin?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [members, newThisWeek, onlineNow, openReports, bannedCount] = await Promise.all([
    prisma.user.count({ where: { bannedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: week } } }),
    prisma.user.count({ where: { lastSeen: { gte: new Date(Date.now() - 10 * 60 * 1000) } } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.user.count({ where: { bannedAt: { not: null } } }),
  ]);

  let reports = [];
  let people = [];
  if (tab === 'reports' || tab === 'closed') {
    const rows = await prisma.report.findMany({
      where: tab === 'reports' ? { status: 'OPEN' } : { status: { not: 'OPEN' } },
      // Child-safety reports first, then oldest first so nothing waits too long.
      orderBy: tab === 'reports' ? { createdAt: 'asc' } : { resolvedAt: 'desc' },
      take: 50,
      include: { reporter: true },
    });
    rows.sort((a, b) => (tab === 'reports' ? (b.reason === 'child_safety') - (a.reason === 'child_safety') : 0));
    const targetUsers = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.targetUserId) } } });
    const byId = Object.fromEntries(targetUsers.map((u) => [u.id, u]));
    const counts = await prisma.report.groupBy({
      by: ['targetUserId'],
      where: { targetUserId: { in: targetUsers.map((u) => u.id) } },
      _count: { _all: true },
    });
    const countBy = Object.fromEntries(counts.map((c) => [c.targetUserId, c._count._all]));
    reports = await Promise.all(
      rows.map(async (r) => ({ ...r, target: await reportTarget(r), who: byId[r.targetUserId], whoReports: countBy[r.targetUserId] || 0 })),
    );
  } else {
    const where = tab === 'banned' ? { bannedAt: { not: null } } : {};
    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    people = await prisma.user.findMany({
      where,
      orderBy: tab === 'banned' ? { bannedAt: 'desc' } : { createdAt: 'desc' },
      take: 50,
    });
  }

  return (
    <div>
      <div className="shop-hero">
        <h1>Admin</h1>
        <p className="muted">Only admins can see this page.</p>
      </div>
      <Notice sp={sp} />
      {sp?.gifted && <div className="notice ok">Gift sent to @{String(sp.gifted)}. 🎁</div>}

      <div className="stat-row">
        <div className="stat"><b>{members.toLocaleString()}</b><span>members</span></div>
        <div className="stat"><b>{newThisWeek.toLocaleString()}</b><span>new this week</span></div>
        <div className="stat"><b>{onlineNow.toLocaleString()}</b><span>online now</span></div>
        <div className={`stat${openReports ? ' hot' : ''}`}><b>{openReports}</b><span>open reports</span></div>
        <div className="stat"><b>{bannedCount}</b><span>banned</span></div>
      </div>

      <div className="tabs">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin?tab=${k}`} className={tab === k ? 'on' : ''}>
            {label}{k === 'reports' && openReports ? ` (${openReports})` : ''}
          </Link>
        ))}
      </div>

      {(tab === 'reports' || tab === 'closed') && (
        <>
          {tab === 'reports' && (
            <p className="small muted">
              <b>Remove</b> deletes the reported thing and closes the report. <b>Dismiss</b> closes it and leaves it up.
              Reports about child sexual exploitation must also be reported to NCMEC at{' '}
              <a href="https://report.cybertip.org" target="_blank" rel="noopener noreferrer">report.cybertip.org</a>.
            </p>
          )}
          {reports.length === 0 && <div className="box"><div className="box-b muted">Nothing here. 🎉</div></div>}
          {reports.map((r) => (
            <div key={r.id} className={`box report-card${r.reason === 'child_safety' ? ' urgent' : ''}`}>
              <div className="box-h">
                {r.reason === 'child_safety' && <span className="sponsored-tag urgent-tag">Urgent</span>}
                {reasonLabel(r.reason)} &middot; {r.kind}
                <span className="right small muted">{fmtDate(r.createdAt)}</span>
              </div>
              <div className="box-b">
                <div className="report-meta small">
                  Posted by{' '}
                  {r.who ? (
                    <>
                      <Link href={`/${r.who.username}`}>@{r.who.username}</Link>
                      {r.who.bannedAt && <span className="muted"> (banned)</span>}
                      <span className="muted"> &middot; {r.whoReports} report{r.whoReports === 1 ? '' : 's'} total</span>
                    </>
                  ) : (
                    <span className="muted">a deleted account</span>
                  )}
                  {' '}&middot; reported by <Link href={`/${r.reporter.username}`}>@{r.reporter.username}</Link>
                </div>
                {r.details && <div className="report-details">&ldquo;{r.details}&rdquo;</div>}
                {r.target.exists ? (
                  <div className="report-content">
                    {r.target.image && r.reason !== 'child_safety' && (
                      <img src={r.target.image} alt="" loading="lazy" />
                    )}
                    <div>
                      {r.target.text || <span className="muted">(no text)</span>}
                      {r.target.link && (
                        <div className="small" style={{ marginTop: 6 }}>
                          <Link href={r.target.link}>View it on the site &raquo;</Link>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="small muted">This was already deleted.</div>
                )}
                {tab === 'reports' ? (
                  <div className="actions" style={{ marginTop: 12 }}>
                    {r.target.exists && (
                      <form action={handleReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="action" value="remove" />
                        <input type="hidden" name="back" value={back} />
                        <button className="btn small-btn" type="submit">
                          {r.kind === 'profile' ? 'Clear profile' : `Remove ${r.kind}`}
                        </button>
                      </form>
                    )}
                    <form action={handleReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value={r.target.exists ? 'dismiss' : 'remove'} />
                      <input type="hidden" name="back" value={back} />
                      <button className="btn ghost small-btn" type="submit">{r.target.exists ? 'Dismiss' : 'Close'}</button>
                    </form>
                    {r.who && !r.who.bannedAt && <BanForm user={r.who} back={back} />}
                  </div>
                ) : (
                  <div className="small muted" style={{ marginTop: 10 }}>
                    {r.status === 'RESOLVED' ? 'Removed' : 'Dismissed'} by @{r.resolvedBy}
                    {r.resolvedAt ? ` on ${fmtDay(r.resolvedAt)}` : ''}{r.note ? ` · ${r.note}` : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {(tab === 'members' || tab === 'banned') && (
        <div className="box">
          <div className="box-h">{tab === 'banned' ? 'Banned members' : 'Members'}</div>
          <form className="box-b actions" action="/admin">
            <input type="hidden" name="tab" value={tab} />
            <input type="text" name="q" defaultValue={q} placeholder="Username, name or email" style={{ flex: 1, minWidth: 200 }} />
            <button className="btn small-btn" type="submit">Search</button>
          </form>
          {people.length === 0 ? (
            <div className="box-b muted">Nobody found.</div>
          ) : (
            <table className="list admin-table">
              <tbody>
                {people.map((u) => (
                  <tr key={u.id}>
                    <td style={{ width: 52 }}><Pic user={u} size={40} /></td>
                    <td>
                      <Link href={`/${u.username}`}>{u.displayName}</Link> <span className="muted">@{u.username}</span>
                      <div className="small muted">{u.email} &middot; joined {fmtDay(u.createdAt)}</div>
                      <div className="small muted">
                        {u.isArtist && <>♫ Artist{u.genre ? ` (${u.genre})` : ''} · </>}
                        {u.songUrl ? 'has a song' : 'no song'}
                        {u.songBoostUntil && new Date(u.songBoostUntil) > new Date() && <> · Featured Music until {fmtDay(u.songBoostUntil)}</>}
                        {u.featuredUntil && new Date(u.featuredUntil) > new Date() && <> · Featured until {fmtDay(u.featuredUntil)}</>}
                      </div>
                      {u.bannedAt && (
                        <div className="small" style={{ color: '#ffb3b3' }}>
                          Banned {fmtDay(u.bannedAt)}{u.banReason ? `: ${u.banReason}` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.bannedAt ? (
                        <form action={unbanUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="back" value={back} />
                          <button className="btn ghost small-btn" type="submit">Unban</button>
                        </form>
                      ) : isAdmin(u) ? (
                        <div className="stack" style={{ justifyItems: 'end' }}>
                          <span className="small muted">admin</span>
                          <GiftForm user={u} back={back} />
                        </div>
                      ) : (
                        <div className="stack" style={{ justifyItems: 'end' }}>
                          <GiftForm user={u} back={back} />
                          <BanForm user={u} back={back} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
