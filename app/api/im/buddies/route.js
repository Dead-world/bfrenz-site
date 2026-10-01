import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { imBuddyIds } from '@/lib/im';

export const dynamic = 'force-dynamic';

const ONLINE_MS = 5 * 60 * 1000;

/** Buddy list: friends with online status and unread counts. Polled by the messenger. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'login' }, { status: 401 });

  // Keep "online" fresh while the messenger is open (getCurrentUser only updates every 2 min).
  if (!me.lastSeen || Date.now() - new Date(me.lastSeen).getTime() > 60 * 1000) {
    await prisma.user.update({ where: { id: me.id }, data: { lastSeen: new Date() } }).catch(() => {});
  }

  const ids = await imBuddyIds(me.id);
  const [users, unread] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids }, bannedAt: null },
      select: { id: true, username: true, displayName: true, avatarUrl: true, lastSeen: true },
    }),
    prisma.chatMessage.groupBy({
      by: ['fromId'],
      where: { toId: me.id, readAt: null, fromId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const unreadBy = Object.fromEntries(unread.map((u) => [u.fromId, u._count._all]));
  const now = Date.now();
  const buddies = users
    .map((u) => ({
      id: u.id,
      username: u.username,
      name: u.displayName,
      pic: u.avatarUrl || '/no-pic.svg',
      online: !!u.lastSeen && now - new Date(u.lastSeen).getTime() < ONLINE_MS,
      unread: unreadBy[u.id] || 0,
    }))
    .sort((a, b) => b.unread - a.unread || Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));

  return NextResponse.json(
    { buddies, unread: Object.values(unreadBy).reduce((a, b) => a + b, 0) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
