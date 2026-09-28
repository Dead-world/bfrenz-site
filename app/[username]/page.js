import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { countFriends, getFriendship, getTop8 } from '@/lib/friends';
import { cleanCss, cleanHtml } from '@/lib/sanitize';
import { fmtDate, fmtDay, isOnline, SITE_DOMAIN } from '@/lib/util';
import { FriendTile, Pic } from '@/components/Avatar';
import SongPlayer from '@/components/SongPlayer';
import Notice from '@/components/Notice';
import { sendFriendRequest } from '@/app/actions/friends';
import { addComment, deleteComment } from '@/app/actions/comments';

async function loadUser(username) {
  return prisma.user.findUnique({ where: { username: String(username).toLowerCase() } });
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const user = await loadUser(username);
  if (!user) return { title: 'Not found | BFRENZ.com' };
  return {
    title: `${user.displayName}'s profile | BFRENZ.com`,
    description: user.headline || `${user.displayName} is on BFRENZ.com`,
  };
}

const INTERESTS = [
  ['General', 'interestsGeneral'],
  ['Music', 'interestsMusic'],
  ['Movies', 'interestsMovies'],
  ['Television', 'interestsTv'],
  ['Books', 'interestsBooks'],
  ['Heroes', 'interestsHeroes'],
];

