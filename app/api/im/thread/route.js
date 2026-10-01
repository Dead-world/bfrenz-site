import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { publicMessage } from '@/lib/im';

export const dynamic = 'force-dynamic';

/**
 * Messages between me and ?with=<userId>. With ?after=<ISO time> only newer ones come back.
 * Anything they sent me is marked read.
 */
export async function GET(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const other = String(searchParams.get('with') || '').slice(0, 40);
  const afterRaw = searchParams.get('after');
  const after = afterRaw ? new Date(afterRaw) : null;
  if (!other) return NextResponse.json({ messages: [] });

  const between = {
    OR: [
      { fromId: me.id, toId: other },
      { fromId: other, toId: me.id },
    ],
  };
  let messages;
  if (after && !isNaN(after)) {
    messages = await prisma.chatMessage.findMany({
      where: { ...between, createdAt: { gt: after } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  } else {
    messages = (
      await prisma.chatMessage.findMany({ where: between, orderBy: { createdAt: 'desc' }, take: 60 })
    ).reverse();
  }
  await prisma.chatMessage.updateMany({
    where: { fromId: other, toId: me.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ messages: messages.map(publicMessage) }, { headers: { 'Cache-Control': 'no-store' } });
}
