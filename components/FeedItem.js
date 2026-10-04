import Link from 'next/link';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import PostText from '@/components/PostText';
import MentionInput from '@/components/MentionInput';
import { ReplyButton, ThreadReplyForm } from '@/components/CommentReply';
import MiniSong from '@/components/MiniSong';
import VideoPlayer from '@/components/VideoPlayer';
import { addPostComment, deletePost, deletePostComment } from '@/app/actions/posts';
import LikeBar from '@/components/LikeBar';
import { addItemComment, deleteItemComment } from '@/app/actions/itemComments';
import { addBlogComment, deleteBlogComment } from '@/app/actions/blogs';
import { replyToGroupPost, deleteGroupReply } from '@/app/actions/groups';
import { ITEM_COMMENT_KINDS, keyKind } from '@/lib/feedKeys';
import { moodLabel } from '@/lib/moods';
import { fmtDate, timeAgo } from '@/lib/util';
import { answeredPairs, getSurvey } from '@/lib/surveys';
import { blogSnippet } from '@/lib/blogSnippet';

function Who({ user }) {
  return (
    <Link href={`/${user.username}`} className="feed-who">
      <b><Name user={user} /></b>
      <Badges user={user} />
    </Link>
  );
}

function When({ at, href }) {
  const label = <time dateTime={new Date(at).toISOString()} title={fmtDate(at)}>{timeAgo(at)}</time>;
  return <span className="feed-when">{href ? <Link href={href}>{label}</Link> : label}</span>;
}

/**
 * One comment (or reply) under a feed item. Posts use PostComment; other items pass
 * their own delete action, report kind and anchor prefix.
 */
