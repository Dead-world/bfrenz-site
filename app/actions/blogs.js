'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cleanHtml } from '@/lib/sanitize';
import { safeBack, str, withParam } from '@/lib/util';
import { BLOG_BODY_MAX, BLOG_TITLE_MAX, canSeeBlog } from '@/lib/blogs';
import { isAdmin, isBlockedEither } from '@/lib/moderation';
import { notify } from '@/lib/push';

/** Create a new entry, or save changes when an id is sent. */
export async function saveBlog(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const title = str(formData, 'title', BLOG_TITLE_MAX);
  const raw = String(formData.get('body') || '').slice(0, BLOG_BODY_MAX);
  const body = cleanHtml(raw).trim();
  const mood = str(formData, 'mood', 60);
  const visibility = formData.get('visibility') === 'frenz' ? 'frenz' : 'public';
  const again = id ? `/blog/write?id=${id}` : '/blog/write';

  if (!title) redirect(withParam(again, 'error', 'Give your entry a title.'));
  if (!body.replace(/<[^>]*>/g, '').trim() && !/<img/i.test(body)) redirect(withParam(again, 'error', 'Your entry is empty.'));

  if (id) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post || post.authorId !== me.id) redirect('/blog/write');
    await prisma.blogPost.update({ where: { id }, data: { title, body, mood, visibility } });
    redirect(`/${me.username}/blog/${id}?saved=1`);
  }

  const today = await prisma.blogPost.count({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (today >= 10) redirect(withParam(again, 'error', "That's 10 entries today. Save the rest for tomorrow!"));

  const post = await prisma.blogPost.create({ data: { authorId: me.id, title, body, mood, visibility } });
  redirect(`/${me.username}/blog/${post.id}?posted=1`);
}

export async function deleteBlog(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const post = await prisma.blogPost.findUnique({ where: { id }, select: { authorId: true } });
  if (post && (post.authorId === me.id || isAdmin(me))) {
    await prisma.blogPost.delete({ where: { id } });
  }
  redirect(`/${me.username}/blog?deleted=1`);
}

export async function addBlogComment(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const back = safeBack(formData.get('back'), '/home');
  const body = str(formData, 'body', 3000);
  if (!body) redirect(withParam(back, 'error', 'Your comment was empty.'));

  const post = await prisma.blogPost.findUnique({ where: { id }, include: { author: { select: { username: true } } } });
  if (!post || !(await canSeeBlog(me, post))) redirect(back);
  if (await isBlockedEither(me.id, post.authorId)) redirect(withParam(back, 'error', "You can't comment here."));

  const recent = await prisma.blogComment.count({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recent >= 10) redirect(withParam(back, 'error', 'Slow down! Too many comments in a minute.'));

  const c = await prisma.blogComment.create({ data: { postId: id, authorId: me.id, body } });
  if (post.authorId !== me.id) {
    notify(post.authorId, {
      title: `💬 ${me.displayName} commented on your blog`,
      body: `"${post.title}": ${body.slice(0, 90)}`,
      url: `/${post.author.username}/blog/${id}#bc-${c.id}`,
    });
  }
  redirect(`${back}#bc-${c.id}`);
}

export async function deleteBlogComment(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const back = safeBack(formData.get('back'), '/home');
  const c = await prisma.blogComment.findUnique({ where: { id }, include: { post: { select: { authorId: true } } } });
  // The commenter, the blog's author, or an admin can remove a comment.
  if (c && (c.authorId === me.id || c.post.authorId === me.id || isAdmin(me))) {
    await prisma.blogComment.delete({ where: { id } });
  }
  redirect(`${back}#comments`);
}
