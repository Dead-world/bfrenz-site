import { prisma } from './db';
import { getFriendIds } from './friends';
import { hiddenUserIds } from './moderation';
import { followingIds } from './creators';
import { EXTERNAL_HOURS } from './liveEmbed';

export const LIVE_MIN_AGE = 18;
export const STALE_MS = 40 * 1000; // a stream whose page stopped checking in is over
export const WATCH_MS = 30 * 1000; // viewers count while they keep checking in
export const TITLE_MAX = 80;
export const CHAT_MAX = 200;

const PERSON = { select: { id: true, username: true, displayName: true, avatarUrl: true, picFrame: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true } };

/** Who may go live: 18+ (from their profile), not banned. */
export function canGoLive(user) {
  if (!user || user.bannedAt) return { ok: false, reason: 'banned' };
  if (!user.age) return { ok: false, reason: 'age-missing' };
  if (user.age < LIVE_MIN_AGE) return { ok: false, reason: 'too-young' };
  return { ok: true };
}

const EXTERNAL_MS = EXTERNAL_HOURS * 60 * 60 * 1000;

/**
 * Browser streams are live while the streamer's page keeps checking in.
 * YouTube/Twitch/TikTok streams stay listed until the streamer ends them (or after EXTERNAL_HOURS).
 */
export function isLive(s) {
  if (!s || s.status !== 'live') return false;
  if (s.source && s.source !== 'browser') return Date.now() - new Date(s.startedAt).getTime() < EXTERNAL_MS;
  return Date.now() - new Date(s.lastBeat).getTime() < STALE_MS;
}

/** Prisma filter for "live right now". */
export function liveNowWhere() {
  return {
    status: 'live',
    OR: [
      { source: 'browser', sessionId: { not: '' }, lastBeat: { gte: new Date(Date.now() - STALE_MS) } },
      { source: { in: ['youtube', 'twitch', 'tiktok'] }, startedAt: { gte: new Date(Date.now() - EXTERNAL_MS) } },
    ],
  };
}

export async function endStaleStreams() {
  await prisma.liveStream.updateMany({
    where: { status: 'live', source: 'browser', lastBeat: { lt: new Date(Date.now() - STALE_MS) } },
    data: { status: 'ended', endedAt: new Date() },
  });
  await prisma.liveStream.updateMany({
    where: { status: 'live', source: { not: 'browser' }, startedAt: { lt: new Date(Date.now() - EXTERNAL_MS) } },
    data: { status: 'ended', endedAt: new Date() },
  });
}

export async function viewerCount(streamId) {
  return prisma.liveWatch.count({ where: { streamId, lastSeen: { gte: new Date(Date.now() - WATCH_MS) } } });
}

/** Live right now. scope 'mine' = frenz and creators I follow (for the feed); 'all' = everyone (the Live page). */
export async function liveStreams(me, scope = 'all') {
  await endStaleStreams();
  const hidden = me ? await hiddenUserIds(me.id) : [];
  let people = null;
  if (scope === 'mine' && me) {
    const [friends, follows] = await Promise.all([getFriendIds(me.id), followingIds(me.id)]);
    people = [...new Set([...friends, ...follows])];
  }
  const streams = await prisma.liveStream.findMany({
    where: {
      ...liveNowWhere(),
      user: { bannedAt: null },
      ...(people ? { userId: { in: people.filter((id) => !hidden.includes(id)) } } : hidden.length ? { userId: { notIn: hidden } } : {}),
    },
    orderBy: { startedAt: 'desc' },
    take: 40,
    include: { user: PERSON },
  });
  const counts = await Promise.all(streams.map((s) => viewerCount(s.id)));
  return streams.map((s, i) => ({ ...s, viewers: counts[i] }));
}

export async function loadStream(id) {
  return prisma.liveStream.findUnique({ where: { id: String(id || '') }, include: { user: PERSON } });
}

export function publicChat(c) {
  return { id: c.id, body: c.body, at: c.createdAt.toISOString(), superCoins: c.superCoins || 0, user: { username: c.user.username, name: c.user.displayName, pic: c.user.avatarUrl || '/no-pic.svg' } };
}
