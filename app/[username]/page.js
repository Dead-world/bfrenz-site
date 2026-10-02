import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { countFriends, getFriendship, getTop8 } from '@/lib/friends';
import { cleanCss, cleanHtml } from '@/lib/sanitize';
import { fmtDate, fmtDay, isOnline, SITE_DOMAIN } from '@/lib/util';
import { FriendTile, Pic } from '@/components/Avatar';
import SongPlayer from '@/components/SongPlayer';
import VideoPlayer from '@/components/VideoPlayer';
import { moodLabel } from '@/lib/moods';
import { timeAgo } from '@/lib/util';
import Notice from '@/components/Notice';
import { sendFriendRequest } from '@/app/actions/friends';
import { addComment, deleteComment } from '@/app/actions/comments';
import Badges, { Name } from '@/components/Badges';
import { getTheme } from '@/lib/themes';
import { canUseTheme, canUseAboutTemplate, isSupporter, topFriendLimit } from '@/lib/perks';
import { getAboutTemplate } from '@/lib/aboutTemplates';
import { didBlock, isAdmin, isBlockedEither } from '@/lib/moderation';
import { blockUser, unblockUser } from '@/app/actions/moderation';
import ShareButtons from '@/components/ShareButtons';
import { siteUrl } from '@/lib/email';
import { after } from 'next/server';
import { headers } from 'next/headers';
import HitCounter from '@/components/HitCounter';
import { counterStyle, recordVisit } from '@/lib/visitors';
import { birthdayLabel, isBirthdayToday } from '@/lib/birthdays';
import { profileTracks } from '@/lib/playlist';
import { latestBlogs } from '@/lib/blogs';
import { currentChampion, myVote } from '@/lib/potw';
import { votePotw } from '@/app/actions/potw';

