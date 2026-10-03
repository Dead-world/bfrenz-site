import { prisma } from './db';

export const RING_MS = 45 * 1000; // stop ringing after 45 seconds
export const GONE_MS = 25 * 1000; // a side that hasn't checked in for 25s has left

const PERSON = { select: { id: true, username: true, displayName: true, avatarUrl: true } };

/** Tidies up calls nobody answered or that someone left without hanging up. */
export async function expireCalls(userIds) {
  const now = Date.now();
  const mine = userIds?.length ? { OR: [{ callerId: { in: userIds } }, { calleeId: { in: userIds } }] } : {};
  await prisma.videoCall.updateMany({
    where: { ...mine, status: 'ringing', createdAt: { lt: new Date(now - RING_MS) } },
    data: { status: 'missed', endedAt: new Date() },
  });
  const gone = new Date(now - GONE_MS);
  await prisma.videoCall.updateMany({
    where: { ...mine, status: 'active', OR: [{ callerSeen: { lt: gone } }, { calleeSeen: { lt: gone } }] },
    data: { status: 'ended', endedAt: new Date() },
  });
}

/** Is this member already ringing or on a call? */
export async function busy(userId) {
  await expireCalls([userId]);
  const c = await prisma.videoCall.findFirst({
    where: { status: { in: ['ringing', 'active'] }, OR: [{ callerId: userId }, { calleeId: userId }] },
    select: { id: true },
  });
  return !!c;
}

export async function loadCall(id) {
  return prisma.videoCall.findUnique({ where: { id: String(id || '') }, include: { caller: PERSON, callee: PERSON } });
}

/** What one side of the call is allowed to know. */
export function callView(call, meId) {
  const amCaller = call.callerId === meId;
  const other = amCaller ? call.callee : call.caller;
  return {
    id: call.id,
    status: call.status,
    role: amCaller ? 'caller' : 'callee',
    other: { id: other.id, username: other.username, name: other.displayName, pic: other.avatarUrl || '/no-pic.svg' },
    // Direct calls: the person called gets the caller's offer; the caller gets the answer.
    offer: !amCaller && (call.status === 'ringing' || call.status === 'active') ? call.offerSdp || null : null,
    answer: amCaller && call.status === 'active' ? call.answerSdp || null : null,
    startedAt: call.answeredAt ? call.answeredAt.toISOString() : null,
  };
}
