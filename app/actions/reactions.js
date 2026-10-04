'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notify } from '@/lib/push';
import { resolveTarget } from '@/lib/feedTargets';
import { EMOJIS, loadReactions } from '@/lib/reactions';

/**
 * Like (1) or dislike (-1) any feed item. Pressing the same one again takes it back;
 * pressing the other one switches. Returns the item's new reactions.
 */
export async function react(key, value) {
  const me = await requireUser();
  key = String(key || '');
  value = Number(value);
  if (value !== 1 && value !== -1) return null;
  const t = await resolveTarget(me, key);
  if (!t) return null;

  const existing = await prisma.reaction.findUnique({ where: { key_userId: { key, userId: me.id } } });
  if (existing && existing.value === value) {
    await prisma.reaction.delete({ where: { id: existing.id } }).catch(() => {});
  } else if (existing) {
    await prisma.reaction.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.reaction.create({ data: { key, userId: me.id, value } }).catch(() => {});
  }

  // Tell people about likes (never dislikes).
  if (value === 1 && !(existing && existing.value === 1)) {
    for (const o of t.owners) {
      if (o !== me.id) notify(o, { title: `👍 ${me.displayName} liked your ${t.what}`, body: '', url: t.url, tag: `like-${key}` });
    }
  }
  return (await loadReactions([key], me.id)).get(key);
}

/** Leave an emoji on any feed item (one per person: picking another swaps it, the same one takes it back). */
export async function reactEmoji(key, emoji) {
  const me = await requireUser();
  key = String(key || '');
  emoji = String(emoji || '');
  if (!EMOJIS.includes(emoji)) return null;
  const t = await resolveTarget(me, key);
  if (!t) return null;

  const existing = await prisma.emojiReaction.findUnique({ where: { key_userId: { key, userId: me.id } } });
  if (existing && existing.emoji === emoji) {
    await prisma.emojiReaction.delete({ where: { id: existing.id } }).catch(() => {});
  } else if (existing) {
    await prisma.emojiReaction.update({ where: { id: existing.id }, data: { emoji } });
  } else {
    await prisma.emojiReaction.create({ data: { key, userId: me.id, emoji } }).catch(() => {});
    for (const o of t.owners) {
      if (o !== me.id) notify(o, { title: `${emoji} ${me.displayName} reacted to your ${t.what}`, body: '', url: t.url, tag: `emoji-${key}` });
    }
  }
  return (await loadReactions([key], me.id)).get(key);
}
