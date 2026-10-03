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
import NotificationToggle from '@/components/NotificationToggle';
import { vapidPublicKey } from '@/lib/push';
import { weeklySurvey } from '@/lib/surveys';
import { birthdaysToday, isBirthdayToday } from '@/lib/birthdays';
import { hiddenUserIds } from '@/lib/moderation';
import { Pic } from '@/components/Avatar';
import { currentChampion } from '@/lib/potw';
import { trendingTags, unseenMentionCount } from '@/lib/mentions';

export const metadata = { title: 'Feed | BFRENZ.com' };

export default async function HomePage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const friendIds = await getFriendIds(me.id);

  const beforeRaw = sp?.before ? new Date(String(sp.before)) : null;
  const before = beforeRaw && !isNaN(beforeRaw) ? beforeRaw : null;
  const weekly = weeklySurvey();
  const [unread, pending, feed, sponsored, tookWeekly, bdays, champ, trending, mentions] = await Promise.all([
    prisma.message.count({ where: { recipientId: me.id, read: false, recipientDeleted: false } }),
    prisma.friendship.count({ where: { addresseeId: me.id, status: 'PENDING' } }),
    getFeed(me, before),
    before ? [] : bulletinsFor(me.id, friendIds, 0).then((list) => list.filter((b) => b._sponsored)),
    before ? true : prisma.surveyAnswer.count({ where: { userId: me.id, surveySlug: weekly.slug } }),
    before
      ? []
      : hiddenUserIds(me.id).then((hidden) => birthdaysToday(friendIds.filter((id) => !hidden.includes(id)))),
    before ? null : currentChampion().catch(() => null),
    before ? [] : trendingTags(8).catch(() => []),
    unseenMentionCount(me.id).catch(() => 0),
  ]);
  const myBirthday = !before && isBirthdayToday(me);

  return (
    <>
    {sp?.reset && <div className="notice ok">Your password was changed. You&apos;re logged in.</div>}
    <div className="feed-page">
      <div className="feed-top">
        <h1>News Feed</h1>
        <div className="actions">
          {unread > 0 && <Link href="/mail" className="btn small-btn alert-chip">&#9993; {unread} new</Link>}
          {pending > 0 && <Link href="/requests" className="btn small-btn alert-chip">&#9733; {pending} {pending === 1 ? 'request' : 'requests'}</Link>}
          {mentions > 0 && <Link href="/mentions" className="btn small-btn alert-chip">@ {mentions} {mentions === 1 ? 'mention' : 'mentions'}</Link>}
          <Link href="/dashboard" className="btn ghost small-btn">&#9776; Dashboard</Link>
        </div>
      </div>
        <Notice sp={sp} />
        {sp?.posted && <div className="notice ok">Posted!</div>}
        {!before && <NotificationToggle publicKey={vapidPublicKey()} compact />}
        {!before && (
          <PostComposer
            key={String(Date.now())}
            me={{ name: me.displayName, pic: me.avatarUrl || '/no-pic.svg' }}
            videoMaxMb={videoMaxMb()}
            creator={!!me.creatorType}
          />
        )}

        {trending.length > 0 && (
          <div className="trending-strip">
            <span className="small muted">🔥 Trending</span>
            {trending.map((t) => <Link key={t.tag} href={`/tag/${t.tag}`} className="tag-chip">#{t.tag}</Link>)}
          </div>
        )}

        {champ && (
          <div className="box feed-item potw-card">
            <Link href={`/${champ.user.username}`}><Pic user={champ.user} size={52} /></Link>
            <span>
              <span className="small potw-kicker">🏆 Profile of the Week</span>
              <b><Link href={`/${champ.user.username}`}>{champ.user.displayName}</Link></b>
              <span className="small muted">{champ.userId === me.id ? "That's you! Everyone sees your page here all week 👑" : <>Check out their page, then <Link href="/potw">vote for this week&apos;s</Link>.</>}</span>
            </span>
            <Link href={`/${champ.user.username}`} className="btn small-btn">Visit</Link>
          </div>
        )}
        {myBirthday && (
          <div className="box feed-item bday-card bday-me">
            <span className="bday-emoji">🎉</span>
            <span>
              <b>Happy birthday, {me.displayName}!</b>
              <span className="small muted">From everyone at BFRENZ. Check your page for birthday comments 🎂</span>
            </span>
            <Link href={`/${me.username}#comments`} className="btn small-btn">My page</Link>
          </div>
        )}
        {bdays.map((u) => (
          <div key={u.id} className="box feed-item bday-card">
            <Link href={`/${u.username}`}><Pic user={u} size={48} /></Link>
            <span>
              <b>🎂 It&apos;s <Link href={`/${u.username}`}>{u.displayName}</Link>&apos;s birthday today!</b>
              <span className="small muted">Leave them some birthday love.</span>
            </span>
            <Link href={`/${u.username}?bday=1#add-comment`} className="btn small-btn">Wish them HBD</Link>
          </div>
        ))}

        {!tookWeekly && (
          <Link href={`/surveys/${weekly.slug}`} className="box feed-item survey-prompt">
            <span className="survey-emoji">{weekly.emoji}</span>
            <span>
              <b>This week&apos;s survey: {weekly.title}</b>
              <span className="small muted">{weekly.blurb}</span>
            </span>
            <span className="btn small-btn">Take it</span>
          </Link>
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
