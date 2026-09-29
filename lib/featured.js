import { prisma } from './db';

/** "Cool New People": paid featured members first (labeled), then the newest members. */
export async function coolNewPeople(take = 10, excludeId = null) {
  const not = { bannedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) };
  const featured = await prisma.user.findMany({
    where: { ...not, featuredUntil: { gt: new Date() } },
    orderBy: { featuredUntil: 'desc' },
    take,
  });
  const seen = new Set(featured.map((u) => u.id));
  const newest = await prisma.user.findMany({
    where: { ...not, id: { notIn: [...seen, ...(excludeId ? [excludeId] : [])] } },
    orderBy: { createdAt: 'desc' },
    take: Math.max(0, take - featured.length),
  });
  return [...featured.map((u) => ({ ...u, _featured: true })), ...newest];
}

/** Bulletins for a member: sponsored ones (from anyone) on top, then friends' and their own. */
export async function bulletinsFor(userId, friendIds, take = 10) {
  const now = new Date();
  const sponsored = await prisma.bulletin.findMany({
    where: { sponsoredUntil: { gt: now }, author: { bannedAt: null } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { author: true },
  });
  const skip = sponsored.map((b) => b.id);
  const regular = await prisma.bulletin.findMany({
    where: { authorId: { in: [userId, ...friendIds] }, id: { notIn: skip } },
    orderBy: { createdAt: 'desc' },
    take,
    include: { author: true },
  });
  return [...sponsored.map((b) => ({ ...b, _sponsored: true })), ...regular];
}
