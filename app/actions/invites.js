'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getTheme } from '@/lib/themes';
import { INVITE_REWARDS, SUPPORTER_BONUS_DAYS, claimKey, inviteStats } from '@/lib/invites';
import { str, withParam } from '@/lib/util';

const DAY = 24 * 60 * 60 * 1000;

export async function claimInviteReward(formData) {
  const me = await requireUser();
  const tier = str(formData, 'tier', 20);
  const reward = INVITE_REWARDS.find((r) => r.tier === tier);
  if (!reward) redirect('/invite');

  const { counted, claimed } = await inviteStats(me.id);
  if (claimed.has(tier)) redirect(withParam('/invite', 'error', 'You already claimed that one.'));
  if (counted < reward.need) redirect(withParam('/invite', 'error', `You need ${reward.need} invites for that. Keep going!`));

  let itemId = '';
  if (tier === 'theme') {
    const t = getTheme(str(formData, 'slug', 60));
    if (!t || t.price === 0) redirect(withParam('/invite', 'error', 'Pick a premium theme.'));
    itemId = t.slug;
  }

  try {
    // Recorded like a $0 purchase so it can only be claimed once.
    await prisma.purchase.create({
      data: {
        userId: me.id,
        kind: tier === 'theme' ? 'theme' : 'invite_reward',
        itemId: itemId || tier,
        amountCents: 0,
        stripeSessionId: claimKey(me.id, tier),
      },
    });
  } catch (e) {
    if (e?.code === 'P2002') redirect(withParam('/invite', 'error', 'You already claimed that one.'));
    throw e;
  }

  if (tier === 'supporter') {
    const now = Date.now();
    const base = Math.max(
      now,
      me.supporterUntil ? new Date(me.supporterUntil).getTime() : 0,
      me.bonusSupporterUntil ? new Date(me.bonusSupporterUntil).getTime() : 0,
    );
    await prisma.user.update({
      where: { id: me.id },
      data: { bonusSupporterUntil: new Date(base + SUPPORTER_BONUS_DAYS * DAY) },
    });
  }
  if (tier === 'pro_artist') {
    await prisma.user.update({ where: { id: me.id }, data: { artistPro: true, isArtist: true } });
  }
  if (tier === 'theme') {
    await prisma.user.update({ where: { id: me.id }, data: { theme: itemId } });
  }
  redirect('/invite?claimed=1');
}