function FeedComment({ c, thread, me, mine, admin, back, small = false, del = deletePostComment, rk = 'postcomment', prefix = 'pc', canReply = true, canDelete }) {
  const deletable = canDelete ?? (c.authorId === me.id || mine || admin);
  return (
    <div className={`feed-comment${small ? ' is-reply' : ''}`} id={`${prefix}-${c.id}`}>
      <Link href={`/${c.author.username}`}><Pic user={c.author} size={small ? 24 : 30} /></Link>
      <div className="feed-comment-main">
        <Who user={c.author} /> <PostText text={c.body} className="post-text inline" />
        <div className="feed-comment-meta small">
          <When at={c.createdAt} />
          {canReply && c.authorId !== me.id && <ReplyButton thread={thread} target={c.id} username={c.author.username} />}
          {deletable && (
            <form action={del} className="inline">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="back" value={back} />
              <button type="submit" className="linkbtn small muted">Delete</button>
            </form>
          )}
          {c.authorId !== me.id && (
            <Link className="muted" href={`/report?kind=${rk}&id=${c.id}&back=${encodeURIComponent(back)}`}>Report</Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** One status post with its likes, comments and comment box. */
export function PostCard({ post, me, back, admin = false, allComments = false }) {
  const mine = post.authorId === me.id;
  const comments = allComments ? post.comments : [...post.comments].reverse();
  const shown = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
  const hidden = post._count.comments - shown;
  return (
    <article className="box feed-item feed-post" id={`post-${post.id}`}>
      <header className="feed-head">
        <Link href={`/${post.author.username}`}><Pic user={post.author} size={44} /></Link>
        <div className="feed-head-main">
          <div>
            <Who user={post.author} />
            {post.mood && <span className="feed-mood"> is feeling <b>{moodLabel(post.mood)}</b></span>}
          </div>
          <span>
            <When at={post.createdAt} href={`/post/${post.id}`} />
            {post.visibility === 'public' && <span className="small muted" title="Public post: anyone on BFRENZ can see it"> · 🌍</span>}
          </span>
        </div>
        {(mine || admin) && (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="back" value={back} />
            <button type="submit" className="linkbtn small muted" title="Delete post">Delete</button>
          </form>
        )}
      </header>

      <PostText text={post.body} />

      {post.imageUrls.length > 0 && (
        <div className={`feed-images n${Math.min(post.imageUrls.length, 4)}`}>
          {post.imageUrls.map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="" loading="lazy" /></a>
          ))}
        </div>
      )}
      {(post.videoUrl || post.youtubeId) && (
        <div className="feed-media"><VideoPlayer video={{ url: post.videoUrl, youtubeId: post.youtubeId, title: 'Video' }} /></div>
      )}
      {post.songUrl && <div className="feed-media"><MiniSong url={post.songUrl} /></div>}

      <footer className="feed-actions">
        <LikeBar k={`p-${post.id}`} rx={post.rx} />
        <a href={`#c-${post.id}`} className="linkbtn small">💬 Comment{post._count.comments ? ` · ${post._count.comments}` : ''}</a>
        {!mine && (
          <Link className="small muted feed-report" href={`/report?kind=post&id=${post.id}&back=${encodeURIComponent(back)}`}>Report</Link>
        )}
      </footer>

      <section className="feed-comments">
        {hidden > 0 && !allComments && (
          <Link href={`/post/${post.id}`} className="small">View all {post._count.comments} comments</Link>
        )}
        {comments.map((c) => (
          <div key={c.id} className="feed-thread">
            <FeedComment c={c} thread={c.id} me={me} mine={mine} admin={admin} back={back} />
            {c.replies?.length > 0 && (
              <div className="feed-replies">
                {c.replies.map((r) => <FeedComment key={r.id} c={r} thread={c.id} me={me} mine={mine} admin={admin} back={back} small />)}
              </div>
            )}
            <ThreadReplyForm postId={post.id} thread={c.id} back={back} pic={me.avatarUrl} myName={me.displayName} />
          </div>
        ))}
        <form action={addPostComment} className="feed-comment-form" id={`c-${post.id}`}>
          <input type="hidden" name="id" value={post.id} />
          <input type="hidden" name="back" value={back} />
          <Pic user={{ avatarUrl: me.avatarUrl, displayName: me.displayName }} size={30} />
          <MentionInput type="text" name="body" maxLength={1000} placeholder="Write a comment… (@ to tag)" required />
          <button type="submit" className="btn small-btn">Send</button>
        </form>
      </section>
    </article>
  );
}

/** Any feed item: a post, or something that happened on a friend's profile. */
/** Who owns a feed item (they can delete comments on it). */
function ownersOf(item) {
  if (item.type === 'bulletin') return [item.bulletin.authorId];
  if (item.type === 'frenz') return [item.a.id, item.b.id];
  return item.user ? [item.user.id] : [];
}

/** A comment thread (with one level of replies) on an item that uses ItemComment. */
export function ItemThread({ k, cm, me, back, admin, owners, all = false }) {
  const mine = owners.includes(me.id);
  const shown = cm.list.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
  const opts = { me, mine, admin, back, del: deleteItemComment, rk: 'itemcomment', prefix: 'ic' };
  return (
    <section className="feed-comments">
      {!all && cm.count > shown && <Link href={`/comments/${k}`} className="small">View all {cm.count} comments</Link>}
      {cm.list.map((c) => (
        <div key={c.id} className="feed-thread">
          <FeedComment c={c} thread={c.id} {...opts} />
          {c.replies?.length > 0 && (
            <div className="feed-replies">
              {c.replies.map((r) => <FeedComment key={r.id} c={r} thread={c.id} {...opts} small />)}
            </div>
          )}
          <ThreadReplyForm postId={k} thread={c.id} back={back} pic={me.avatarUrl} myName={me.displayName} action={addItemComment} />
        </div>
      ))}
      <form action={addItemComment} className="feed-comment-form" id={`c-${k}`}>
        <input type="hidden" name="id" value={k} />
        <input type="hidden" name="back" value={back} />
        <Pic user={{ avatarUrl: me.avatarUrl, displayName: me.displayName }} size={30} />
        <MentionInput type="text" name="body" maxLength={1000} placeholder="Write a comment… (@ to tag)" required />
        <button type="submit" className="btn small-btn">Send</button>
      </form>
    </section>
  );
}

/** Likes, emoji reactions and comments under any feed item that isn't a status post. */
function FeedBottom({ item, me, back, admin }) {
  const kind = keyKind(item.id);
  let count = 0;
  let thread = null;
  if (ITEM_COMMENT_KINDS.includes(kind)) {
    const cm = item.cm || { list: [], count: 0 };
    count = cm.count;
    thread = <ItemThread k={item.id} cm={cm} me={me} back={back} admin={admin} owners={ownersOf(item)} />;
  } else if (item.type === 'blog') {
    const b = item.blog;
    const list = [...(b.comments || [])].reverse();
    count = b._count.comments;
    const owner = b.authorId === me.id;
    thread = (
      <section className="feed-comments">
        {count > list.length && <Link href={`/${item.user.username}/blog/${b.id}#comments`} className="small">View all {count} comments</Link>}
        {list.map((c) => (
          <FeedComment key={c.id} c={c} me={me} admin={admin} back={back} del={deleteBlogComment} rk="blogcomment" prefix="bc" canReply={false} canDelete={c.authorId === me.id || owner || admin} />
        ))}
        <form action={addBlogComment} className="feed-comment-form" id={`c-${item.id}`}>
          <input type="hidden" name="id" value={b.id} />
          <input type="hidden" name="back" value={back} />
          <Pic user={{ avatarUrl: me.avatarUrl, displayName: me.displayName }} size={30} />
          <MentionInput type="text" name="body" maxLength={3000} placeholder="Comment on this blog…" required />
          <button type="submit" className="btn small-btn">Send</button>
        </form>
      </section>
    );
  } else if (item.type === 'grouppost') {
    const g = item.gpost;
    const list = [...(g.replies || [])].reverse();
    count = g._count.replies;
    thread = (
      <section className="feed-comments">
        {count > list.length && <Link href={`/groups/${g.group.slug}#gp-${g.id}`} className="small">View all {count} replies</Link>}
        {list.map((c) => (
          <FeedComment key={c.id} c={c} me={me} admin={admin} back={back} del={deleteGroupReply} rk="groupreply" prefix="gr" canReply={false} canDelete={c.authorId === me.id || admin} />
        ))}
        <form action={replyToGroupPost} className="feed-comment-form" id={`c-${item.id}`}>
          <input type="hidden" name="postId" value={g.id} />
          <input type="hidden" name="back" value={back} />
          <Pic user={{ avatarUrl: me.avatarUrl, displayName: me.displayName }} size={30} />
          <MentionInput type="text" name="body" maxLength={1000} placeholder={`Reply in ${g.group.name}… (@ to tag)`} required />
          <button type="submit" className="btn small-btn">Send</button>
        </form>
      </section>
    );
  }
  return (
    <>
      <footer className="feed-actions">
        <LikeBar k={item.id} rx={item.rx} />
        {thread && <a href={`#c-${item.id}`} className="linkbtn small">💬 Comment{count ? ` · ${count}` : ''}</a>}
      </footer>
      {thread}
    </>
  );
}

export default function FeedItem({ item, me, back, admin }) {
  if (item.type === 'post') return <PostCard post={item.post} me={me} back={back} admin={admin} />;

  if (item.type === 'bulletin') {
    const b = item.bulletin;
    const text = b.body.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return (
      <article className="box feed-item feed-event" id={item.id}>
        <header className="feed-head">
          <Link href={`/${b.author.username}`}><Pic user={b.author} size={44} /></Link>
          <div className="feed-head-main">
            <div><Who user={b.author} /> posted a bulletin</div>
            <When at={b.createdAt} />
          </div>
        </header>
        <Link href={`/bulletins/${b.id}`} className="feed-bulletin">
          <b>📢 {b.subject}</b>
          {text && <span className="small muted">{text.length > 180 ? text.slice(0, 177) + '…' : text}</span>}
        </Link>
        <FeedBottom item={item} me={me} back={back} admin={admin} />
      </article>
    );
  }

  if (item.type === 'photos') {
    const n = item.photos.length;
    const isPic = item.album?.name === 'Profile Pics';
    const href = `/${item.user.username}/photos${item.albumId ? `/${item.albumId}` : ''}`;
    return (
      <article className="box feed-item feed-event" id={item.id}>
        <header className="feed-head">
          <Link href={`/${item.user.username}`}><Pic user={item.user} size={44} /></Link>
          <div className="feed-head-main">
            <div>
              <Who user={item.user} />{' '}
              {isPic ? 'has a new profile pic' : <>added {n} {n === 1 ? 'photo' : 'photos'}{item.album ? <> to <Link href={href}>{item.album.name}</Link></> : ''}</>}
            </div>
            <When at={item.at} />
          </div>
        </header>
        <Link href={href} className={`feed-images n${Math.min(n, 4)}`}>
          {item.photos.slice(0, 4).map((p, i) => (
            <span key={p.id} className="feed-img-wrap">
              <img src={p.url} alt="" loading="lazy" />
              {i === 3 && n > 4 && <span className="feed-more">+{n - 4}</span>}
            </span>
          ))}
        </Link>
        <FeedBottom item={item} me={me} back={back} admin={admin} />
      </article>
    );
  }

  if (item.type === 'video') {
    return (
      <article className="box feed-item feed-event" id={item.id}>
        <header className="feed-head">
          <Link href={`/${item.user.username}`}><Pic user={item.user} size={44} /></Link>
          <div className="feed-head-main">
            <div><Who user={item.user} /> posted a video: <Link href={`/${item.user.username}/videos#v-${item.video.id}`}>{item.video.title}</Link></div>
            <When at={item.at} />
          </div>
        </header>
        <div className="feed-media"><VideoPlayer video={item.video} /></div>
        <FeedBottom item={item} me={me} back={back} admin={admin} />
      </article>
    );
  }

  if (item.type === 'song') {
    const u = item.user;
    const label = [u.songTitle, u.songArtist].filter(Boolean).join(' – ');
    return (
      <article className="box feed-item feed-event" id={item.id}>
        <header className="feed-head">
          <Link href={`/${u.username}`}><Pic user={u} size={44} /></Link>
          <div className="feed-head-main">
            <div><Who user={u} /> changed their profile song{label ? <> to <b>{label}</b></> : ''} 🎵</div>
            <When at={item.at} />
          </div>
        </header>
        <div className="feed-media"><MiniSong url={u.songUrl} title={label} /></div>
        <FeedBottom item={item} me={me} back={back} admin={admin} />
      </article>
    );
  }

  if (item.type === 'grouppost') {
    const g = item.gpost;
    const href = `/groups/${g.group.slug}#gp-${g.id}`;
    return (
      <article className="box feed-item feed-event" id={item.id}>
        <header className="feed-head">
          <Link href={`/${item.user.username}`}><Pic user={item.user} size={44} /></Link>
          <div className="feed-head-main">
            <div><Who user={item.user} /> posted in <Link href={`/groups/${g.group.slug}`}><b>👥 {g.group.name}</b></Link></div>
            <When at={item.at} />
          </div>
        </header>
        <PostText text={g.body.length > 400 ? g.body.slice(0, 397) + '…' : g.body} />
        {g.imageUrl && (
          <Link href={href} className="feed-images n1"><span className="feed-img-wrap"><img src={g.imageUrl} alt="" loading="lazy" /></span></Link>
        )}
        <footer className="feed-survey-foot">
          <Link href={href} className="small">💬 {g._count.replies ? `${g._count.replies} ${g._count.replies === 1 ? 'reply' : 'replies'}` : 'Reply'} in the group &raquo;</Link>
        </footer>
        <FeedBottom item={item} me={me} back={back} admin={admin} />
      </article>
    );
  }

  if (item.type === 'blog') {
    const b = item.blog;
    const href = `/${item.user.username}/blog/${b.id}`;
    return (
      <article className="box feed-item feed-event" id={item.id}>
        <header className="feed-head">
          <Link href={`/${item.user.username}`}><Pic user={item.user} size={44} /></Link>
          <div className="feed-head-main">
            <div><Who user={item.user} /> wrote a new blog entry {b.visibility === 'frenz' && <span className="small muted">🔒</span>}</div>
            <When at={item.at} />
          </div>
        </header>
        <Link href={href} className="feed-blog">
          <b>✍️ {b.title}</b>
          <span className="small muted">{blogSnippet(b.body, 220)}</span>
          <span className="small feed-blog-more">Read more{b._count.comments ? ` · ${b._count.comments} ${b._count.comments === 1 ? 'comment' : 'comments'}` : ''} &raquo;</span>
        </Link>
        <FeedBottom item={item} me={me} back={back} admin={admin} />
      </article>
    );
  }

  if (item.type === 'survey') {
    const s = getSurvey(item.answer.surveySlug);
    if (!s) return null;
    const pairs = answeredPairs(s, item.answer.answers);
    const href = `/surveys/${s.slug}/${item.user.username}`;
    const mine = item.user.id === me.id;
    return (
      <article className="box feed-item feed-event" id={item.id}>
        <header className="feed-head">
          <Link href={`/${item.user.username}`}><Pic user={item.user} size={44} /></Link>
          <div className="feed-head-main">
            <div><Who user={item.user} /> took the <Link href={href}><b>{s.emoji} {s.title}</b></Link> survey</div>
            <When at={item.at} />
          </div>
        </header>
        <Link href={href} className="feed-survey">
          {pairs.slice(0, 4).map(([q, a], i) => (
            <span key={i} className="feed-survey-row">
              <span className="feed-survey-q">{q}</span>
              <span className="feed-survey-a">{a.length > 120 ? a.slice(0, 117) + '…' : a}</span>
            </span>
          ))}
        </Link>
        <footer className="feed-survey-foot">
          <Link href={href} className="small">{pairs.length > 4 ? `See all ${pairs.length} answers` : 'See answers'} &raquo;</Link>
          {!mine && <Link href={`/surveys/${s.slug}`} className="btn small-btn">Take it too ✍️</Link>}
        </footer>
        <FeedBottom item={item} me={me} back={back} admin={admin} />
      </article>
    );
  }

  if (item.type === 'frenz') {
    return (
      <article className="box feed-item feed-event feed-small" id={item.id}>
        <div className="feed-frenz">
          <Link href={`/${item.a.username}`}><Pic user={item.a} size={36} /></Link>
          <Link href={`/${item.b.username}`}><Pic user={item.b} size={36} /></Link>
          <div>
            <Who user={item.a} /> and <Who user={item.b} /> are now frenz 🤝
            <div><When at={item.at} /></div>
          </div>
        </div>
        <FeedBottom item={item} me={me} back={back} admin={admin} />
      </article>
    );
  }
  return null;
}
