import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { IM_MAX, canIm, publicMessage } from '@/lib/im';
import { notify } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });
  let data;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  const to = String(data?.to || '').slice(0, 40);
  const body = String(data?.body || '').replace(/\r/g, '').trim().slice(0, IM_MAX);
  if (!body) return NextResponse.json({ error: 'Type a message first.' }, { status: 400 });
  if (!(await canIm(me.id, to))) {
    return NextResponse.json({ error: 'You can only IM your frenz.' }, { status: 403 });
  }
  const recent = await prisma.chatMessage.count({
    where: { fromId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recent >= 40) return NextResponse.json({ error: 'Slow down! Too many messages in a minute.' }, { status: 429 });

  const m = await prisma.chatMessage.create({ data: { fromId: me.id, toId: to, body } });

  // Push notification if they aren't on the site right now (otherwise the messenger already pops up).
  const them = await prisma.user.findUnique({ where: { id: to }, select: { lastSeen: true } });
  const away = !them?.lastSeen || Date.now() - new Date(them.lastSeen).getTime() > 90 * 1000;
  if (away) {
    notify(to, {
      title: `💬 ${me.displayName}`,
      body: body.length > 120 ? body.slice(0, 119) + '…' : body,
      url: '/home',
      tag: `im-${me.id}`,
    });
  }
  return NextResponse.json({ message: publicMessage(m) });
}
