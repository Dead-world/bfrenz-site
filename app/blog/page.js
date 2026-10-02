import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { blogSnippet } from '@/lib/blogs';
import { getFriendIds } from '@/lib/friends';
import { hiddenUserIds } from '@/lib/moderation';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import { timeAgo } from '@/lib/util';

export const metadata = {
  title: 'Blogs | BFRENZ.com',
  description: 'The latest blog entries from BFRENZ members.',
  alternates: { canonical: '/blog' },
};

const AUTHOR = { select: { id: true, username: true, displayName: true, avatarUrl: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true } };

function Entry({ p }) {
  return (
    <article className="blog-row">
      <Link href={`/${p.author.username}`}><Pic user={p.author} size={44} /></Link>
      <div>
        <Link href={`/${p.author.username}/blog/${p.id}`} className="blog-row-title">{p.title}</Link>
        <div className="small muted">
          <Link href={`/${p.author.username}`}><Name user={p.author} /></Link><Badges user={p.author} /> · {timeAgo(p.createdAt)}
          {p.visibility === 'frenz' && ' · 🔒'} · {p._count.comments} 💬
        </div>
        <p className="small blog-snippet">{blogSnippet(p.body, 160)}</p>
      </div>
    </article>
  );
}

export default async function BlogsPage() {
  const me = await getCurrentUser();
  const [friendIds, hidden] = me ? await Promise.all([getFriendIds(me.id), hiddenUserIds(me.id)]) : [[], []];
  const people = me ? [me.id, ...friendIds.filter((id) => !hidden.includes(id))] : [];
  const include = { author: AUTHOR, _count: { select: { comments: true } } };

  const [frenz, everyone] = await Promise.all([
    me
      ? prisma.blogPost.findMany({ where: { authorId: { in: people }, author: { bannedAt: null } }, orderBy: { createdAt: 'desc' }, take: 15, include })
      : [],
    prisma.blogPost.findMany({
      where: { visibility: 'public', author: { bannedAt: null }, ...(hidden.length ? { authorId: { notIn: hidden } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include,
    }),
  ]);

  return (
    <div className="blogs-home">
      <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 className="bigname" style={{ margin: 0 }}>Blogs ✍️</h1>
        {me ? (
          <div className="actions">
            <Link href={`/${me.username}/blog`} className="btn ghost small-btn">My blog</Link>
            <Link href="/blog/write" className="btn small-btn">+ Write an entry</Link>
          </div>
        ) : (
          <Link href="/signup" className="btn small-btn">Join to start your blog</Link>
        )}
      </div>
      <div className="cols">
        {me && (
          <div className="col-left">
            <div className="box">
              <div className="box-h">From your frenz</div>
              <div className="box-b">
                {frenz.length === 0 ? (
                  <span className="small muted">Nothing yet. Be the first: <Link href="/blog/write">write an entry</Link>.</span>
                ) : (
                  frenz.map((p) => <Entry key={p.id} p={p} />)
                )}
              </div>
            </div>
          </div>
        )}
        <div className="col-right" style={me ? undefined : { width: '100%' }}>
          <div className="box">
            <div className="box-h">Latest on BFRENZ</div>
            <div className="box-b">
              {everyone.length === 0 ? <span className="small muted">No public entries yet.</span> : everyone.map((p) => <Entry key={p.id} p={p} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
