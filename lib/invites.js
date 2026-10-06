import { prisma } from './db';
import { notify } from './push';

/**
 * Invite rewards. An invite "counts" once the new member signs up with your
 * link AND adds a profile pic (so throwaway accounts don't earn anything).
 */
export const INVITE_REWARDS = [
  { tier: 'theme', need: 3, title: 'A premium profile theme of your choice', icon: '🎨' },
  { tier: 'supporter', need: 10, title: '1 month of Supporter free', icon: '★' },
  { tier: 'pro_artist', need: 25, title: 'Pro Artist badge, forever', icon: '♫' },
];

export const SUPPORTER_BONUS_DAYS = 30;

export function inviteLink(user, base = 'https://www.bfrenz.com') {
  return `${base}/signup?ref=${user.username}`;
}

export async function inviteStats(userId) {
  const invited = await prisma.user.findMany({
    where: { referredById: userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const counted = invited.filter((u) => !u.bannedAt && u.avatarUrl);
  const claims = await prisma.purchase.findMany({
    where: { userId, stripeSessionId: { startsWith: `invite:${userId}:` } },
    select: { stripeSessionId: true },
  });
  const claimed = new Set(claims.map((c) => c.stripeSessionId.split(':')[2]));
  return { invited, counted: counted.length, claimed };
}

/** The stripeSessionId used to record a claimed reward (unique, so each can be claimed once). */
export function claimKey(userId, tier) {
  return `invite:${userId}:${tier}`;
}

/**
 * "Give 100, get 100": anyone who joins with an invite link gets WELCOME_COINS right away,
 * and the inviter gets INVITE_COINS once that new member adds a profile pic (the same
 * rule as the rewards above, so throwaway accounts don't pay out). Capped each month.
 */
export const WELCOME_COINS = 100;
export const INVITE_COINS = 100;
export const MONTHLY_INVITE_COIN_CAP = 3000; // 30 invites' worth a month

function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Pays the inviter for this member, once. Call after the member adds a profile pic. Never throws. */
export async function payInviteReward(member) {
  try {
    if (!member?.referredById || member.inviteRewardPaid || !member.avatarUrl) return false;
    // Claim it first, so two requests at once can't both pay.
    const claim = await prisma.user.updateMany({ where: { id: member.id, inviteRewardPaid: false }, data: { inviteRewardPaid: true } });
    if (!claim.count) return false;
    const inviter = await prisma.user.findUnique({ where: { id: member.referredById }, select: { id: true, bannedAt: true } });
    if (!inviter || inviter.bannedAt) return false;
    const paidThisMonth = await prisma.user.count({
      where: { referredById: inviter.id, inviteRewardPaid: true, createdAt: { gte: monthStart() } },
    });
    if (paidThisMonth * INVITE_COINS > MONTHLY_INVITE_COIN_CAP) return false;
    await prisma.user.update({ where: { id: inviter.id }, data: { coins: { increment: INVITE_COINS } } });
    notify(inviter.id, {
      title: `🎉 ${member.displayName} joined with your link! +🪙 ${INVITE_COINS}`,
      body: 'Keep inviting: every fren who joins earns you more coins.',
      url: '/invite',
      tag: 'invite-coins',
    });
    return true;
  } catch (err) {
    console.error('[invite reward]', err?.message);
    return false;
  }
}
