import Link from 'next/link';
import { attachCommentLikes } from '@/lib/reactions';
import CommentLike from '@/components/CommentLike';
import EditCommentForm, { EditCommentButton } from '@/components/EditComment';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { blogSnippet, canSeeBlog } from '@/lib/blogs';
import { isAdmin } from '@/lib/moderation';
import { cleanHtml } from '@/lib/sanitize';
import { addBlogComment, deleteBlog, deleteBlogComment } from '@/app/actions/blogs';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import PostText from '@/components/PostText';
import ShareButtons from '@/components/ShareButtons';
import Notice from '@/components/Notice';
import { siteUrl } from '@/lib/email';
import { fmtDate } from '@/lib/util';

async function load(username, id) {
  const post = await prisma.blogPost.findUnique({ where: { id: String(id) }, include: { author: true } });
  if (!post || post.author.username !== String(username).toLowerCase()) return null;
  return post;
}

export async function generateMetadata({ params }) {
  const { username, id } = await params;
  const post = await load(username, id);
  if (!post || post.author.bannedAt || post.visibility !== 'public') return { title: 'Blog | BFRENZ.com', robots: { index: false } };
  const title = `${post.title} · ${post.author.displayName}'s Blog | BFRENZ.com`;
  const description = blogSnippet(post.body, 160);
  return {
    title,
    description,
    alternates: { canonical: `/${post.author.username}/blog/${post.id}` },
    openGraph: { type: 'article', title, description, images: ['/share.png'] },
  };
}

export default async function BlogEntryPage({ params, searchParams }) {
  const { username, id } = await params;
  const sp = await searchParams;
  const post = await load(username, id);
  const me = await getCurrentUser();
  const admin = isAdmin(me);
  if (!post || (post.author.bannedAt && !admin)) notFound();

  if (!(await canSeeBlog(me, post))) {
    return (
      <div className="box"><div className="box-b">
        🔒 This entry is for {post.author.displayName}&apos;s frenz only.{' '}
        <Link href={`/${post.author.username}`}>Visit their profile</Link>
        {!me && <> or <Link href="/signup">join BFRENZ</Link></>}.
      </div></div>
    );
  }

  const isMe = me?.id === post.authorId;
  const comments = await prisma.blogComment.findMany({
    where: { postId: post.id, author: { bannedAt: null } },
    orderBy: { createdAt: 'asc' },
    take: 300,
    include: { author: true },
  });
  if (me && comments.length) await attachCommentLikes([[comments, 'bc']], me.id);
  const back = `/${post.author.username}/blog/${post.id}`;
  const u = post.author;

  return (
    <div className="blog-page">
      <div className="small"><Link href={`/${u.username}/blog`}>&laquo; {isMe ? 'My blog' : `${u.displayName}'s blog`}</Link></div>
      <Notice sp={sp} />
      {sp?.posted && <div className="notice ok">Posted! Your frenz will see it in their feed. 🎉</div>}

      <article className="box blog-entry">
        <div className="box-b">
          <div className="blog-entry-head">
            <Link href={`/${u.username}`}><Pic user={u} size={56} /></Link>
            <div>
              <h1 className="blog-entry-title">{post.title}</h1>
              <div className="small muted">
                by <Link href={`/${u.username}`}><Name user={u} /></Link><Badges user={u} /> · {fmtDate(post.createdAt)}
                {post.updatedAt - post.createdAt > 60000 && <> · edited</>}
                {post.visibility === 'frenz' && <> · 🔒 Frenz only</>}
              </div>
              {post.mood && <div className="small blog-mood"><b>Current mood:</b> {post.mood}</div>}
            </div>
          </div>
          <div className="blog-body blurb" dangerouslySetInnerHTML={{ __html: cleanHtml(post.body) }} />
          <div className="actions blog-entry-actions">
            {isMe && <Link href={`/blog/write?id=${post.id}`} className="btn small-btn">Edit</Link>}
            {(isMe || admin) && (
              <form action={deleteBlog}>
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" className="btn ghost small-btn">Delete</button>
              </form>
            )}
            {me && !isMe && (
              <Link className="small muted" href={`/report?kind=blog&id=${post.id}&back=${encodeURIComponent(back)}`}>Report</Link>
            )}
          </div>
          {post.visibility === 'public' && (
            <div className="blog-share">
              <ShareButtons url={`${siteUrl()}${back}`} text={`"${post.title}" on BFRENZ`} />
            </div>
          )}
        </div>
      </article>

      <section className="box" id="comments">
        <div className="box-h">Comments ({comments.length})</div>
        {comments.length > 0 && (
          <ul className="blog-comments">
            {comments.map((c) => (
              <li key={c.id} id={`bc-${c.id}`}>
                <Link href={`/${c.author.username}`}><Pic user={c.author} size={40} /></Link>
                <div className="blog-comment-main">
                  <div className="small">
                    <Link href={`/${c.author.username}`}><b><Name user={c.author} /></b></Link>
                    <Badges user={c.author} />
                    <span className="muted"> · {fmtDate(c.createdAt)}{c.editedAt ? ' · edited' : ''}</span>
                  </div>
                  <PostText text={c.body} />
                  {me && c.authorId === me.id && <EditCommentForm kind="bc" id={c.id} body={c.body} back={back} max={3000} />}
                  {me && (
                    <div className="small actions">
                      <CommentLike k={`bc-${c.id}`} rx={c.rx} />
                      {c.authorId === me.id && <EditCommentButton kind="bc" id={c.id} />}
                      {(c.authorId === me.id || isMe || admin) && (
                        <form action={deleteBlogComment}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="back" value={back} />
                          <button type="submit" className="linkbtn small muted">Delete</button>
                        </form>
                      )}
                      {c.authorId !== me.id && (
                        <Link className="muted" href={`/report?kind=blogcomment&id=${c.id}&back=${encodeURIComponent(back)}`}>Report</Link>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="box-b">
          {me ? (
            <form action={addBlogComment}>
              <input type="hidden" name="id" value={post.id} />
              <input type="hidden" name="back" value={back} />
              <textarea name="body" rows={3} maxLength={3000} placeholder="Leave a comment…" required />
              <div style={{ marginTop: 8 }}><button type="submit" className="btn small-btn">Post comment</button></div>
            </form>
          ) : (
            <div className="small"><Link href={`/signup?ref=${u.username}`}>Join BFRENZ</Link> or <Link href="/login">log in</Link> to comment.</div>
          )}
        </div>
      </section>
    </div>
  );
}
