import { prisma } from './db';
import { localDate } from './birthdays';

/**
 * Profile of the Week. Members vote Monday to Sunday (Eastern time), one vote each
 * (changeable). The most-voted profile wins and is featured all of the next week.
 */
const DAY = 24 * 60 * 60 * 1000;
export const MIN_ACCOUNT_AGE_MS = DAY; // brand-new accounts can't vote (stops throwaway voting)

const pad = (n) => String(n).padStart(2, '0');

/** "2026-10-05": the Monday (Eastern) of the week `date` falls in. */
export function weekKey(date = new Date()) {
  const { year, month, day } = localDate(date);
  const t = Date.UTC(year, month - 1, day);
  const dow = new Date(t).getUTCDay(); // 0 = Sunday
  const monday = new Date(t - ((dow + 6) % 7) * DAY);
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

export function shiftWeek(key, weeks) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + weeks * 7 * DAY);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}

/** Days left until voting closes (end of Sunday, Eastern). */
export function daysLeft(now = new Date()) {
  const { year, month, day } = localDate(now);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dow === 0 ? 1 : 8 - dow; // counting today
}

const PERSON = {
  id: true, username: true, displayName: true, avatarUrl: true, headline: true, nameColor: true,
  supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true, bannedAt: true,
};

/** Top profiles for a week: [{ user, votes }], most votes first (ties: who got there first). */
export async function leaderboard(week, take = 10) {
  const rows = await prisma.potwVote.groupBy({
    by: ['nomineeId'],
    where: { week, nominee: { bannedAt: null } },
    _count: { _all: true },
    _min: { updatedAt: true },
  });
  rows.sort((a, b) => b._count._all - a._count._all || a._min.updatedAt - b._min.updatedAt);
  const top = rows.slice(0, take);
  const users = await prisma.user.findMany({ where: { id: { in: top.map((r) => r.nomineeId) } }, select: PERSON });
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  return top.filter((r) => byId[r.nomineeId]).map((r) => ({ user: byId[r.nomineeId], votes: r._count._all }));
}

/** The winner of a finished week, worked out and saved the first time someone asks. */
export async function winnerFor(week) {
  if (week >= weekKey()) return null; // still voting
  const saved = await prisma.potwWinner.findUnique({ where: { week }, include: { user: { select: PERSON } } });
  if (saved) return saved.user.bannedAt ? null : saved;
  const [top] = await leaderboard(week, 1);
  if (!top) return null;
  try {
    return await prisma.potwWinner.create({ data: { week, userId: top.user.id, votes: top.votes }, include: { user: { select: PERSON } } });
  } catch {
    // Someone else saved it at the same moment.
    return prisma.potwWinner.findUnique({ where: { week }, include: { user: { select: PERSON } } });
  }
}

/** This week's featured profile = last week's winner. */
export async function currentChampion() {
  return winnerFor(shiftWeek(weekKey(), -1));
}

export async function myVote(meId, week = weekKey()) {
  if (!meId) return null;
  return prisma.potwVote.findUnique({ where: { week_voterId: { week, voterId: meId } } });
}

export async function pastWinners(take = 8) {
  return prisma.potwWinner.findMany({
    where: { user: { bannedAt: null } },
    orderBy: { week: 'desc' },
    take,
    include: { user: { select: PERSON } },
  });
}
