import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { saveBlog } from '@/app/actions/blogs';
import { BLOG_TITLE_MAX } from '@/lib/blogs';
import Notice from '@/components/Notice';

export const metadata = { title: 'Write a blog entry | BFRENZ.com', robots: { index: false } };

export default async function WriteBlogPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const id = sp?.id ? String(sp.id) : '';
  const post = id ? await prisma.blogPost.findUnique({ where: { id } }) : null;
  if (id && (!post || post.authorId !== me.id)) redirect('/blog/write');

  return (
    <div className="blog-write">
      <div className="small"><Link href={`/${me.username}/blog`}>&laquo; My blog</Link></div>
      <h1 className="bigname">{post ? 'Edit blog entry' : 'New blog entry'}</h1>
      <Notice sp={sp} />
      <form action={saveBlog} className="box">
        <div className="box-b">
          {post && <input type="hidden" name="id" value={post.id} />}
          <label className="blog-label" htmlFor="bt">Title</label>
          <input id="bt" name="title" maxLength={BLOG_TITLE_MAX} defaultValue={post?.title || ''} placeholder="What's this one about?" required className="blog-title-input" />

          <label className="blog-label" htmlFor="bb">Entry</label>
          <textarea id="bb" name="body" rows={16} defaultValue={post?.body || ''} placeholder="Write it all out… (HTML works: <b>, <i>, <img>, <font color>, <marquee>)" required />
          <div className="small muted">Line breaks are kept. Paste image links with &lt;img src=&quot;…&quot;&gt;.</div>

          <div className="blog-opts">
            <div>
              <label className="blog-label" htmlFor="bm">Current mood <span className="muted small">(optional)</span></label>
              <input id="bm" name="mood" maxLength={60} defaultValue={post?.mood || ''} placeholder="reflective 🌙" />
            </div>
            <div>
              <span className="blog-label">Who can read it</span>
              <label className="check"><input type="radio" name="visibility" value="public" defaultChecked={(post?.visibility || 'public') === 'public'} /> Everyone</label>
              <label className="check"><input type="radio" name="visibility" value="frenz" defaultChecked={post?.visibility === 'frenz'} /> Frenz only</label>
            </div>
          </div>

          <div className="actions" style={{ marginTop: 16 }}>
            <button type="submit" className="btn">{post ? 'Save changes' : 'Post entry'}</button>
            <Link href={post ? `/${me.username}/blog/${post.id}` : `/${me.username}/blog`} className="btn ghost">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
