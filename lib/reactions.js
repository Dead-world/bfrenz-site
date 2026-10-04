import { prisma } from './db';

/**
 * Likes and dislikes on feed items. Every feed item already has a stable id
 * (p-<post>, b-<bulletin>, ph-<photo>, v-<video>, s-<user>-<time>, f-<friendship>,
 * sv-<survey answer>, bl-<blog>, gp-<group post>), and that id is the reaction key.
 */
import { EMOJIS, KEY_RE } from './feedKeys';

export { EMOJIS, KEY_RE };
const EMPTY = () => ({ up: 0, down: 0, mine: 0, emo: {}, myEmo: null });

/**
 * Map of key -> { up, down, mine, emo, myEmo }: mine is 1 (liked), -1 (disliked) or 0;
 * emo is { emoji: count }; myEmo is the emoji I left (or null).
 */
export async function loadReactions(keys, meId) {
  const ks = [...new Set(keys)].filter((k) => KEY_RE.test(k));
  const out = new Map(ks.map((k) => [k, EMPTY()]));
  if (!ks.length) return out;
  const [counts, mine, emoCounts, myEmos] = await Promise.all([
    prisma.reaction.groupBy({ by: ['key', 'value'], where: { key: { in: ks } }, _count: { _all: true } }),
    meId ? prisma.reaction.findMany({ where: { key: { in: ks }, userId: meId }, select: { key: true, value: true } }) : [],
    prisma.emojiReaction.groupBy({ by: ['key', 'emoji'], where: { key: { in: ks } }, _count: { _all: true } }),
    meId ? prisma.emojiReaction.findMany({ where: { key: { in: ks }, userId: meId }, select: { key: true, emoji: true } }) : [],
  ]);
  for (const c of emoCounts) {
    const r = out.get(c.key);
    if (r && EMOJIS.includes(c.emoji)) r.emo[c.emoji] = c._count._all;
  }
  for (const m of myEmos) {
    const r = out.get(m.key);
    if (r) r.myEmo = m.emoji;
  }
  for (const c of counts) {
    const r = out.get(c.key);
    if (!r) continue;
    if (c.value > 0) r.up += c._count._all;
    else r.down += c._count._all;
  }
  for (const m of mine) {
    const r = out.get(m.key);
    if (r) r.mine = m.value > 0 ? 1 : -1;
  }
  return out;
}

/** Adds `.rx` to each feed item. */
export async function attachReactions(items, meId) {
  const m = await loadReactions(items.map((i) => i.id), meId);
  for (const i of items) i.rx = m.get(i.id) || EMPTY();
  return items;
}

/** Adds `.rx` to each status post (for pages that list posts on their own). */
export async function attachPostReactions(posts, meId) {
  const m = await loadReactions(posts.map((p) => `p-${p.id}`), meId);
  for (const p of posts) p.rx = m.get(`p-${p.id}`) || EMPTY();
  return posts;
}
