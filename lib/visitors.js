import { prisma } from './db';
import { isBlockedEither } from './moderation';

/** Looks for the hit counter on profiles. */
export const COUNTER_STYLES = [
  ['classic', 'Classic'],
  ['orange', 'BFRENZ Orange'],
  ['lcd', 'Green LCD'],
  ['pink', 'Hot Pink'],
  ['odometer', 'Odometer'],
];

export function counterStyle(user) {
  return COUNTER_STYLES.some(([k]) => k === user.counterStyle) ? user.counterStyle : 'classic';
}

const REPEAT_MS = 30 * 60 * 1000; // a member re-visiting within 30 minutes doesn't count again
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|discord|telegram|lighthouse|headless/i;

/**
 * Counts a profile view and remembers who visited.
 * - Owners viewing their own page don't count.
 * - Logged-in members count once per 30 minutes per profile.
 * - Members with private browsing on still add to the count, but stay off the visitors list.
 */
export async function recordVisit(profile, me, userAgent = '') {
  if (!profile || (me && me.id === profile.id)) return;
  if (BOTS.test(userAgent || '')) return;

  if (!me) {
    await prisma.user.update({ where: { id: profile.id }, data: { profileViews: { increment: 1 } } });
    return;
  }
  if (me.bannedAt || (await isBlockedEither(me.id, profile.id))) return;

  const key = { profileId_visitorId: { profileId: profile.id, visitorId: me.id } };
  const prev = await prisma.profileVisit.findUnique({ where: key, select: { at: true } });
  const now = new Date();
  await prisma.profileVisit.upsert({
    where: key,
    create: { profileId: profile.id, visitorId: me.id, at: now, hidden: !!me.privateBrowsing },
    update: { at: now, hidden: !!me.privateBrowsing },
  });
  if (!prev || now - prev.at > REPEAT_MS) {
    await prisma.user.update({ where: { id: profile.id }, data: { profileViews: { increment: 1 } } });
  }
}

const VISITOR = {
  select: { id: true, username: true, displayName: true, avatarUrl: true, nameColor: true, supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true, lastSeen: true },
};

/** Recent named visitors (no private visits, banned members, or anyone blocked either way). */
export async function recentVisitors(profileId, take = 20) {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: profileId }, { blockedId: profileId }] },
    select: { blockerId: true, blockedId: true },
  });
  const hidden = blocks.map((b) => (b.blockerId === profileId ? b.blockedId : b.blockerId));
  return prisma.profileVisit.findMany({
    where: { profileId, hidden: false, visitor: { bannedAt: null }, ...(hidden.length ? { visitorId: { notIn: hidden } } : {}) },
    orderBy: { at: 'desc' },
    take,
    include: { visitor: VISITOR },
  });
}

/** How many different members visited in the last N days (named or not). */
export async function visitorCount(profileId, days = 7) {
  return prisma.profileVisit.count({
    where: { profileId, at: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
  });
}
