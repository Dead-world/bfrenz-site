import { prisma } from './db';

// Birthdays flip over at midnight Eastern time (most members are in the US).
export const BDAY_TZ = process.env.BIRTHDAY_TIMEZONE || 'America/New_York';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** { year, month, day } for a date, in the birthday time zone. */
export function localDate(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: BDAY_TZ, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d);
  const get = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
  return { year: get('year'), month: get('month'), day: get('day') };
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * Which stored birthdays count as "today" on this date.
 * Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
 */
export function birthdayKeys(date) {
  const keys = [{ birthMonth: date.month, birthDay: date.day }];
  if (date.month === 2 && date.day === 28 && !isLeap(date.year)) keys.push({ birthMonth: 2, birthDay: 29 });
  return keys;
}

export function isBirthdayToday(user, today = localDate()) {
  if (!user?.birthMonth || !user?.birthDay) return false;
  return birthdayKeys(today).some((k) => k.birthMonth === user.birthMonth && k.birthDay === user.birthDay);
}

export function birthdayLabel(user) {
  if (!user?.birthMonth || !user?.birthDay) return '';
  return `${MONTHS[user.birthMonth - 1]} ${user.birthDay}`;
}

const PERSON = {
  id: true, username: true, displayName: true, avatarUrl: true, nameColor: true, supporterUntil: true,
  bonusSupporterUntil: true, artistPro: true, isArtist: true, birthMonth: true, birthDay: true,
};

/** People in `ids` whose birthday is today. */
export async function birthdaysToday(ids) {
  if (!ids.length) return [];
  return prisma.user.findMany({
    where: { id: { in: ids }, bannedAt: null, OR: birthdayKeys(localDate()) },
    select: PERSON,
  });
}

/** People in `ids` with a birthday in the next `days` days (not counting today), soonest first. */
export async function upcomingBirthdays(ids, days = 7) {
  if (!ids.length) return [];
  const DAY = 24 * 60 * 60 * 1000;
  const dates = [];
  for (let i = 1; i <= days; i++) dates.push(localDate(new Date(Date.now() + i * DAY)));
  const keys = dates.flatMap(birthdayKeys);
  const people = await prisma.user.findMany({ where: { id: { in: ids }, bannedAt: null, OR: keys }, select: PERSON });
  const inDays = (u) => dates.findIndex((d) => birthdayKeys(d).some((k) => k.birthMonth === u.birthMonth && k.birthDay === u.birthDay)) + 1;
  return people.map((u) => ({ ...u, inDays: inDays(u) })).sort((a, b) => a.inDays - b.inDays);
}