async function loadUser(username) {
  return prisma.user.findUnique({ where: { username: String(username).toLowerCase() } });
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const user = await loadUser(username);
  if (!user || user.bannedAt) return { title: 'Not found | BFRENZ.com', robots: { index: false } };
  const title = `${user.displayName} (@${user.username}) | BFRENZ.com`;
  const description = user.headline
    ? `${user.headline} · ${user.displayName} is on BFRENZ. Check out their page, Top 8 and profile song.`
    : `${user.displayName} is on BFRENZ. Check out their page, Top 8 and profile song.`;
  const url = `/${user.username}`;
  // Share previews use the BFRENZ logo card, not the member's photo.
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'profile', siteName: 'BFRENZ', title, description, url, images: ['/share.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/share.png'] },
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
  if (user.bannedAt && !isAdmin(me)) notFound();
  const [iBlocked, blocked] = me && !isMe
    ? await Promise.all([didBlock(me.id, user.id), isBlockedEither(me.id, user.id)])
    : [false, false];
  if (!isMe && !user.bannedAt) {
    // Counted after the page is sent, so it never slows the page down.
    const ua = (await headers()).get('user-agent') || '';
    after(() => recordVisit(user, me, ua).catch((e) => console.error('[visit]', e?.message)));
  }

  const showAll = sp?.comments === 'all';
  const [top8, friendCount, comments, commentCount, friendship] = await Promise.all([
    getTop8(user.id, topFriendLimit(user)),
    countFriends(user.id),
    prisma.comment.findMany({
      where: { profileId: user.id, parentId: null, author: { bannedAt: null } },
      orderBy: { createdAt: 'desc' },
      take: showAll ? 200 : 20,
      include: {
        author: true,
        replies: {
          where: { author: { bannedAt: null } },
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: { author: true },
        },
      },
    }),
    prisma.comment.count({ where: { profileId: user.id, parentId: null, author: { bannedAt: null } } }),
    me && !isMe ? getFriendship(me.id, user.id) : null,
  ]);

  const [profileVideo, status, blogs, groups] = await Promise.all([
    prisma.video.findFirst({ where: { userId: user.id, onProfile: true } }),
    // Their latest status update (text only) shows on the profile, like the old status line.
    prisma.post.findFirst({
      where: { authorId: user.id, body: { not: '' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, body: true, createdAt: true },
    }),
    blocked ? [] : latestBlogs(me, user.id, 3),
    prisma.groupMember.findMany({
      where: { userId: user.id, role: { not: 'banned' } },
      orderBy: { joinedAt: 'desc' },
      take: 8,
      include: { group: { select: { slug: true, name: true, avatarUrl: true, memberCount: true } } },
    }),
  ]);
  const isFriend = friendship?.status === 'ACCEPTED';
  const iRequested = friendship?.status === 'PENDING' && friendship.requesterId === me?.id;
  const theyRequested = friendship?.status === 'PENDING' && friendship.addresseeId === me?.id;
  const canComment = !!me && (isMe || isFriend);
  const back = `/${user.username}`;
  const interests = INTERESTS.filter(([, key]) => user[key]);
  const bdayToday = isBirthdayToday(user);
  const [champ, vote] = await Promise.all([currentChampion().catch(() => null), me && !isMe ? myVote(me.id) : null]);
  const isChamp = champ?.userId === user.id;
  const votedHere = vote?.nomineeId === user.id;
  const tracks = profileTracks(user).map(({ url, title, artist }) => ({ url, title, artist }));

  // Shop theme: the owner can preview any theme with ?preview=slug; visitors see the applied one.
  const previewing = isMe && sp?.preview ? getTheme(String(sp.preview)) : null;
  let themeCss = previewing?.css || '';
  if (!previewing && user.theme && (await canUseTheme(user, user.theme))) {
    themeCss = getTheme(user.theme)?.css || '';
  }

  // About Me template: the owner can preview one with ?about=slug (shown with its sample text).
  const previewAbout = isMe && sp?.about ? getAboutTemplate(String(sp.about)) : null;
  let aboutTpl = previewAbout;
  if (!aboutTpl && user.aboutTemplate && (await canUseAboutTemplate(user, user.aboutTemplate))) {
    aboutTpl = getAboutTemplate(user.aboutTemplate);
  }
  const aboutHtml = previewAbout ? previewAbout.html : user.aboutMe;

  return (
    <div className={`profile-page${isSupporter(user) ? ' is-supporter' : ''}`}>
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      {aboutTpl && <style dangerouslySetInnerHTML={{ __html: aboutTpl.css }} />}
      {user.customCss && <style dangerouslySetInnerHTML={{ __html: cleanCss(user.customCss) }} />}
      {previewing && (
        <div className="notice ok">
          Previewing the <b>{previewing.name}</b> theme (only you can see this).{' '}
          <Link href="/shop">Back to the shop</Link>
        </div>
      )}
      {previewAbout && (
        <div className="notice ok">
          Previewing the <b>{previewAbout.name}</b> About Me template with sample text (only you can see this).{' '}
          <Link href="/shop#about">Back to the shop</Link>
        </div>
      )}
      <Notice sp={sp} />
      {sp?.requested && <div className="notice ok">Friend request sent!</div>}
      {sp?.blocked && <div className="notice ok">Blocked. They can&apos;t message you, comment, or add you.</div>}
      {sp?.unblocked && <div className="notice ok">Unblocked.</div>}
      {user.bannedAt && <div className="notice error">This member is banned. Only admins can see this page.</div>}

      <div className="cols">
        {/* ---------------- left column ---------------- */}
        <div className="col-left profile-left">
          <div className="box profile-card">
            <div className="box-b">
              <h1 className="bigname profile-name">{user.displayName}<Badges user={user} /></h1>
              {isChamp && (
                <Link href="/potw" className="potw-banner">🏆 Profile of the Week</Link>
              )}
              {bdayToday && <div className="bday-banner">🎂 It&apos;s {isMe ? 'your' : `${user.displayName}'s`} birthday today! 🎉</div>}
              {user.isArtist && (
                <div className="artist-line">♫ Artist{user.genre ? ` · ${user.genre}` : ''}</div>
              )}
              <div className="profile-head">
                <Pic user={user} size={150} />
                <div className="profile-facts">
                  {user.headline && <div className="headline">&ldquo;{user.headline}&rdquo;</div>}
                  {user.gender && <div>{user.gender}</div>}
                  {user.age && <div>{user.age} years old</div>}
                  {user.location && <div>{user.location}</div>}
                  {user.birthMonth && user.birthDay && <div>🎂 {birthdayLabel(user)}</div>}
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
              {status && (
                <div className="status-line">
                  <b>{user.displayName}</b> {status.body.length > 160 ? status.body.slice(0, 157) + '…' : status.body}
                  <span className="small muted"> &middot; {timeAgo(status.createdAt)}</span>
                </div>
              )}
              {user.mood && (
                <div className="mood">
                  <b>Mood:</b> {moodLabel(user.mood)}
                </div>
              )}
              {user.awayMessage && (isMe || isFriend) && (
                <div className="away-line">
                  <b>🌙 Away:</b> {user.awayMessage}
                </div>
              )}
              <div className="small muted" style={{ marginTop: 10 }}>
                <Link href={`/${user.username}/photos`}>View pics</Link> &middot;{' '}
                <Link href={`/${user.username}/videos`}>View videos</Link> &middot;{' '}
                <Link href={`/${user.username}/friends`}>View friends</Link>
                {!user.showCounter && <> &middot; {user.profileViews.toLocaleString()} views</>}
                {isMe && <> &middot; <Link href="/visitors">Who&apos;s been creeping?</Link></>}
              </div>
              {user.showCounter && <HitCounter value={user.profileViews} look={counterStyle(user)} />}
            </div>
          </div>

          {tracks.length > 0 && <SongPlayer tracks={tracks} />}

          {profileVideo && (
            <div className="box video-box">
              <div className="box-h">
                &#9654; {user.displayName}&apos;s Video
                <Link href={`/${user.username}/videos`} className="right small">All videos</Link>
              </div>
              <VideoPlayer video={profileVideo} />
              <div className="box-b small"><b>{profileVideo.title}</b></div>
            </div>
          )}

          <div className="box orange contact-box">
            <div className="box-h orange">Contacting {user.displayName}</div>
            <div className="contact-grid">
              {isMe ? (
                <>
                  <Link href="/edit"><span className="ico">✎</span>Edit profile</Link>
                  <Link href="/edit/top8"><span className="ico">★</span>Edit Top 8</Link>
                  <Link href="/edit?tab=css"><span className="ico">◐</span>Customize</Link>
                  <Link href={`/${user.username}/photos`}><span className="ico">▣</span>My photos</Link>
                  <Link href={`/${user.username}/videos`}><span className="ico">▶</span>My videos</Link>
                  <Link href="/invite"><span className="ico">✦</span>Invite frenz</Link>
                </>
              ) : (
                blocked ? (
                  <span style={{ gridColumn: '1 / -1' }}>
                    <span className="ico">⦸</span>
                    {iBlocked ? `You blocked ${user.displayName}.` : `You can't contact ${user.displayName}.`}
                  </span>
                ) : (
                <>
                  <Link href={me ? `/mail/compose?to=${user.username}` : `/signup?ref=${user.username}`}>
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
                    <Link href={`/signup?ref=${user.username}`}><span className="ico">+</span>Add to friends</Link>
                  )}
                  <a href="#comments"><span className="ico">💬</span>Add comment</a>
                  <Link href={`/${user.username}/photos`}><span className="ico">▣</span>View photos</Link>
                  <Link href={`/${user.username}/videos`}><span className="ico">▶</span>View videos</Link>
                  <a href="#top8"><span className="ico">★</span>View friends</a>
                </>
                )
              )}
            </div>
            {me && !isMe && !blocked && (
              <div className="potw-vote">
                {votedHere ? (
                  <span className="small">🏆 <b>You voted for {user.displayName}</b> for Profile of the Week. <Link href="/potw">See the votes</Link></span>
                ) : (
                  <form action={votePotw} className="actions">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="back" value={back} />
                    <button type="submit" className="btn small-btn potw-btn">🏆 Vote for Profile of the Week</button>
                    {vote && <span className="small muted">(moves your vote here)</span>}
                  </form>
                )}
              </div>
            )}
            {me && !isMe && (
              <div className="safety-links small">
                <Link href={`/report?kind=profile&id=${user.id}&back=${encodeURIComponent(back)}`}>Report</Link>
                &middot;
                <form action={iBlocked ? unblockUser : blockUser} className="inline">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="linkbtn small">{iBlocked ? 'Unblock' : 'Block'}</button>
                </form>
              </div>
            )}
          </div>

          {isMe && (
            <div className="box share-box">
              <div className="box-h">Share my profile</div>
              <div className="box-b">
                <ShareButtons url={`${siteUrl()}/${user.username}`} text="Check out my BFRENZ page!" />
                <div className="small" style={{ marginTop: 10 }}>
                  <Link href="/invite">Invite frenz and earn free stuff &raquo;</Link>
                </div>
              </div>
            </div>
          )}

          <div className="box url-box">
            <b>{user.displayName}&apos;s URL:</b>
            <br />
            <Link href={`/${user.username}`}>
              {SITE_DOMAIN}/{user.username}
            </Link>
          </div>

          {groups.length > 0 && (
            <div className="box groups-box">
              <div className="box-h">
                {user.displayName}&apos;s Groups
                <Link href="/groups" className="right small">All groups</Link>
              </div>
              <ul className="profile-groups">
                {groups.map((m) => (
                  <li key={m.id}>
                    <Link href={`/groups/${m.group.slug}`}>
                      <img src={m.group.avatarUrl || '/no-pic.svg'} alt="" width={32} height={32} className="pic" />
                      <span>
                        <b>{m.group.name}</b>
                        <span className="small muted">{m.group.memberCount} {m.group.memberCount === 1 ? 'member' : 'members'}{m.role === 'owner' ? ' · owner' : ''}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

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

          {(blogs.length > 0 || isMe) && (
            <div className="box blog-box">
              <div className="box-h">
                {user.displayName}&apos;s Latest Blog Entries
                <Link href={`/${user.username}/blog`} className="right small">View all</Link>
              </div>
              <div className="box-b">
                {blogs.length === 0 ? (
                  <span className="small muted">No entries yet. <Link href="/blog/write">Write your first one</Link>!</span>
                ) : (
                  <ul className="blog-latest">
                    {blogs.map((b) => (
                      <li key={b.id}>
                        <Link href={`/${user.username}/blog/${b.id}`}>{b.title}</Link>
                        <span className="small muted"> · {fmtDay(b.createdAt)}{b.visibility === 'frenz' ? ' · 🔒' : ''}{b._count.comments ? ` · ${b._count.comments} 💬` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {isMe && blogs.length > 0 && (
                  <div className="small" style={{ marginTop: 8 }}><Link href="/blog/write">+ New entry</Link></div>
                )}
              </div>
            </div>
          )}

          <div className="box blurbs">
            <div className="box-h">{user.displayName}&apos;s Blurbs</div>
            <div className="box-b">
              <div className="blurb-title">About me</div>
              <div
                className={`blurb${aboutTpl ? ` about-tpl about-tpl-${aboutTpl.slug}` : ''}`}
                dangerouslySetInnerHTML={{
                  __html: aboutHtml ? cleanHtml(aboutHtml) : '<i>Nothing here yet.</i>',
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

          <div className="box top8-box" id="top8">
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
                <textarea
                  name="body"
                  rows={3}
                  maxLength={5000}
                  placeholder={`Say something to ${user.displayName}… (HTML welcome)`}
                  defaultValue={!isMe && sp?.bday ? `Happy birthday ${user.displayName}!! 🎂🎉 Hope your day is amazing!` : ''}
                  autoFocus={!!sp?.bday}
                  required
                />
                <div style={{ marginTop: 8 }}>
                  <button className="btn small-btn" type="submit">Post comment</button>
                </div>
              </form>
            )}
            {!canComment && !isMe && (
              <div className="box-b small muted">
                {me ? `Add ${user.displayName} as a friend to leave a comment.` : <><Link href={`/signup?ref=${user.username}`}>Join BFRENZ</Link> or <Link href="/login">log in</Link> to leave a comment.</>}
              </div>
            )}

            {comments.length > 0 && (
              <table className="comments">
                <tbody>
                  {comments.map((c) => (
                    <tr key={c.id} id={`c-${c.id}`}>
                      <td className="who">
                        <Link href={`/${c.author.username}`}><Name user={c.author} /></Link>
                        <Badges user={c.author} />
                        <Link href={`/${c.author.username}`}>
                          <Pic user={c.author} size={72} />
                        </Link>
                      </td>
                      <td className="said">
                        <div className="when">{fmtDate(c.createdAt)}</div>
                        <div dangerouslySetInnerHTML={{ __html: cleanHtml(c.body) }} />
                        <section className="actions comment-actions">
                          {me && (canComment || c.authorId === me.id) && !blocked && (
                            <a href={`#reply-${c.id}`} className="linkbtn small reply-link">Reply</a>
                          )}
                          {me && (isMe || c.authorId === me.id) && (
                            <form action={deleteComment}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="back" value={back} />
                              <button type="submit" className="linkbtn small">Delete</button>
                            </form>
                          )}
                          {me && c.authorId !== me.id && (
                            <Link className="small muted" href={`/report?kind=comment&id=${c.id}&back=${encodeURIComponent(back)}`}>Report</Link>
                          )}
                        </section>

                        {c.replies.length > 0 && (
                          <section className="replies">
                            {c.replies.map((r) => (
                              <article key={r.id} className={`reply${r.authorId === user.id ? ' by-owner' : ''}`} id={`c-${r.id}`}>
                                <Link href={`/${r.author.username}`} className="reply-pic"><Pic user={r.author} size={40} /></Link>
                                <section className="reply-main">
                                  <section className="reply-head small">
                                    <Link href={`/${r.author.username}`}><b><Name user={r.author} /></b></Link>
                                    <Badges user={r.author} />
                                    {r.authorId === user.id && <span className="owner-tag">owner</span>}
                                    <span className="muted"> &middot; {fmtDate(r.createdAt)}</span>
                                  </section>
                                  <section className="reply-body" dangerouslySetInnerHTML={{ __html: cleanHtml(r.body) }} />
                                  {me && (
                                    <section className="actions comment-actions">
                                      {(isMe || r.authorId === me.id) && (
                                        <form action={deleteComment}>
                                          <input type="hidden" name="id" value={r.id} />
                                          <input type="hidden" name="back" value={back} />
                                          <button type="submit" className="linkbtn small">Delete</button>
                                        </form>
                                      )}
                                      {r.authorId !== me.id && (
                                        <Link className="small muted" href={`/report?kind=comment&id=${r.id}&back=${encodeURIComponent(back)}`}>Report</Link>
                                      )}
                                    </section>
                                  )}
                                </section>
                              </article>
                            ))}
                          </section>
                        )}

                        {me && (canComment || c.authorId === me.id) && !blocked && (
                          <form action={addComment} className="reply-form" id={`reply-${c.id}`}>
                            <input type="hidden" name="profileId" value={user.id} />
                            <input type="hidden" name="parentId" value={c.id} />
                            <input type="hidden" name="back" value={back} />
                            <textarea name="body" rows={2} maxLength={5000} placeholder={`Reply to ${c.author.displayName}…`} required />
                            <section className="actions">
                              <button className="btn small-btn" type="submit">Reply</button>
                              {c.authorId !== me.id && c.authorId !== user.id && (
                                <label className="small muted">
                                  <input type="checkbox" name="alsoPost" defaultChecked={isMe} /> also post on {c.author.displayName}&apos;s page
                                </label>
                              )}
                            </section>
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
