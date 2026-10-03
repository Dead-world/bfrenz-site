import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFriendIds } from '@/lib/friends';
import { hiddenUserIds } from '@/lib/moderation';

/** Suggestions for the @ box: your frenz first, then other members. Logged-in members only. */
export async function GET(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ people: [] }, { status: 401 });
  const q = (new URL(request.url).searchParams.get('q') || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  const [friends, hidden] = await Promise.all([getFriendIds(me.id), hiddenUserIds(me.id)]);
  const notMe = [me.id, ...hidden];
  const sel = { id: true, username: true, displayName: true, avatarUrl: true };
  const match = q
    ? { OR: [{ username: { startsWith: q } }, { displayName: { contains: q, mode: 'insensitive' } }] }
    : {};
  const frenz = await prisma.user.findMany({
    where: { id: { in: friends.filter((id) => !notMe.includes(id)) }, bannedAt: null, ...match },
    select: sel,
    orderBy: { lastSeen: { sort: 'desc', nulls: 'last' } },
    take: 6,
  });
  let others = [];
  if (q && frenz.length < 6) {
    others = await prisma.user.findMany({
      where: { id: { notIn: [...notMe, ...frenz.map((f) => f.id)] }, bannedAt: null, isOfficial: false, username: { startsWith: q } },
      select: sel,
      orderBy: { lastSeen: { sort: 'desc', nulls: 'last' } },
      take: 6 - frenz.length,
    });
  }
  const people = [...frenz.map((u) => ({ ...u, fren: true })), ...others].map(({ id, ...u }) => u);
  return NextResponse.json({ people }, { headers: { 'Cache-Control': 'private, max-age=30' } });
}
