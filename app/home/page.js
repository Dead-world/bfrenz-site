import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFriendIds } from '@/lib/friends';
import { isSupporter } from '@/lib/perks';
import { bulletinsFor } from '@/lib/featured';
import AdSlot from '@/components/AdSlot';
import PostComposer from '@/components/PostComposer';
import FeedItem from '@/components/FeedItem';
import Notice from '@/components/Notice';
import { getFeed } from '@/lib/feed';
import { isAdmin } from '@/lib/moderation';
import { videoMaxMb } from '@/lib/video';

export const metadata = { title: 'Home | BFRENZ.com' };

export default async function HomePage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const friendIds = await getFriendIds(me.id);

  const beforeRaw = sp?.before ? new Date(String(sp.before)) : null;
  const before = beforeRaw && !isNaN(beforeRaw) ? beforeRaw : null;
  const [unread, pending, feed, sponsored] = await Promise.all([
    prisma.message.count({ where: { recipientId: me.id, read: false, recipientDeleted: false } }),
    prisma.friendship.count({ where: { addresseeId: me.id, status: 'PENDING' } }),
    getFeed(me, before),
    before ? [] : bulletinsFor(me.id, friendIds, 0).then((list) => list.filter((b) => b._sponsored)),
  ]);

  return (
    <>
    {sp?.reset && <div className="notice ok">Your password was changed. You&apos;re logged in.</div>}
    <div className="feed-page">
      <div className="feed-top">
        <h1>News Feed</h1>
        <div className="actions">
          {unread > 0 && <Link href="/mail" className="btn small-btn alert-chip">&#9993; {unread} new</Link>}
          {pending > 0 && <Link href="/requests" className="btn small-btn alert-chip">&#9733; {pending} {pending === 1 ? 'request' : 'requests'}</Link>}
          <Link href="/dashboard" className="btn ghost small-btn">&#9776; Dashboard</Link>
        </div>
      </div>
        <Notice sp={sp} />
        {sp?.posted && <div className="notice ok">Posted!</div>}
        {!before && (
          <PostComposer
            key={String(Date.now())}
            me={{ name: me.displayName, pic: me.avatarUrl || '/no-pic.svg' }}
            videoMaxMb={videoMaxMb()}
          />
        )}

        {sponsored.map((b) => (
          <div key={b.id} className="box feed-item feed-event">
            <div className="feed-bulletin" style={{ padding: '12px 16px' }}>
              <span className="sponsored-tag">Sponsored</span>
              <Link href={`/bulletins/${b.id}`}><b>{b.subject}</b></Link>
              <span className="small muted"> from <Link href={`/${b.author.username}`}>{b.author.displayName}</Link></span>
            </div>
          </div>
        ))}

        {feed.items.length === 0 ? (
          <div className="box">
            <div className="box-b">
              {before ? (
                <>That&apos;s everything! <Link href="/home">Back to the top</Link></>
              ) : friendIds.length === 0 ? (
                <>Your feed is empty because you don&apos;t have frenz yet. <Link href="/browse">Find some</Link> or{' '}
                <Link href="/invite">invite yours</Link>, then their posts, photos and songs show up here.</>
              ) : (
                <>Nothing here yet. Post something above to get it started!</>
              )}
            </div>
          </div>
        ) : (
          feed.items.map((item, i) => (
            <div key={item.id}>
              <FeedItem item={item} me={me} back={before ? `/home?before=${encodeURIComponent(before.toISOString())}` : '/home'} admin={isAdmin(me)} />
              {i === 4 && !isSupporter(me) && <AdSlot />}
            </div>
          ))
        )}
        {feed.next && (
          <div className="pager">
            <Link href={`/home?before=${encodeURIComponent(feed.next)}`}>Older posts &raquo;</Link>
          </div>
        )}
    </div>
    </>
  );
}
