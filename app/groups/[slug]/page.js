import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getGroup, membershipOf, isMember, canModerate, GROUP_POST_MAX, GROUP_REPLY_MAX } from '@/lib/groups';
import { hiddenUserIds, isAdmin } from '@/lib/moderation';
import {
  joinGroup, leaveGroup, postToGroup, replyToGroupPost, deleteGroupPost, deleteGroupReply, togglePin,
} from '@/app/actions/groups';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import PostText from '@/components/PostText';
import MentionInput from '@/components/MentionInput';
import UploadField from '@/components/UploadField';
import ShareButtons from '@/components/ShareButtons';
import Notice from '@/components/Notice';
import { siteUrl } from '@/lib/email';
import { fmtDate, timeAgo } from '@/lib/util';

const PAGE = 25;
const RANK = { owner: 0, mod: 1, member: 2 };
const sortMembers = (list) => [...list].sort((a, b) => (RANK[a.role] ?? 3) - (RANK[b.role] ?? 3));
const PERSON = { select: { id: true, username: true, displayName: true, avatarUrl: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true } };

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const g = await getGroup(slug);
  if (!g || g.owner.bannedAt) return { title: 'Group not found | BFRENZ.com', robots: { index: false } };
  const title = `${g.name} | BFRENZ Groups`;
  const description = g.description ? g.description.slice(0, 160) : `${g.name}: a ${g.category} group on BFRENZ with ${g.memberCount} members.`;
  return { title, description, alternates: { canonical: `/groups/${g.slug}` }, openGraph: { title, description, images: [g.avatarUrl || '/share.png'] } };
}

