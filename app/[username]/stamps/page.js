import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hiddenUserIds, isAdmin, isBlockedEither } from '@/lib/moderation';
import { stampCollection } from '@/lib/stampsDb';
import { removeStamp } from '@/app/actions/stamps';
import { STAMPS } from '@/lib/stamps';
import StampCard from '@/components/StampCard';
import { Pic } from '@/components/Avatar';
import Notice from '@/components/Notice';
import { timeAgo } from '@/lib/util';

export async function generateMetadata({ params }) {
  const { username } = await params;
  const u = await prisma.user.findUnique({ where: { username: String(username).toLowerCase() } });
  if (!u || u.bannedAt) return { title: 'Not found | BFRENZ.com', robots: { index: false } };
  return { title: `${u.displayName}'s Stamp Collection | BFRENZ.com`, robots: { index: false } };
}

export default async function StampCollectionPage({ params, searchParams }) {
  const { username } = await params;
  const sp = await searchParams;
  const user = await prisma.user.findUnique({ where: { username: String(username).toLowerCase() } });
  const me = await getCurrentUser();
  if (!user || (user.bannedAt && !isAdmin(me))) notFound();
  if (me && me.id !== user.id && !isAdmin(me) && (await isBlockedEither(me.id, user.id))) notFound();
  const isMe = me?.id === user.id;
  const hidden = me ? await hiddenUserIds(me.id) : [];
  const items = await stampCollection(user.id, hidden);
  const total = items.reduce((n, i) => n + i.count, 0);

  return (
    <div className="stamps-page">
      <div className="small"><Link href={`/${user.username}`}>&laquo; Back to {isMe ? 'my' : `${user.displayName}'s`} page</Link></div>
      <div className="give-head">
        <Pic user={user} size={56} />
        <div>
          <h1 className="bigname" style={{ margin: 0 }}>{user.displayName}&apos;s Stamp Collection</h1>
          <div className="small muted">{items.length} of {STAMPS.length} different stamps · {total} total</div>
        </div>
        {me && !isMe && <Link href={`/stamps/give?to=${user.username}`} className="btn small-btn" style={{ marginLeft: 'auto' }}>🎟️ Give a stamp</Link>}
      </div>
      <Notice sp={sp} />
      {sp?.removed && <div className="notice ok">Stamp removed.</div>}

      {items.length === 0 ? (
        <div className="box"><div className="box-b">
          No stamps yet. {isMe ? <>Give some to your frenz and they might return the favor 😉 <Link href="/stamps">See all stamps</Link></> : null}
        </div></div>
      ) : (
        <div className="box">
          <div className="stamp-grid">
            {items.map((i) => (
              <StampCard key={i.stamp.slug} stamp={i.stamp} count={i.count}>
                <span className="small muted stamp-from">
                  from {i.givers.slice(0, 3).map((g, n) => (
                    <span key={g.id}>{n > 0 && ', '}<Link href={`/${g.username}`}>{g.displayName}</Link></span>
                  ))}
                  {i.givers.length > 3 && ` +${i.givers.length - 3} more`}
                </span>
                {i.notes.slice(0, 2).map((n) => (
                  <span key={n.id} className="small stamp-note">&ldquo;{n.note}&rdquo; <span className="muted">· {n.from.displayName}, {timeAgo(n.at)}</span></span>
                ))}
                {isMe && (
                  <form action={removeStamp}>
                    <input type="hidden" name="stamp" value={i.stamp.slug} />
                    <button type="submit" className="linkbtn small muted" title="Removes every copy of this stamp from your page">Remove</button>
                  </form>
                )}
              </StampCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
