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
import Notice from '@/components/Notice';
import { birthdaysToday, upcomingBirthdays, birthdayLabel } from '@/lib/birthdays';
import { hiddenUserIds } from '@/lib/moderation';

export const metadata = { title: 'Dashboard | BFRENZ.com', robots: { index: false } };

export default async function DashboardPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const friendIds = await getFriendIds(me.id);

  const hidden = await hiddenUserIds(me.id);
  const visibleFrenz = friendIds.filter((id) => !hidden.includes(id));
  const [unread, pending, bulletins, top8, coolNew, commentCount, bdayToday, bdaySoon, inTopOf] = await Promise.all([
    prisma.message.count({ where: { recipientId: me.id, read: false, recipientDeleted: false } }),
    prisma.friendship.count({ where: { addresseeId: me.id, status: 'PENDING' } }),
    bulletinsFor(me.id, friendIds, 10),
    getTop8(me.id, topFriendLimit(me)),
    coolNewPeople(5, me.id),
    prisma.comment.count({ where: { profileId: me.id } }),
    birthdaysToday(visibleFrenz),
    upcomingBirthdays(visibleFrenz, 7),
    prisma.topFriend.findMany({
      where: { friendId: me.id, user: { bannedAt: null }, ...(hidden.length ? { userId: { notIn: hidden } } : {}) },
      orderBy: { position: 'asc' },
      take: 30,
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    }),
  ]);

  return (
    <>
    {sp?.reset && <div className="notice ok">Your password was changed. You&apos;re logged in.</div>}
    <div className="cols">
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
                <Link href={`/${me.username}/blog`}>My Blog</Link> | <Link href="/groups">Groups</Link>
                <br />
                <Link href="/potw">🏆 Profile of the Week</Link>
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
              Profile views: <b>{me.profileViews.toLocaleString()}</b> &middot; <Link href="/visitors">Who&apos;s been creeping? 👀</Link>
              <br />
              Friends: <b>{friendIds.length}</b> &middot; Comments: <b>{commentCount}</b>
            </div>
          </div>
        </div>

        {(bdayToday.length > 0 || bdaySoon.length > 0) && (
          <div className="box">
            <div className="box-h">🎂 Birthdays</div>
            <div className="box-b small bday-list">
              {bdayToday.map((u) => (
                <div key={u.id}>
                  <b><Link href={`/${u.username}`}>{u.displayName}</Link></b> is celebrating today!{' '}
                  <Link href={`/${u.username}?bday=1#add-comment`}>Wish them HBD &raquo;</Link>
                </div>
              ))}
              {bdaySoon.map((u) => (
                <div key={u.id}>
                  <Link href={`/${u.username}`}>{u.displayName}</Link>{' '}
                  <span className="muted">{birthdayLabel(u)} · {u.inDays === 1 ? 'tomorrow' : `in ${u.inDays} days`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="box">
          <div className="box-h">Who has me in their Top 8</div>
          <div className="box-b small">
            {inTopOf.length === 0 ? (
              <span className="muted">Nobody yet. Leave some comments and earn your spot 😉</span>
            ) : (
              <div className="in-top-of">
                {inTopOf.map((t) => (
                  <Link key={t.id} href={`/${t.user.username}#top8`} className="in-top-chip" title={`#${t.position} in ${t.user.displayName}'s Top 8`}>
                    <Pic user={t.user} size={28} />
                    <span>{t.user.displayName}</span>
                    <b className={t.position === 1 ? 'crown' : ''}>{t.position === 1 ? '👑 #1' : `#${t.position}`}</b>
                  </Link>
                ))}
              </div>
            )}
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
        <FeaturedMusic />
      </div>

      <div className="col-right">
        <div className="actions dash-top">
          <Link href="/home" className="btn small-btn">&larr; News Feed</Link>
          <Link href="/bulletins?post=1" className="btn ghost small-btn">+ Post bulletin</Link>
        </div>
        <div className="box">
          <div className="box-h">
            My Bulletin Space
            <Link href="/bulletins" className="right">View all</Link>
          </div>
          {bulletins.length === 0 ? (
            <div className="box-b small">
              No bulletins yet. <Link href="/bulletins?post=1">Post the first one</Link>!
            </div>
          ) : (
            <table className="list">
              <thead>
                <tr><th>From</th><th>Date</th><th>Bulletin</th></tr>
              </thead>
              <tbody>
                {bulletins.map((b) => (
                  <tr key={b.id}>
                    <td><Link href={`/${b.author.username}`}>{b.author.displayName}</Link></td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(b.createdAt)}</td>
                    <td>
                      {b._sponsored && <span className="sponsored-tag">Sponsored</span>}
                      <Link href={`/bulletins/${b.id}`}>{b.subject}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="box">
          <div className="box-h">
            {me.displayName}&apos;s Friend Space
            <Link href="/edit/top8" className="right">Change Top {topFriendLimit(me)}</Link>
          </div>
          <div className="friend-count">
            You have <span className="red">{friendIds.length}</span> {friendIds.length === 1 ? 'friend' : 'friends'}.
          </div>
          {top8.length > 0 ? (
            <div className="top8">
              {top8.map((f) => (
                <FriendTile key={f.id} user={f} />
              ))}
            </div>
          ) : (
            <div className="box-b small">
              No frenz yet! <Link href="/browse">Go find some</Link>.
            </div>
          )}
        </div>
        {!isSupporter(me) && <AdSlot />}
      </div>
    </div>
    </>
  );
}
