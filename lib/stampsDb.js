import { prisma } from './db';
import { getStamp } from './stamps';

/** Shop stamps this member bought. */
export async function ownedStampSlugs(userId) {
  if (!userId) return new Set();
  const rows = await prisma.purchase.findMany({ where: { userId, kind: 'stamp' }, select: { itemId: true } });
  return new Set(rows.map((r) => r.itemId));
}

const GIVER = { select: { id: true, username: true, displayName: true, avatarUrl: true, bannedAt: true } };

/**
 * A member's stamp collection, one entry per stamp: { stamp, count, givers: [user], latest }.
 * Rarest and most-given first.
 */
export async function stampCollection(userId, hidden = []) {
  const gifts = await prisma.stampGift.findMany({
    where: { toId: userId, from: { bannedAt: null }, ...(hidden.length ? { fromId: { notIn: hidden } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 2000,
    include: { from: GIVER },
  });
  const groups = new Map();
  for (const g of gifts) {
    const stamp = getStamp(g.stampSlug);
    if (!stamp) continue;
    if (!groups.has(stamp.slug)) groups.set(stamp.slug, { stamp, count: 0, givers: [], notes: [], latest: g.createdAt });
    const e = groups.get(stamp.slug);
    e.count++;
    e.givers.push(g.from);
    if (g.note) e.notes.push({ id: g.id, note: g.note, from: g.from, at: g.createdAt });
  }
  const rank = { shop: 0, rare: 1, seasonal: 2, free: 3 };
  return [...groups.values()].sort((a, b) => rank[a.stamp.tier] - rank[b.stamp.tier] || b.count - a.count);
}
