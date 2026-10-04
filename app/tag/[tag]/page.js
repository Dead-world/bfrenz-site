import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { postInclude } from '@/lib/feed';
import { attachCommentLikes, attachPostReactions } from '@/lib/reactions';
import { giftTotals } from '@/lib/giftsDb';
import { isAdmin } from '@/lib/moderation';
import { cleanTag } from '@/lib/tags';
import { postsWithTag, trendingTags, groupPostsWithTag } from '@/lib/mentions';
import PostText from '@/components/PostText';
import { timeAgo } from '@/lib/util';
import { PostCard } from '@/components/FeedItem';
import Notice from '@/components/Notice';

export async function generateMetadata({ params }) {
  const { tag } = await params;
  const t = cleanTag(decodeURIComponent(tag));
  return { title: t ? `#${t} | BFRENZ.com` : 'Hashtags | BFRENZ.com', robots: { index: false } };
}

export default async function TagPage({ params, searchParams }) {
  const { tag: raw } = await params;
  const sp = await searchParams;
  const tag = cleanTag(decodeURIComponent(raw));
  if (!tag) notFound();
  if (raw !== tag) redirect(`/tag/${tag}`);
  const me = await getCurrentUser();
  if (!me) redirect('/login');

  const beforeRaw = sp?.before ? new Date(String(sp.before)) : null;
  const before = beforeRaw && !isNaN(beforeRaw) ? beforeRaw : null;
  const [posts, trending, inGroups] = await Promise.all([
    postsWithTag(me, tag, postInclude(me.id), before, 20),
    trendingTags(10),
    before ? [] : groupPostsWithTag(me, tag, 8),
  ]);
  const [, , gifts] = await Promise.all([attachPostReactions(posts, me.id), attachCommentLikes(posts.map((p) => [p.comments, 'pc']), me.id), giftTotals(posts.map((p) => `p-${p.id}`))]);
  for (const p of posts) p.gifts = gifts.get(`p-${p.id}`) || null;
  const admin = isAdmin(me);
  const back = `/tag/${tag}`;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="tag-head">
        <h1 className="bigname" style={{ margin: 0 }}>#{tag}</h1>
        <Link href="/tag" className="btn ghost small-btn">All hashtags</Link>
      </div>
      <p className="small muted" style={{ margin: '4px 0 12px' }}>
        Posts with #{tag} from your frenz, creators and everyone posting publicly. Add #{tag} to your own post to show up here.
      </p>
      <Notice sp={sp} />
      {inGroups.length > 0 && (
        <div className="box">
          <div className="box-h">👥 In groups</div>
          {inGroups.map((g) => (
            <div key={g.id} className="tag-gpost">
              <div className="small muted">
                <Link href={`/${g.author.username}`}><b>{g.author.displayName}</b></Link> in{' '}
                <Link href={`/groups/${g.group.slug}#gp-${g.id}`}>{g.group.name}</Link> · {timeAgo(g.createdAt)}
              </div>
              <PostText text={g.body.length > 300 ? g.body.slice(0, 297) + '…' : g.body} />
            </div>
          ))}
        </div>
      )}
      {posts.length === 0 ? (
        <div className="box"><div className="box-b small muted">{before ? "That's everything!" : inGroups.length ? <>No posts in the feed with #{tag} yet. <Link href="/home">Post one</Link>!</> : <>No posts with #{tag} yet. <Link href="/home">Be the first</Link>!</>}</div></div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} me={me} back={back} admin={admin} />)
      )}
      {posts.length === 20 && (
        <div className="pager"><Link href={`/tag/${tag}?before=${encodeURIComponent(posts[posts.length - 1].createdAt.toISOString())}`}>Older posts &raquo;</Link></div>
      )}
      {trending.length > 0 && (
        <div className="box" style={{ marginTop: 16 }}>
          <div className="box-h">🔥 Trending this week</div>
          <div className="box-b tag-chips">
            {trending.map((t) => <Link key={t.tag} href={`/tag/${t.tag}`} className={`tag-chip${t.tag === tag ? ' on' : ''}`}>#{t.tag}</Link>)}
          </div>
        </div>
      )}
    </div>
  );
}