export default async function GroupPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const group = await getGroup(slug);
  const me = await getCurrentUser();
  if (!group || (group.owner.bannedAt && !isAdmin(me))) notFound();

  const m = await membershipOf(group.id, me?.id);
  const member = isMember(m);
  const mod = canModerate(me, m);
  const hidden = me ? await hiddenUserIds(me.id) : [];
  const beforeRaw = sp?.before ? new Date(String(sp.before)) : null;
  const before = beforeRaw && !isNaN(beforeRaw) ? beforeRaw : null;
  const authorOk = { author: { bannedAt: null }, ...(hidden.length ? { authorId: { notIn: hidden } } : {}) };

  const [pinned, posts, members] = await Promise.all([
    before ? [] : prisma.groupPost.findMany({
      where: { groupId: group.id, pinned: true, ...authorOk },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { author: PERSON, replies: { where: authorOk, orderBy: { createdAt: 'asc' }, take: 50, include: { author: PERSON } } },
    }),
    prisma.groupPost.findMany({
      where: { groupId: group.id, pinned: false, ...authorOk, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE + 1,
      include: { author: PERSON, replies: { where: authorOk, orderBy: { createdAt: 'asc' }, take: 50, include: { author: PERSON } } },
    }),
    prisma.groupMember.findMany({
      where: { groupId: group.id, role: { not: 'banned' }, user: { bannedAt: null } },
      orderBy: { joinedAt: 'asc' },
      take: 40,
      include: { user: PERSON },
    }).then(sortMembers).then((l) => l.slice(0, 12)),
  ]);
  const more = posts.length > PAGE;
  const list = [...pinned, ...posts.slice(0, PAGE)];
  const back = `/groups/${group.slug}`;

  return (
    <div className="group-page">
      <Notice sp={sp} />
      {sp?.created && <div className="notice ok">Your group is live! 🎉 Share the link below to get your first members.</div>}
      {sp?.joined && <div className="notice ok">You joined {group.name}! Say hi on the wall 👋</div>}

      <section className="box group-hero">
        <img src={group.avatarUrl || '/no-pic.svg'} alt="" width={110} height={110} className="pic group-pic" />
        <div className="group-hero-main">
          <div className="small muted"><Link href={`/groups?cat=${encodeURIComponent(group.category)}`}>{group.category}</Link> · started {fmtDate(group.createdAt).split(',')[0]}</div>
          <h1 className="bigname group-name">{group.name}{group.owner.isOfficial && <span className="official-chip">✔ Official</span>}</h1>
          <div className="small">
            <b>{group.memberCount}</b> {group.memberCount === 1 ? 'member' : 'members'} ·{' '}
            {group.owner.isOfficial ? (
              <>an official BFRENZ group, run by the BFRENZ team</>
            ) : (
              <>run by <Link href={`/${group.owner.username}`}>{group.owner.displayName}</Link></>
            )}
          </div>
          <div className="actions" style={{ marginTop: 10 }}>
            {!me ? (
              <Link href={`/signup`} className="btn small-btn">Join BFRENZ to join</Link>
            ) : m?.role === 'banned' ? (
              <span className="small muted">You were removed from this group.</span>
            ) : member ? (
              <>
                <span className="group-joined">✓ Member{m.role !== 'member' ? ` (${m.role})` : ''}</span>
                {m.role !== 'owner' && (
                  <form action={leaveGroup}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <button type="submit" className="btn ghost small-btn">Leave</button>
                  </form>
                )}
              </>
            ) : (
              <form action={joinGroup}>
                <input type="hidden" name="groupId" value={group.id} />
                <button type="submit" className="btn small-btn">+ Join group</button>
              </form>
            )}
            {mod && <Link href={`${back}/edit`} className="btn ghost small-btn">Settings</Link>}
            {me && !member && (
              <Link className="small muted" href={`/report?kind=group&id=${group.id}&back=${encodeURIComponent(back)}`}>Report</Link>
            )}
          </div>
        </div>
      </section>

      <div className="cols">
        <div className="col-left">
          {group.description && (
            <div className="box">
              <div className="box-h">About</div>
              <div className="box-b"><PostText text={group.description} /></div>
            </div>
          )}
          <div className="box">
            <div className="box-h">
              Members
              <Link href={`${back}/members`} className="right small">See all</Link>
            </div>
            <div className="group-members-grid">
              {members.map((x) => (
                <Link key={x.id} href={`/${x.user.username}`} className="group-member" title={x.user.displayName}>
                  <Pic user={x.user} size={52} />
                  <span className="small">{x.user.displayName}</span>
                  {x.role !== 'member' && <span className="group-role">{x.role}</span>}
                </Link>
              ))}
            </div>
          </div>
          <div className="box">
            <div className="box-h">Invite people</div>
            <div className="box-b">
              <ShareButtons url={`${siteUrl()}${back}`} text={`Join ${group.name} on BFRENZ!`} />
            </div>
          </div>
        </div>

        <div className="col-right">
          {member && !before && (
            <form action={postToGroup} className="box group-composer">
              <input type="hidden" name="groupId" value={group.id} />
              <div className="box-b">
                <MentionInput as="textarea" name="body" rows={3} maxLength={GROUP_POST_MAX} placeholder={`Post something to ${group.name}… (@ to tag, # for hashtags)`} />
                <details className="group-photo">
                  <summary className="small">📷 Add a photo</summary>
                  <UploadField name="imageUrl" kind="image" accept="image/*" />
                </details>
                <div style={{ marginTop: 8 }}><button type="submit" className="btn small-btn">Post</button></div>
              </div>
            </form>
          )}
          {!member && me && m?.role !== 'banned' && (
            <div className="box"><div className="box-b small">Join the group to post and reply.</div></div>
          )}

          {list.length === 0 ? (
            <div className="box"><div className="box-b small muted">No posts yet. {member ? 'Start the conversation!' : ''}</div></div>
          ) : (
            list.map((p) => (
              <article key={p.id} className={`box feed-item group-post${p.pinned ? ' pinned' : ''}`} id={`gp-${p.id}`}>
                <header className="feed-head">
                  <Link href={`/${p.author.username}`}><Pic user={p.author} size={44} /></Link>
                  <div className="feed-head-main">
                    <div>
                      <Link href={`/${p.author.username}`} className="feed-who"><b><Name user={p.author} /></b><Badges user={p.author} /></Link>
                      {p.pinned && <span className="group-pin small"> 📌 Pinned</span>}
                    </div>
                    <span className="feed-when"><time title={fmtDate(p.createdAt)}>{timeAgo(p.createdAt)}</time></span>
                  </div>
                  {me && (
                    <div className="actions small">
                      {mod && (
                        <form action={togglePin}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="linkbtn small muted">{p.pinned ? 'Unpin' : 'Pin'}</button>
                        </form>
                      )}
                      {(p.authorId === me.id || mod) && (
                        <form action={deleteGroupPost}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="linkbtn small muted">Delete</button>
                        </form>
                      )}
                      {p.authorId !== me.id && (
                        <Link className="muted" href={`/report?kind=grouppost&id=${p.id}&back=${encodeURIComponent(back)}`}>Report</Link>
                      )}
                    </div>
                  )}
                </header>
                <PostText text={p.body} />
                {p.imageUrl && (
                  <div className="feed-images n1">
                    <a href={p.imageUrl} target="_blank" rel="noopener noreferrer"><img src={p.imageUrl} alt="" loading="lazy" /></a>
                  </div>
                )}
                <section className="feed-comments">
                  {p.replies.map((r) => (
                    <div key={r.id} className="feed-comment">
                      <Link href={`/${r.author.username}`}><Pic user={r.author} size={30} /></Link>
                      <div className="feed-comment-main">
                        <Link href={`/${r.author.username}`} className="feed-who"><b><Name user={r.author} /></b></Link>{' '}
                        <PostText text={r.body} className="post-text inline" />
                        <div className="feed-comment-meta small">
                          <span className="feed-when">{timeAgo(r.createdAt)}</span>
                          {me && (r.authorId === me.id || mod) && (
                            <form action={deleteGroupReply} className="inline">
                              <input type="hidden" name="id" value={r.id} />
                              <button type="submit" className="linkbtn small muted">Delete</button>
                            </form>
                          )}
                          {me && r.authorId !== me.id && (
                            <Link className="muted" href={`/report?kind=groupreply&id=${r.id}&back=${encodeURIComponent(back)}`}>Report</Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {member && (
                    <form action={replyToGroupPost} className="feed-comment-form">
                      <input type="hidden" name="postId" value={p.id} />
                      <Pic user={me} size={30} />
                      <MentionInput type="text" name="body" maxLength={GROUP_REPLY_MAX} placeholder="Reply…" required />
                      <button type="submit" className="btn small-btn">Send</button>
                    </form>
                  )}
                </section>
              </article>
            ))
          )}
          {more && (
            <div className="actions" style={{ justifyContent: 'center' }}>
              <Link className="btn ghost small-btn" href={`${back}?before=${encodeURIComponent(posts[PAGE - 1].createdAt.toISOString())}`}>Older posts &raquo;</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
