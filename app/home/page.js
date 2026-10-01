import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFriendIds, getTop8 } from '@/lib/friends';
import { Pic, FriendTile } from '@/components/Avatar';
import { fmtDate, SITE_DOMAIN } from '@/lib/util';
import { topFriendLimit, isSupporter } from '@/lib/perks';
import { coolNewPeople, bulletinsFor } from '@/lib/featured';
import FeaturedMusic from '@/components/FeaturedMusic';
import AdSlot from '@/components/AdSlot';
import Badges from '@/components/Badges';
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
  const [unread, pending, feed, sponsored, top8, coolNew, commentCount] = await Promise.all([
    prisma.message.count({ where: { recipientId: me.id, read: false, recipientDeleted: false } }),
    prisma.friendship.count({ where: { addresseeId: me.id, status: 'PENDING' } }),
    getFeed(me, before),
    before ? [] : bulletinsFor(me.id, friendIds, 0).then((list) => list.filter((b) => b._sponsored)),
    getTop8(me.id, topFriendLimit(me)),
    coolNewPeople(5, me.id),
    prisma.comment.count({ where: { profileId: me.id } }),
  ]);

  return (
    <>
    {sp?.reset && <div className="notice ok">Your password was changed. You&apos;re logged in.</div>}
    <div className="cols home-cols">
      <div className="col-left">
        <div className="box">
          <div className="box-b">
            <div className="bigname">Hello, {me.displayName}!</div>
            <div className="profile-head">
              <Pic user={me} size={110} />
              <div className="small" style={{ lineHeight: 1.8 }}>
                <b>View My:</b>
                <br />
                <Link href={`/${me.username}`}>Profile</Link> |{' '}
                <Link href={`/${me.username}/photos`}>Pics</Link>
                <br />
                <Link href={`/${me.username}/friends`}>Friends</Link> |{' '}
                <Link href="/bulletins">Bulletins</Link>
                <br />
                <Link href="/edit">Edit Profile</Link>
                <br />
                <Link href="/edit/top8">Change Top 8</Link>
                <br />
                <Link href="/invite"><b>Invite frenz</b></Link>
              </div>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              <b>My URL:</b>{' '}
              <Link href={`/${me.username}`}>
                {SITE_DOMAIN}/{me.username}
              </Link>
            </div>
          </div>
        </div>

        <div className="box orange">
          <div className="box-h orange">My Mail &amp; Alerts</div>
          <div className="box-b">
            {unread > 0 && (
              <div className="alert-box">
                <Link href="/mail">&#9993; New Messages! ({unread})</Link>
              </div>
            )}
            {pending > 0 && (
              <div className="alert-box">
                <Link href="/requests">&#9733; New Friend Requests! ({pending})</Link>
              </div>
            )}
            <div className="small" style={{ lineHeight: 1.8 }}>
              <Link href="/mail">Inbox</Link> | <Link href="/mail/sent">Sent</Link> |{' '}
              <Link href="/mail/compose">Compose</Link> | <Link href="/bulletins">Bulletins</Link>
              <br />
              Profile views: <b>{me.profileViews.toLocaleString()}</b>
              <br />
              Friends: <b>{friendIds.length}</b> &middot; Comments: <b>{commentCount}</b>
            </div>
          </div>
        </div>

        <div className="box">
          <div className="box-h">Cool New People</div>
          <div className="box-b small">
            {coolNew.length === 0
              ? <>No one else yet — <Link href="/invite">invite your frenz</Link>!</>
              : coolNew.map((u) => (
                  <div key={u.id} style={{ marginBottom: 3 }}>
                    {u._featured && <span className="sponsored-tag">Featured</span>}
                    <Link href={`/${u.username}`}>{u.displayName}</Link>
                    <Badges user={u} />{' '}
                    <span className="muted">{u.location}</span>
                  </div>
                ))}
            <div style={{ marginTop: 6 }}>
              <Link href="/browse">Browse everyone &raquo;</Link>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-h">
            My Friend Space
            <Link href={`/${me.username}/friends`} className="right small">All ({friendIds.length})</Link>
          </div>
          {top8.length > 0 ? (
            <div className="top8 top8-compact">
              {top8.map((f) => (
                <FriendTile key={f.id} user={f} size={60} />
              ))}
            </div>
          ) : (
            <div className="box-b small">
              No frenz yet! <Link href="/browse">Go find some</Link>.
            </div>
          )}
        </div>
        <FeaturedMusic />
      </div>

      <div className="col-right">
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
    </div>
    </>
  );
}
