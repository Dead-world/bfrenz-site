import { prisma } from './db';

/**
 * Makes sure each post's currently-pinned Super Comments are in its comment list
 * (the feed only loads the newest few comments), and puts them first.
 */
export async function attachPinnedSupers(posts, include, hidden = []) {
  const ids = posts.map((p) => p.id);
  if (!ids.length) return posts;
  const pinned = await prisma.postComment.findMany({
    where: { postId: { in: ids }, parentId: null, superUntil: { gt: new Date() }, author: { bannedAt: null }, ...(hidden.length ? { authorId: { notIn: hidden } } : {}) },
    orderBy: [{ superCoins: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include,
  });
  for (const p of posts) {
    const mine = pinned.filter((c) => c.postId === p.id).slice(0, 3);
    if (!mine.length) continue;
    const ids2 = new Set(mine.map((c) => c.id));
    p.comments = [...mine, ...(p.comments || []).filter((c) => !ids2.has(c.id))];
  }
  return posts;
}
