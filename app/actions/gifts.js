'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notify } from '@/lib/push';
import { resolveTarget } from '@/lib/feedTargets';
import { keyKind } from '@/lib/feedKeys';
import { getGift } from '@/lib/gifts';
import { giftTotals } from '@/lib/giftsDb';

/**
 * Send a gift with coins. Returns { ok, coins (my new balance), totals } or { error, needCoins }.
 * The coins come off in one step that only succeeds if you have enough, so a balance can't go negative.
 */
export async function sendGift(key, slug) {
  const me = await requireUser();
  key = String(key || '');
  const g = getGift(String(slug || ''));
  if (!g) return { error: 'That gift isn’t available.' };
  const t = await resolveTarget(me, key);
  if (!t || t.owners.length !== 1) return { error: 'You can’t send a gift here.' };
  const to = t.owners[0];
  if (to === me.id) return { error: 'You can’t send a gift to yourself 😄' };

  const recent = await prisma.gift.count({ where: { fromId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } } });
  if (recent >= 30) return { error: 'Slow down! Too many gifts in a minute.' };

  const paid = await prisma.user.updateMany({ where: { id: me.id, coins: { gte: g.coins } }, data: { coins: { decrement: g.coins } } });
  if (!paid.count) return { error: 'Not enough coins.', needCoins: true };

  await prisma.gift.create({ data: { fromId: me.id, toId: to, key, gift: g.slug, coins: g.coins } });
  // On a live stream, everyone watching sees it in the chat.
  if (keyKind(key) === 'l') {
    await prisma.liveChat.create({ data: { streamId: key.slice(2), userId: me.id, body: `🎁 sent ${g.emoji} ${g.name}!` } }).catch(() => {});
  }
  notify(to, { title: `🎁 ${me.displayName} sent you ${g.emoji} ${g.name}`, body: `On your ${t.what}`, url: t.url });

  const [fresh, totals] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id }, select: { coins: true } }),
    giftTotals([key]),
  ]);
  return { ok: true, coins: fresh?.coins ?? 0, totals: totals.get(key) || null };
}
