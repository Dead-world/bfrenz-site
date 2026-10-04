import Link from 'next/link';
import { after } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDate, timeAgo } from '@/lib/util';
import AlertsSeen from '@/components/AlertsSeen';

export const metadata = { title: 'Notifications | BFRENZ.com', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Splits "👍 Maya liked your post" into its emoji and the words. */
function split(title) {
  const m = /^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*|↩︎|@)\s*(.*)$/u.exec(title);
  return m ? [m[1], m[2]] : ['🔔', title];
}

function day(d) {
  const t = new Date(d);
  const today = new Date();
  const y = new Date(Date.now() - 86400000);
  if (t.toDateString() === today.toDateString()) return 'Today';
  if (t.toDateString() === y.toDateString()) return 'Yesterday';
  return t.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default async function NotificationsPage() {
  const me = await requireUser();
  const list = await prisma.alert.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  const unseen = list.filter((a) => !a.seen).length;
  // Mark them read once the page is on its way, and tidy up anything older than 60 days.
  after(async () => {
    if (unseen) await prisma.alert.updateMany({ where: { userId: me.id, seen: false }, data: { seen: true } });
    if (Math.random() < 0.1) await prisma.alert.deleteMany({ where: { userId: me.id, createdAt: { lt: new Date(Date.now() - 60 * 86400000) } } });
  });

  const groups = [];
  for (const a of list) {
    const label = day(a.createdAt);
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(a);
  }

  return (
    <div className="alerts-page">
      <AlertsSeen />
      <div className="feed-top">
        <h1>🔔 Notifications</h1>
        <Link href="/mentions" className="btn ghost small-btn">@ Mentions</Link>
      </div>
      {list.length === 0 ? (
        <div className="box box-b muted">Nothing yet. When someone likes, comments, adds you or mentions you, it shows up here.</div>
      ) : (
        groups.map((g) => (
          <section key={g.label} className="alerts-day">
            <div className="alerts-day-h">{g.label}</div>
            <div className="box alerts-list">
              {g.items.map((a) => {
                const [emoji, words] = split(a.title);
                return (
                  <Link key={a.id} href={a.url || '/home'} className={`alert-row${a.seen ? '' : ' new'}`}>
                    <span className="alert-emoji">{emoji}</span>
                    <span className="alert-text">
                      <b>{words}</b>
                      {a.body && <span className="small muted">{a.body}</span>}
                      <time className="small muted" dateTime={a.createdAt.toISOString()} title={fmtDate(a.createdAt)}>{timeAgo(a.createdAt)}</time>
                    </span>
                    {!a.seen && <i className="alert-dot" aria-label="New" />}
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
