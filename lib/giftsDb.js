import { prisma } from './db';
import { GIFTS } from './gifts';

const ORDER = new Map(GIFTS.map((g, i) => [g.slug, i]));
const emojiOf = (slug) => GIFTS.find((g) => g.slug === slug)?.emoji || '🎁';

/** Gift totals for some keys: key -> { count, coins, top: ['👑','🌹'] } (biggest gifts first). */
export async function giftTotals(keys) {
  const ks = [...new Set(keys)].filter(Boolean);
  const out = new Map();
  if (!ks.length) return out;
  const rows = await prisma.gift.groupBy({ by: ['key', 'gift'], where: { key: { in: ks } }, _count: { _all: true }, _sum: { coins: true } });
  for (const r of rows) {
    const t = out.get(r.key) || { count: 0, coins: 0, kinds: [] };
    t.count += r._count._all;
    t.coins += r._sum.coins || 0;
    t.kinds.push(r.gift);
    out.set(r.key, t);
  }
  for (const t of out.values()) {
    t.top = t.kinds.sort((a, b) => (ORDER.get(b) ?? 0) - (ORDER.get(a) ?? 0)).slice(0, 3).map(emojiOf);
    delete t.kinds;
  }
  return out;
}

/** Adds `.gifts` to feed items (and to status posts, which draw their own footer). */
export async function attachGifts(items) {
  const m = await giftTotals(items.map((i) => i.id));
  for (const i of items) {
    i.gifts = m.get(i.id) || null;
    if (i.type === 'post') i.post.gifts = i.gifts;
  }
  return items;
}

/** Everything a member has been given, for their profile: [{ emoji, name, n }] biggest first. */
export async function giftsReceived(userId) {
  const rows = await prisma.gift.groupBy({ by: ['gift'], where: { toId: userId }, _count: { _all: true } });
  return rows
    .map((r) => ({ ...(GIFTS.find((g) => g.slug === r.gift) || { emoji: '🎁', name: r.gift }), n: r._count._all }))
    .sort((a, b) => (ORDER.get(b.slug) ?? 0) - (ORDER.get(a.slug) ?? 0));
}
