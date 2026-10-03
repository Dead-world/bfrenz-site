import { prisma } from './db';

/**
 * Finds the extra copies made by the old "also post on their page" reply checkbox.
 * A copy is a top-level comment that:
 *   - is on the page of the person who wrote the original comment,
 *   - is by the same person who wrote the reply, with exactly the same text,
 *   - was created within 30 seconds after that reply.
 * The real reply (in the thread where it was written) is never touched.
 */
export async function findCopiedReplies() {
  const replies = await prisma.comment.findMany({
    where: { parentId: { not: null } },
    select: { id: true, authorId: true, profileId: true, body: true, createdAt: true, parent: { select: { authorId: true } } },
    take: 50000,
  });
  // Only replies the old checkbox could have copied: to someone else's comment, on a third person's page.
  const copyable = replies.filter((r) => r.parent && r.parent.authorId !== r.authorId && r.parent.authorId !== r.profileId);
  if (!copyable.length) return { ids: [], underneath: 0 };

  const authors = [...new Set(copyable.map((r) => r.authorId))];
  const tops = await prisma.comment.findMany({
    where: { parentId: null, authorId: { in: authors } },
    select: { id: true, authorId: true, profileId: true, body: true, createdAt: true },
    take: 100000,
  });
  const byKey = new Map();
  for (const t of tops) {
    const k = `${t.profileId}|${t.authorId}|${t.body}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(t);
  }
  const ids = new Set();
  for (const r of copyable) {
    const list = byKey.get(`${r.parent.authorId}|${r.authorId}|${r.body}`) || [];
    const match = list.find((t) => {
      const gap = new Date(t.createdAt) - new Date(r.createdAt);
      return gap >= 0 && gap <= 30000 && !ids.has(t.id);
    });
    if (match) ids.add(match.id);
  }
  const list = [...ids];
  const underneath = list.length ? await prisma.comment.count({ where: { parentId: { in: list } } }) : 0;
  return { ids: list, underneath };
}

export async function deleteCopiedReplies() {
  const { ids, underneath } = await findCopiedReplies();
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const res = await prisma.comment.deleteMany({ where: { id: { in: ids.slice(i, i + 500) } } });
    deleted += res.count;
  }
  return { deleted, underneath };
}
