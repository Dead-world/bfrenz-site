import { prisma } from './db';
import { ITEM_COMMENT_KINDS, keyKind } from './feedKeys';

const AUTHOR = { select: { id: true, username: true, displayName: true, avatarUrl: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true } };

/** Top-level comments (newest `take`, shown oldest-first) with their replies, for some keys. */
export async function itemCommentsFor(keys, { hidden = [], take = 3 } = {}) {
  const ks = [...new Set(keys)].filter((k) => ITEM_COMMENT_KINDS.includes(keyKind(k)));
  const out = new Map(ks.map((k) => [k, { list: [], count: 0 }]));
  if (!ks.length) return out;
  const notHidden = hidden.length ? { authorId: { notIn: hidden } } : {};
  const [counts, rows] = await Promise.all([
    prisma.itemComment.groupBy({ by: ['key'], where: { key: { in: ks }, author: { bannedAt: null }, ...notHidden }, _count: { _all: true } }),
    prisma.itemComment.findMany({
      where: { key: { in: ks }, parentId: null, author: { bannedAt: null }, ...notHidden },
      orderBy: { createdAt: 'desc' },
      take: take * ks.length + 50,
      include: {
        author: AUTHOR,
        replies: { where: { author: { bannedAt: null }, ...notHidden }, orderBy: { createdAt: 'asc' }, take: take === Infinity ? 500 : 20, include: { author: AUTHOR } },
      },
    }),
  ]);
  for (const c of counts) out.get(c.key).count = c._count._all;
  for (const r of rows) {
    const e = out.get(r.key);
    if (e && e.list.length < take) e.list.push(r);
  }
  for (const e of out.values()) e.list.reverse();
  return out;
}

/** Every comment on one item (for the "View all" page). */
export async function allItemComments(key, hidden = []) {
  const notHidden = hidden.length ? { authorId: { notIn: hidden } } : {};
  const list = await prisma.itemComment.findMany({
    where: { key, parentId: null, author: { bannedAt: null }, ...notHidden },
    orderBy: { createdAt: 'asc' },
    take: 500,
    include: { author: AUTHOR, replies: { where: { author: { bannedAt: null }, ...notHidden }, orderBy: { createdAt: 'asc' }, take: 500, include: { author: AUTHOR } } },
  });
  const count = list.reduce((n, c) => n + 1 + c.replies.length, 0);
  return { list, count };
}

/** Adds `.cm = { list, count }` to feed items that use ItemComment. */
export async function attachItemComments(items, hidden = []) {
  const m = await itemCommentsFor(items.map((i) => i.id), { hidden });
  for (const i of items) if (m.has(i.id)) i.cm = m.get(i.id);
  return items;
}
