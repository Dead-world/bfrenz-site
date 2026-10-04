import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PICK = { id: true, title: true, body: true, url: true, createdAt: true };

/**
 * Live alerts for the site. GET ?after=<time> returns the unread count plus anything newer
 * than `after` (for the pop-ups). Without `after` it just returns the count and the newest time.
 */
export async function GET(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ unseen: 0, items: [] }, { status: 401 });
  const raw = new URL(request.url).searchParams.get('after');
  const after = raw ? new Date(raw) : null;
  const [unseen, newest, items] = await Promise.all([
    prisma.alert.count({ where: { userId: me.id, seen: false } }),
    prisma.alert.findFirst({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    after && !isNaN(after)
      ? prisma.alert.findMany({ where: { userId: me.id, seen: false, createdAt: { gt: after } }, orderBy: { createdAt: 'desc' }, take: 5, select: PICK })
      : [],
  ]);
  return NextResponse.json(
    { unseen, newest: newest?.createdAt || new Date(0), items },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/** POST { action: 'seen' } marks everything read; { action: 'seen', id } marks one. */
export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const d = await request.json().catch(() => ({}));
  if (d.action === 'seen') {
    const where = { userId: me.id, seen: false, ...(typeof d.id === 'string' ? { id: d.id.slice(0, 40) } : {}) };
    await prisma.alert.updateMany({ where, data: { seen: true } });
  }
  return NextResponse.json({ ok: true });
}
