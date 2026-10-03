import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rtcConfigured } from '@/lib/rtc';
import { CHAT_MAX, TITLE_MAX, canGoLive, isLive, loadStream, publicChat, viewerCount } from '@/lib/live';
import { isAdmin, isBlockedEither, hiddenUserIds } from '@/lib/moderation';
import { getFriendIds } from '@/lib/friends';
import { notify } from '@/lib/push';
import { parseStreamLink } from '@/lib/liveEmbed';

export const dynamic = 'force-dynamic';

const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const CHAT_USER = { select: { username: true, displayName: true, avatarUrl: true } };

async function chatsSince(streamId, after) {
  const since = after ? new Date(after) : null;
  const rows = await prisma.liveChat.findMany({
    where: { streamId, user: { bannedAt: null }, ...(since && !isNaN(since) ? { createdAt: { gt: since } } : {}) },
    orderBy: { createdAt: since ? 'asc' : 'desc' },
    take: 60,
    include: { user: CHAT_USER },
  });
  return (since ? rows : rows.reverse()).map(publicChat);
}

/** Tell frenz and followers someone went live (once per stream, up to 500 people). */
async function announce(me, stream) {
  const [friends, followers, hidden] = await Promise.all([
    getFriendIds(me.id),
    prisma.follow.findMany({ where: { followingId: me.id }, select: { followerId: true }, take: 500 }),
    hiddenUserIds(me.id),
  ]);
  const ids = [...new Set([...friends, ...followers.map((f) => f.followerId)])].filter((id) => !hidden.includes(id)).slice(0, 500);
  for (const id of ids) {
    notify(id, { title: `🔴 ${me.displayName} is live`, body: stream.title || 'Tap to watch now.', url: `/live/${stream.id}`, tag: `live-${stream.id}` });
  }
}

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me || me.bannedAt) return fail('Please log in again.', 401);
  let d;
  try {
    d = await request.json();
  } catch {
    return fail('Bad request.');
  }

  if (d.action === 'start') {
    const ok = canGoLive(me);
    if (!ok.ok) return fail(ok.reason === 'age-missing' ? 'Add your age to your profile first.' : 'You need to be 18 or older to go live.', 403);
    const recent = await prisma.liveStream.count({ where: { userId: me.id, startedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (recent >= 6) return fail('You’ve started a lot of streams. Try again in a bit.', 429);
    await prisma.liveStream.updateMany({ where: { userId: me.id, status: 'live' }, data: { status: 'ended', endedAt: new Date() } });
    const title = String(d.title || '').replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX);
    let source = 'browser';
    let streamRef = '';
    if (d.link) {
      const parsed = parseStreamLink(d.link);
      if (parsed.error) return fail(parsed.error);
      source = parsed.source;
      streamRef = parsed.ref;
    } else if (!rtcConfigured()) {
      return fail('Streaming from the browser isn’t switched on yet. Use a YouTube, Twitch or TikTok link.', 503);
    }
    const stream = await prisma.liveStream.create({ data: { userId: me.id, title, source, streamRef } });
    // Link streams are live right away, so tell frenz and followers now.
    if (source !== 'browser') after(() => announce(me, stream));
    return NextResponse.json({ id: stream.id, source, streamRef });
  }

  const stream = await loadStream(d.id);
  if (!stream) return fail('Stream not found.', 404);
  const mine = stream.userId === me.id;

  switch (d.action) {
    case 'announce': {
      // Called once the camera is actually streaming, so nobody gets a notification for a stream that never started.
      if (!mine || !isLive(stream) || stream.source !== 'browser' || !stream.sessionId) return fail('Not live yet.', 409);
      after(() => announce(me, stream));
      return NextResponse.json({ ok: true });
    }
    case 'beat': {
      if (!mine) return fail('Not your stream.', 403);
      if (stream.status !== 'live') return NextResponse.json({ status: 'ended', endedBy: stream.endedBy });
      const viewers = await viewerCount(stream.id);
      await prisma.liveStream.update({ where: { id: stream.id }, data: { lastBeat: new Date(), peakViewers: Math.max(stream.peakViewers, viewers) } });
      return NextResponse.json({ status: 'live', viewers, chats: await chatsSince(stream.id, d.after) });
    }
    case 'watch': {
      if (!mine && (await isBlockedEither(me.id, stream.userId))) return fail('Stream not found.', 404);
      const live = isLive(stream) && (stream.source !== 'browser' || !!stream.sessionId);
      if (live && !mine) {
        await prisma.liveWatch.upsert({
          where: { streamId_userId: { streamId: stream.id, userId: me.id } },
          create: { streamId: stream.id, userId: me.id },
          update: { lastSeen: new Date() },
        });
      }
      return NextResponse.json({
        status: live ? 'live' : stream.status === 'live' && stream.source === 'browser' && !stream.sessionId && isLive({ ...stream, sessionId: 'x' }) ? 'starting' : 'ended',
        source: stream.source,
        sessionId: live && stream.source === 'browser' ? stream.sessionId : null,
        viewers: await viewerCount(stream.id),
        chats: await chatsSince(stream.id, d.after),
      });
    }
    case 'chat': {
      if (!isLive(stream)) return fail('This stream has ended.', 410);
      if (!mine && (await isBlockedEither(me.id, stream.userId))) return fail('Stream not found.', 404);
      const body = String(d.body || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
      if (!body) return fail('Type something first.');
      const recent = await prisma.liveChat.count({ where: { userId: me.id, createdAt: { gte: new Date(Date.now() - 30 * 1000) } } });
      if (recent >= 10) return fail('Slow down a little!', 429);
      const c = await prisma.liveChat.create({ data: { streamId: stream.id, userId: me.id, body }, include: { user: CHAT_USER } });
      return NextResponse.json({ chat: publicChat(c) });
    }
    case 'end': {
      const admin = isAdmin(me);
      if (!mine && !admin) return fail('Not your stream.', 403);
      if (stream.status === 'live') {
        await prisma.liveStream.update({ where: { id: stream.id }, data: { status: 'ended', endedAt: new Date(), endedBy: mine ? '' : 'admin' } });
      }
      return NextResponse.json({ status: 'ended' });
    }
    default:
      return fail('Unknown action.');
  }
}
