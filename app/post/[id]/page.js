import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canSeePost, postInclude } from '@/lib/feed';
import { isAdmin } from '@/lib/moderation';
import { PostCard } from '@/components/FeedItem';
import { attachCommentLikes, attachPostReactions, loadReactions } from '@/lib/reactions';
import { Pic } from '@/components/Avatar';
import PostText from '@/components/PostText';
import MiniSong from '@/components/MiniSong';
import VideoPlayer from '@/components/VideoPlayer';
import ShareButton from '@/components/ShareButton';
import Notice from '@/components/Notice';
import { timeAgo } from '@/lib/util';

/** Posts anyone may see without logging in: public (creator) posts and the official account's. */
async function publicPost(id) {
  const post = await prisma.post.findUnique({
    where: { id: String(id || '').slice(0, 40) },
    include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOfficial: true, bannedAt: true } }, _count: { select: { comments: true } } },
  });
  if (!post || post.author.bannedAt) return { post: null, open: false };
  return { post, open: post.visibility === 'public' || post.author.isOfficial };
}

/** Link previews: the post itself for public posts, nothing personal for frenz-only ones. */
export async function generateMetadata({ params }) {
  const { id } = await params;
  const { post, open } = await publicPost(id);
  if (!post || !open) {
    return {
      title: 'A post on BFRENZ',
      description: 'Someone shared a post with you on BFRENZ. Log in or join free to see it.',
      robots: { index: false },
      openGraph: { title: 'A post on BFRENZ', description: 'Log in or join free to see it.', images: ['/share.png'] },
    };
  }
  const title = `${post.author.displayName} on BFRENZ`;
  const description = (post.body || (post.imageUrls.length ? '📸 Shared a photo' : post.songUrl ? '🎵 Shared a song' : '🎬 Shared a video')).replace(/\s+/g, ' ').slice(0, 200);
  const images = post.imageUrls.length ? [post.imageUrls[0]] : post.youtubeId ? [`https://i.ytimg.com/vi/${post.youtubeId}/hqdefault.jpg`] : ['/share.png'];
  return {
    title,
    description,
    openGraph: { type: 'article', title, description, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

export default async function PostPage({ params, searchParams }) {
  const me = await getCurrentUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!me) return <VisitorView id={id} />;

  const admin = isAdmin(me);
  const inc = postInclude(me.id);
  const post = await prisma.post.findUnique({
    where: { id },
    include: { ...inc, comments: { where: { parentId: null }, orderBy: { createdAt: 'asc' }, take: 300, include: { ...inc.comments.include, replies: { ...inc.comments.include.replies, take: 200 } } } },
  });
  if (!post) notFound();
  const author = await prisma.user.findUnique({ where: { id: post.authorId }, select: { bannedAt: true } });
  if ((author?.bannedAt && !admin) || !(await canSeePost(me, post, admin))) notFound();
  await Promise.all([attachPostReactions([post], me.id), attachCommentLikes([[post.comments, 'pc']], me.id)]);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="small" style={{ marginBottom: 10 }}>
        <Link href="/home">&laquo; Back to your feed</Link>
      </div>
      <Notice sp={sp} />
      <PostCard post={post} me={me} back={`/post/${post.id}`} admin={admin} allComments />
    </div>
  );
}

/** What someone who isn't logged in sees when they open a shared post. */
async function VisitorView({ id }) {
  const { post, open } = await publicPost(id);
  if (!post) notFound();
  const next = encodeURIComponent(`/post/${post.id}`);
  const join = `/signup?ref=${encodeURIComponent(post.author.username)}`;

  if (!open) {
    return (
      <div style={{ maxWidth: 520, margin: '20px auto' }}>
        <div className="box public-post-cta">
          <div style={{ fontSize: 44 }}>🔒</div>
          <h2>This post is for frenz only</h2>
          <p className="muted">Log in to see it. New here? Joining is free and takes a minute.</p>
          <div className="actions">
            <Link href={`/login?next=${next}`} className="btn">Log in to see it</Link>
            <Link href={join} className="btn ghost">Join free</Link>
          </div>
        </div>
      </div>
    );
  }

  const rx = (await loadReactions([`p-${post.id}`], null)).get(`p-${post.id}`);
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <article className="box feed-item feed-post">
        <header className="feed-head">
          <Link href={`/${post.author.username}`}><Pic user={post.author} size={44} /></Link>
          <div className="feed-head-main">
            <div><Link href={`/${post.author.username}`} className="feed-who"><b>{post.author.displayName}</b></Link></div>
            <span className="feed-when">{timeAgo(post.createdAt)}</span>
          </div>
        </header>
        <PostText text={post.body} />
        {post.imageUrls.length > 0 && (
          <div className={`feed-images n${Math.min(post.imageUrls.length, 4)}`}>
            {post.imageUrls.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="" loading="lazy" /></a>)}
          </div>
        )}
        {(post.videoUrl || post.youtubeId) && <div className="feed-media"><VideoPlayer video={{ url: post.videoUrl, youtubeId: post.youtubeId, title: 'Video' }} /></div>}
        {post.songUrl && <div className="feed-media"><MiniSong url={post.songUrl} /></div>}
        <footer className="feed-actions">
          <span className="small muted">👍 {rx?.up || 0} · 💬 {post._count.comments}</span>
          <ShareButton path={`/post/${post.id}`} title={`${post.author.displayName} on BFRENZ`} text={post.body} />
        </footer>
      </article>
      <div className="box public-post-cta">
        <h2>Join {post.author.displayName} on BFRENZ</h2>
        <p className="muted">Custom profiles, Top 8, profile songs, and your frenz, all in one place. Free.</p>
        <div className="actions">
          <Link href={join} className="btn">Join free</Link>
          <Link href={`/login?next=${next}`} className="btn ghost">Log in to like &amp; comment</Link>
        </div>
      </div>
    </div>
  );
}
