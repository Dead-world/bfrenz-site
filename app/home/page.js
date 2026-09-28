import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFriendIds, getTop8 } from '@/lib/friends';
import { Pic, FriendTile } from '@/components/Avatar';
import { fmtDate, SITE_DOMAIN } from '@/lib/util';

export const metadata = { title: 'Home | BFRENZ.com' };

export default async function HomePage() {
  const me = await requireUser();
  const friendIds = await getFriendIds(me.id);

  const [unread, pending, bulletins, top8, coolNew, commentCount] = await Promise.all([
    prisma.message.count({ where: { recipientId: me.id, read: false, recipientDeleted: false } }),
    prisma.friendship.count({ where: { addresseeId: me.id, status: 'PENDING' } }),
    prisma.bulletin.findMany({
      where: { authorId: { in: [me.id, ...friendIds] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { author: true },
    }),
    getTop8(me.id),
    prisma.user.findMany({ where: { id: { not: me.id } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.comment.count({ where: { profileId: me.id } }),
  ]);

  return (
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
              <Link href="/mail/compose">Compose</Link>
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
              ? 'No one else yet — invite your frenz!'
              : coolNew.map((u) => (
                  <div key={u.id} style={{ marginBottom: 3 }}>
                    <Link href={`/${u.username}`}>{u.displayName}</Link>{' '}
                    <span className="muted">{u.location}</span>
                  </div>
                ))}
            <div style={{ marginTop: 6 }}>
              <Link href="/browse">Browse everyone &raquo;</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="col-right">
        <div className="box">
          <div className="box-h">
            My Bulletin Space
            <Link href="/bulletins?post=1" className="right">+ Post bulletin</Link>
          </div>
          {bulletins.length === 0 ? (
            <div className="box-b small">
              No bulletins yet. Add some frenz or <Link href="/bulletins?post=1">post the first one</Link>!
            </div>
          ) : (
            <table className="list">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Date</th>
                  <th>Bulletin</th>
                </tr>
              </thead>
              <tbody>
                {bulletins.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/${b.author.username}`}>{b.author.displayName}</Link>
                    </td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(b.createdAt)}</td>
                    <td>
                      <Link href={`/bulletins/${b.id}`}>{b.subject}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="small" style={{ padding: 6, textAlign: 'right' }}>
            <Link href="/bulletins">View all bulletins</Link>
          </div>
        </div>

        <div className="box">
          <div className="box-h">{me.displayName}&apos;s Friend Space</div>
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
      </div>
    </div>
  );
}
