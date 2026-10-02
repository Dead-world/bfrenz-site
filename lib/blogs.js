import { prisma } from './db';
import { getFriendIds } from './friends';
import { isAdmin, isBlockedEither } from './moderation';

export const BLOG_TITLE_MAX = 120;
export const BLOG_BODY_MAX = 50000;

/** Can this person see blogs by `authorId` that are set to frenz-only? */
export async function seesFrenzOnly(me, authorId) {
  if (!me) return false;
  if (me.id === authorId || isAdmin(me)) return true;
  if (await isBlockedEither(me.id, authorId)) return false;
  return (await getFriendIds(me.id)).includes(authorId);
}

/** Can this person read this blog entry? */
export async function canSeeBlog(me, post) {
  if (me && (await isBlockedEither(me.id, post.authorId)) && !isAdmin(me)) return false;
  if (post.visibility === 'public') return true;
  return seesFrenzOnly(me, post.authorId);
}

export { blogSnippet } from './blogSnippet';

/** Latest entries on a profile that this viewer may see. */
export async function latestBlogs(me, authorId, take = 3) {
  const frenz = await seesFrenzOnly(me, authorId);
  return prisma.blogPost.findMany({
    where: { authorId, ...(frenz ? {} : { visibility: 'public' }) },
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, title: true, createdAt: true, visibility: true, _count: { select: { comments: true } } },
  });
}
