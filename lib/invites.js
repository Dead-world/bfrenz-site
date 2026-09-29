import { prisma } from './db';

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
