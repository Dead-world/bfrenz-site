import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { blogSnippet, seesFrenzOnly } from '@/lib/blogs';
import { isAdmin, isBlockedEither } from '@/lib/moderation';
import { Pic } from '@/components/Avatar';
import Badges from '@/components/Badges';
import Notice from '@/components/Notice';
import { fmtDate } from '@/lib/util';

async function owner(username) {
  return prisma.user.findUnique({ where: { username: String(username).toLowerCase() } });
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const u = await owner(username);
  if (!u || u.bannedAt) return { title: 'Not found | BFRENZ.com', robots: { index: false } };
  return {
    title: `${u.displayName}'s Blog | BFRENZ.com`,
    description: `Read ${u.displayName}'s blog on BFRENZ.`,
    alternates: { canonical: `/${u.username}/blog` },
  };
}

export default async function BlogListPage({ params, searchParams }) {
  const { username } = await params;
  const sp = await searchParams;
  const user = await owner(username);
  if (!user || (user.bannedAt && !isAdmin(await getCurrentUser()))) notFound();
  const me = await getCurrentUser();
  const isMe = me?.id === user.id;
  if (me && !isMe && !isAdmin(me) && (await isBlockedEither(me.id, user.id))) notFound();

  const frenz = await seesFrenzOnly(me, user.id);
  const posts = await prisma.blogPost.findMany({
    where: { authorId: user.id, ...(frenz ? {} : { visibility: 'public' }) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { comments: true } } },
  });

  return (
    <div className="blog-page">
      <div className="blog-owner">
        <Link href={`/${user.username}`}><Pic user={user} size={64} /></Link>
        <div>
          <h1 className="bigname" style={{ margin: 0 }}>{user.displayName}&apos;s Blog<Badges user={user} /></h1>
          <div className="small"><Link href={`/${user.username}`}>&laquo; Back to {isMe ? 'my' : `${user.displayName}'s`} profile</Link></div>
        </div>
        {isMe && <Link href="/blog/write" className="btn" style={{ marginLeft: 'auto' }}>+ New entry</Link>}
      </div>
      <Notice sp={sp} />
      {sp?.deleted && <div className="notice ok">Entry deleted.</div>}

      {posts.length === 0 ? (
        <div className="box"><div className="box-b">
          {isMe ? <>You haven&apos;t written anything yet. <Link href="/blog/write">Write your first entry</Link>!</> : 'No blog entries yet.'}
        </div></div>
      ) : (
        <div className="blog-list">
          {posts.map((p) => (
            <article key={p.id} className="box blog-card">
              <div className="box-b">
                <div className="blog-date small">{fmtDate(p.createdAt)}{p.visibility === 'frenz' && <span className="blog-private"> · 🔒 Frenz only</span>}</div>
                <h2 className="blog-card-title"><Link href={`/${user.username}/blog/${p.id}`}>{p.title}</Link></h2>
                <p className="blog-snippet">{blogSnippet(p.body, 260)}</p>
                <div className="small">
                  <Link href={`/${user.username}/blog/${p.id}`}>Read more &raquo;</Link>
                  <span className="muted"> · {p._count.comments} {p._count.comments === 1 ? 'comment' : 'comments'}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
