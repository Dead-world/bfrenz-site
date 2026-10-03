import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canIm } from '@/lib/im';
import { busy, callView, expireCalls, loadCall, RING_MS } from '@/lib/calls';
import { notify } from '@/lib/push';

export const dynamic = 'force-dynamic';

const fail = (error, status = 400) => NextResponse.json({ error }, { status });

/** GET ?incoming=1 → a call ringing for me. GET ?id=… → that call's state (and "I'm still here"). */
export async function GET(request) {
  const me = await getCurrentUser();
  if (!me) return fail('Please log in again.', 401);
  const url = new URL(request.url);

  if (url.searchParams.get('incoming')) {
    await expireCalls([me.id]);
    const c = await prisma.videoCall.findFirst({
      where: { calleeId: me.id, status: 'ringing', createdAt: { gte: new Date(Date.now() - RING_MS) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!c) return NextResponse.json({ call: null });
    return NextResponse.json({ call: callView(await loadCall(c.id), me.id) });
  }

  const call = await loadCall(url.searchParams.get('id'));
  if (!call || (call.callerId !== me.id && call.calleeId !== me.id)) return fail('Call not found.', 404);
  if (call.status === 'ringing' || call.status === 'active') {
    const field = call.callerId === me.id ? 'callerSeen' : 'calleeSeen';
    await prisma.videoCall.update({ where: { id: call.id }, data: { [field]: new Date() } });
    await expireCalls([me.id]);
  }
  return NextResponse.json({ call: callView(await loadCall(call.id), me.id) });
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
    const to = String(d.to || '').slice(0, 40);
    if (!(await canIm(me.id, to))) return fail('You can only video call your frenz.', 403);
    const them = await prisma.user.findUnique({ where: { id: to }, select: { id: true, bannedAt: true } });
    if (!them || them.bannedAt) return fail('That member isn’t available.', 404);
    const recent = await prisma.videoCall.count({ where: { callerId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (recent >= 20) return fail('That’s a lot of calls. Try again later.', 429);
    if (await busy(me.id)) return fail('You’re already on a call.', 409);
    if (await busy(to)) return fail('They’re on another call right now.', 409);
    const call = await prisma.videoCall.create({ data: { callerId: me.id, calleeId: to, callerSeen: new Date() } });
    after(() => notify(to, { title: `📹 ${me.displayName} is video calling you`, body: 'Open BFRENZ to answer.', url: '/home', tag: `call-${call.id}` }));
    return NextResponse.json({ call: callView(await loadCall(call.id), me.id) });
  }

  const call = await loadCall(d.id);
  if (!call || (call.callerId !== me.id && call.calleeId !== me.id)) return fail('Call not found.', 404);
  const amCallee = call.calleeId === me.id;

  const sdp = typeof d.sdp === 'string' ? d.sdp : '';
  if ((d.action === 'offer' || d.action === 'answer') && (!sdp.startsWith('v=') || sdp.length > 30000)) return fail('Bad connection details.');

  if (d.action === 'offer') {
    if (amCallee || call.status !== 'ringing') return fail('This call has ended.', 410);
    await prisma.videoCall.update({ where: { id: call.id }, data: { offerSdp: sdp, callerSeen: new Date() } });
  } else if (d.action === 'answer') {
    await expireCalls([me.id]);
    const fresh = await loadCall(call.id);
    if (!amCallee || fresh.status !== 'ringing') return fail('This call has ended.', 410);
    if (!fresh.offerSdp) return fail('The call is still connecting. Try again in a second.', 409);
    await prisma.videoCall.update({ where: { id: call.id }, data: { status: 'active', answerSdp: sdp, answeredAt: new Date(), calleeSeen: new Date() } });
  } else if (d.action === 'decline') {
    if (amCallee && call.status === 'ringing') {
      await prisma.videoCall.update({ where: { id: call.id }, data: { status: 'declined', endedAt: new Date() } });
    }
  } else if (d.action === 'end') {
    if (call.status === 'ringing' || call.status === 'active') {
      // Hanging up before they answer counts as a missed call for them.
      const status = call.status === 'ringing' ? 'missed' : 'ended';
      await prisma.videoCall.update({ where: { id: call.id }, data: { status, endedAt: new Date() } });
      if (status === 'missed' && !amCallee) {
        after(() => notify(call.calleeId, { title: `📹 Missed video call from ${me.displayName}`, body: 'Call them back from the IM window.', url: '/home', tag: `call-${call.id}` }));
      }
    }
  } else {
    return fail('Unknown action.');
  }
  return NextResponse.json({ call: callView(await loadCall(call.id), me.id) });
}
