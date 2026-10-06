import { prisma } from './db';
import { notify } from './push';

/**
 * Monthly invite contest: whoever brings in the most new members this month (counted the same
 * way as invite rewards: they joined with your link and added a profile pic) wins prizes,
 * paid automatically on the 1st by the daily job.
 */
export const CONTEST_PRIZES = [
  { rank: 1, coins: 3000, supporterMonths: 3, label: '🥇 🪙 3,000 coins + 3 months of Supporter' },
  { rank: 2, coins: 1500, supporterMonths: 1, label: '🥈 🪙 1,500 coins + 1 month of Supporter' },
  { rank: 3, coins: 750, supporterMonths: 0, label: '🥉 🪙 750 coins' },
];
export const CONTEST_MIN = 3; // need at least this many counted invites to win

const DAY = 24 * 60 * 60 * 1000;
const PERSON = { select: { id: true, username: true, displayName: true, avatarUrl: true, picFrame: true, bannedAt: true, isOfficial: true } };

/** First moment of the month (UTC) that `d` is in, plus `add` months. */
export function monthStart(d = new Date(), add = 0) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + add, 1));
}

/** Top inviters for the month starting at `start`: [{ user, count }], biggest first. */
export async function contestLeaders(start = monthStart(), take = 10) {
  const end = monthStart(start, 1);
  const founder = (process.env.FOUNDER_USERNAME || '').toLowerCase();
  const rows = await prisma.user.groupBy({
    by: ['referredById'],
    where: { referredById: { not: null }, createdAt: { gte: start, lt: end }, avatarUrl: { not: '' }, bannedAt: null },
    _count: { _all: true },
    orderBy: { _count: { referredById: 'desc' } },
    take: take + 5,
  });
  const people = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.referredById) } }, ...PERSON });
  const byId = new Map(people.map((p) => [p.id, p]));
  return rows
    .map((r) => ({ user: byId.get(r.referredById), count: r._count._all }))
    // The founder and the site's own bot accounts don't compete.
    .filter((r) => r.user && !r.user.bannedAt && !r.user.isOfficial && r.user.username !== founder)
    .slice(0, take);
}

/** How many counted invites this member has this month. */
export async function myContestCount(userId, start = monthStart()) {
  return prisma.user.count({ where: { referredById: userId, createdAt: { gte: start, lt: monthStart(start, 1) }, avatarUrl: { not: '' }, bannedAt: null } });
}

/**
 * Pays last month's winners. Safe to run every day: each prize is recorded once
 * (a unique purchase record), so it's never paid twice.
 */
export async function awardLastMonth(now = new Date()) {
  const start = monthStart(now, -1);
  const tag = start.toISOString().slice(0, 7); // e.g. 2026-10
  const leaders = (await contestLeaders(start, 3)).filter((l) => l.count >= CONTEST_MIN);
  const paid = [];
  for (let i = 0; i < leaders.length; i++) {
    const prize = CONTEST_PRIZES[i];
    const { user, count } = leaders[i];
    try {
      await prisma.purchase.create({ data: { userId: user.id, kind: 'invite_contest', itemId: `${tag}:${prize.rank}`, amountCents: 0, stripeSessionId: `contest:${tag}:${prize.rank}` } });
    } catch (e) {
      if (e?.code === 'P2002') continue; // already paid
      throw e;
    }
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { bonusSupporterUntil: true } });
    const base = u?.bonusSupporterUntil && u.bonusSupporterUntil > now ? u.bonusSupporterUntil : now;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        coins: { increment: prize.coins },
        ...(prize.supporterMonths ? { bonusSupporterUntil: new Date(base.getTime() + prize.supporterMonths * 31 * DAY) } : {}),
      },
    });
    notify(user.id, {
      title: `🏆 You placed #${prize.rank} in the BFRENZ invite contest!`,
      body: `${count} frenz joined with your link. Your prize: ${prize.label.replace(/^\S+\s/, '')}. Thank you! 🧡`,
      url: '/invite',
    });
    paid.push({ rank: prize.rank, username: user.username, count });
  }
  return paid;
}
