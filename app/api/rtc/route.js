import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rtcConfigured, newCfSession, pushTracks, pullTracks, renegotiate, iceServers, TRACK_NAMES } from '@/lib/rtc';
import { isLive } from '@/lib/live';
import { isBlockedEither } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const fail = (error, status = 400) => NextResponse.json({ error }, { status });

/** Is this member allowed to open a video session for this stream? (Browser streams only; calls are direct.) */
async function allowed(me, purpose, refId) {
  if (purpose === 'live' || purpose === 'watch') {
    const s = await prisma.liveStream.findUnique({ where: { id: refId }, include: { user: { select: { bannedAt: true } } } });
    if (!s || s.user.bannedAt || s.status !== 'live' || s.source !== 'browser') return null;
    if (purpose === 'live') return s.userId === me.id ? { stream: s } : null;
    if (!isLive(s) || (await isBlockedEither(me.id, s.userId))) return null;
    return { stream: s };
  }
  return null;
}

async function mySession(me, sessionId) {
  const row = await prisma.rtcSession.findUnique({ where: { id: String(sessionId || '') } });
  return row && row.userId === me.id ? row : null;
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
  // Calls only need the connection helpers (STUN, plus TURN relays when set up).
  if (d.action === 'config') return NextResponse.json({ iceServers: await iceServers() });
  if (!rtcConfigured()) return fail('Streaming from the browser isn’t switched on yet.', 503);

  try {
    switch (d.action) {
      case 'session': {
        const purpose = String(d.purpose || '');
        const refId = String(d.refId || '').slice(0, 40);
        if (!(await allowed(me, purpose, refId))) return fail('This call or stream isn’t available.', 403);
        const recent = await prisma.rtcSession.count({ where: { userId: me.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } } });
        if (recent >= 40) return fail('Too many video connections. Try again in a few minutes.', 429);
        const { sessionId } = await newCfSession();
        await prisma.rtcSession.create({ data: { id: sessionId, userId: me.id, purpose, refId } });
        return NextResponse.json({ sessionId });
      }

      case 'push': {
        const row = await mySession(me, d.sessionId);
        if (!row || row.purpose !== 'live') return fail('Not your session.', 403);
        const ok = await allowed(me, row.purpose, row.refId);
        if (!ok) return fail('This call or stream has ended.', 410);
        const tracks = (Array.isArray(d.tracks) ? d.tracks : []).filter((t) => TRACK_NAMES.includes(t?.trackName) && t.mid != null).slice(0, 2);
        if (!tracks.length || typeof d.sdp !== 'string' || d.sdp.length > 20000) return fail('Bad video offer.');
        const res = await pushTracks(row.id, d.sdp, tracks);
        await prisma.liveStream.update({ where: { id: ok.stream.id }, data: { sessionId: row.id, lastBeat: new Date() } });
        return NextResponse.json({ sdp: res.sessionDescription?.sdp, tracks: res.tracks || [] });
      }

      case 'pull': {
        const row = await mySession(me, d.sessionId);
        if (!row || row.purpose !== 'watch') return fail('Not your session.', 403);
        const ok = await allowed(me, row.purpose, row.refId);
        if (!ok) return fail('This call or stream has ended.', 410);
        const remote = String(d.remote || '');
        // You can only receive the stream you're watching.
        if (!remote || remote !== ok.stream.sessionId) return fail('That video isn’t ready yet.', 409);
        const res = await pullTracks(row.id, remote, TRACK_NAMES);
        const bad = (res.tracks || []).find((t) => t.errorCode);
        if (bad) return fail(bad.errorDescription || 'That video isn’t ready yet.', 409);
        return NextResponse.json({ renegotiate: !!res.requiresImmediateRenegotiation, sdp: res.sessionDescription?.sdp, tracks: res.tracks || [] });
      }

      case 'renegotiate': {
        const row = await mySession(me, d.sessionId);
        if (!row) return fail('Not your session.', 403);
        if (typeof d.sdp !== 'string' || d.sdp.length > 20000) return fail('Bad video answer.');
        await renegotiate(row.id, d.sdp);
        return NextResponse.json({ ok: true });
      }

      default:
        return fail('Unknown action.');
    }
  } catch (err) {
    console.error('[rtc]', d?.action, err?.message);
    return fail('The video service didn’t respond. Try again.', 502);
  }
}