export default async function ProfilePage({ params, searchParams }) {
  const { username } = await params;
  const sp = await searchParams;
  const user = await loadUser(username);
  if (!user) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === user.id;
  if (!isMe) {
    await prisma.user.update({ where: { id: user.id }, data: { profileViews: { increment: 1 } } });
  }

  const showAll = sp?.comments === 'all';
  const [top8, friendCount, comments, commentCount, friendship] = await Promise.all([
    getTop8(user.id),
    countFriends(user.id),
    prisma.comment.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: 'desc' },
      take: showAll ? 200 : 20,
      include: { author: true },
    }),
    prisma.comment.count({ where: { profileId: user.id } }),
    me && !isMe ? getFriendship(me.id, user.id) : null,
  ]);

  const isFriend = friendship?.status === 'ACCEPTED';
  const iRequested = friendship?.status === 'PENDING' && friendship.requesterId === me?.id;
  const theyRequested = friendship?.status === 'PENDING' && friendship.addresseeId === me?.id;
  const canComment = !!me && (isMe || isFriend);
  const back = `/${user.username}`;
  const interests = INTERESTS.filter(([, key]) => user[key]);

  return (
    <div className="profile-page">
      {user.customCss && <style dangerouslySetInnerHTML={{ __html: cleanCss(user.customCss) }} />}
      <Notice sp={sp} />
      {sp?.requested && <div className="notice ok">Friend request sent!</div>}

      <div className="cols">
        {/* ---------------- left column ---------------- */}
        <div className="col-left profile-left">
          <div className="box profile-card">
            <div className="box-b">
              <h1 className="bigname profile-name">{user.displayName}</h1>
              <div className="profile-head">
                <Pic user={user} size={150} />
                <div className="profile-facts">
                  {user.headline && <div className="headline">&ldquo;{user.headline}&rdquo;</div>}
                  {user.gender && <div>{user.gender}</div>}
                  {user.age && <div>{user.age} years old</div>}
                  {user.location && <div>{user.location}</div>}
                  <div style={{ marginTop: 6 }}>
                    {isOnline(user) ? (
                      <span className="online">Online now</span>
                    ) : (
                      <span className="small">
                        Last login: {user.lastSeen ? fmtDay(user.lastSeen) : 'never'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {user.mood && (
                <div className="mood">
                  <b>Mood:</b> {user.mood}
                </div>
              )}
              <div className="small muted" style={{ marginTop: 10 }}>
                <Link href={`/${user.username}/photos`}>View pics</Link> &middot;{' '}
                <Link href={`/${user.username}/friends`}>View friends</Link> &middot; {user.profileViews.toLocaleString()} views
              </div>
            </div>
          </div>

          {user.songUrl && <SongPlayer src={user.songUrl} title={user.songTitle} artist={user.songArtist} />}

          <div className="box orange contact-box">
            <div className="box-h orange">Contacting {user.displayName}</div>
            <div className="contact-grid">
              {isMe ? (
                <>
                  <Link href="/edit"><span className="ico">✎</span>Edit profile</Link>
                  <Link href="/edit/top8"><span className="ico">★</span>Edit Top 8</Link>
                  <Link href="/edit?tab=css"><span className="ico">◐</span>Customize</Link>
                  <Link href={`/${user.username}/photos`}><span className="ico">▣</span>My photos</Link>
                </>
              ) : (
                <>
                  <Link href={me ? `/mail/compose?to=${user.username}` : '/login'}>
                    <span className="ico">✉</span>Send message
                  </Link>
                  {isFriend ? (
                    <span><span className="ico">✓</span>Frenz</span>
                  ) : iRequested ? (
                    <span><span className="ico">…</span>Request sent</span>
                  ) : me ? (
                    <form action={sendFriendRequest}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="back" value={back} />
                      <button type="submit" className="linkbtn">
                        <span className="ico">+</span>
                        {theyRequested ? 'Accept request' : 'Add to friends'}
                      </button>
                    </form>
                  ) : (
                    <Link href="/login"><span className="ico">+</span>Add to friends</Link>
                  )}
                  <a href="#comments"><span className="ico">💬</span>Add comment</a>
                  <Link href={`/${user.username}/photos`}><span className="ico">▣</span>View photos</Link>
                </>
              )}
            </div>
          </div>

          <div className="box url-box">
            <b>{user.displayName}&apos;s URL:</b>
            <br />
            <Link href={`/${user.username}`}>
              {SITE_DOMAIN}/{user.username}
            </Link>
          </div>

          {interests.length > 0 && (
            <div className="box interests-box">
              <div className="box-h">{user.displayName}&apos;s Interests</div>
              <table className="interests">
                <tbody>
                  {interests.map(([label, key]) => (
                    <tr key={key}>
                      <td className="label">{label}</td>
                      <td className="val">{user[key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---------------- right column ---------------- */}
        <div className="col-right profile-right">
          {isFriend ? (
            <div className="extended-network">You and {user.displayName} are frenz!</div>
          ) : !isMe ? (
            <div className="extended-network">{user.displayName} is in your extended network</div>
          ) : null}

          <div className="box blurbs">
            <div className="box-h">{user.displayName}&apos;s Blurbs</div>
            <div className="box-b">
              <div className="blurb-title">About me</div>
              <div
                className="blurb"
                dangerouslySetInnerHTML={{
                  __html: user.aboutMe ? cleanHtml(user.aboutMe) : '<i>Nothing here yet.</i>',
                }}
              />
              {user.meet && (
                <>
                  <div className="blurb-title">Who I&apos;d like to meet</div>
                  <div className="blurb" dangerouslySetInnerHTML={{ __html: cleanHtml(user.meet) }} />
                </>
              )}
            </div>
          </div>

          <div className="box top8-box">
            <div className="box-h">{user.displayName}&apos;s Friend Space</div>
            <div className="friend-count">
              {user.displayName} has <span className="red">{friendCount}</span>{' '}
              {friendCount === 1 ? 'friend' : 'friends'}.
            </div>
            {top8.length > 0 ? (
              <div className="top8">
                {top8.map((f) => (
                  <FriendTile key={f.id} user={f} />
                ))}
              </div>
            ) : (
              <div className="box-b small muted">No frenz yet.</div>
            )}
            <div className="small" style={{ padding: '0 16px 14px', textAlign: 'right' }}>
              <Link href={`/${user.username}/friends`}>View all of {user.displayName}&apos;s friends</Link>
            </div>
          </div>

          <div className="box comments-box" id="comments">
            <div className="box-h">{user.displayName}&apos;s Friends Comments</div>
            <div className="small muted" style={{ padding: '12px 16px 0' }}>
              Displaying <span className="red">{comments.length}</span> of{' '}
              <span className="red">{commentCount}</span> comments
              {!showAll && commentCount > comments.length && (
                <>
                  {' '}
                  (<Link href={`/${user.username}?comments=all#comments`}>View all</Link>)
                </>
              )}
            </div>

            {canComment && (
              <form action={addComment} className="box-b" id="add-comment">
                <input type="hidden" name="profileId" value={user.id} />
                <input type="hidden" name="back" value={back} />
                <textarea name="body" rows={3} maxLength={5000} placeholder={`Say something to ${user.displayName}… (HTML welcome)`} required />
                <div style={{ marginTop: 8 }}>
                  <button className="btn small-btn" type="submit">Post comment</button>
                </div>
              </form>
            )}
            {!canComment && !isMe && (
              <div className="box-b small muted">
                {me ? `Add ${user.displayName} as a friend to leave a comment.` : <><Link href="/login">Log in</Link> to leave a comment.</>}
              </div>
            )}

            {comments.length > 0 && (
              <table className="comments">
                <tbody>
                  {comments.map((c) => (
                    <tr key={c.id}>
                      <td className="who">
                        <Link href={`/${c.author.username}`}>{c.author.displayName}</Link>
                        <Link href={`/${c.author.username}`}>
                          <Pic user={c.author} size={72} />
                        </Link>
                      </td>
                      <td className="said">
                        <div className="when">{fmtDate(c.createdAt)}</div>
                        <div dangerouslySetInnerHTML={{ __html: cleanHtml(c.body) }} />
                        {me && (isMe || c.authorId === me.id) && (
                          <form action={deleteComment} style={{ marginTop: 8 }}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="back" value={back} />
                            <button type="submit" className="linkbtn small">Delete</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
