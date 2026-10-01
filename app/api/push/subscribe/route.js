import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Save this device's push subscription for the logged-in member. */
export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  const data = await request.json().catch(() => ({}));
  const sub = data?.subscription;
  const endpoint = String(sub?.endpoint || '');
  const p256dh = String(sub?.keys?.p256dh || '');
  const auth = String(sub?.keys?.auth || '');
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth || endpoint.length > 1000) {
    return NextResponse.json({ error: 'Bad subscription.' }, { status: 400 });
  }
  const count = await prisma.pushSubscription.count({ where: { userId: me.id } });
  if (count >= 10) {
    // Keep the 9 newest devices.
    const old = await prisma.pushSubscription.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'asc' }, take: count - 9 });
    await prisma.pushSubscription.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }
  const userAgent = String(request.headers.get('user-agent') || '').slice(0, 300);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: me.id, endpoint, p256dh, auth, userAgent },
    update: { userId: me.id, p256dh, auth, userAgent },
  });
  return NextResponse.json({ ok: true });
}

/** Turn notifications off for this device. */
export async function DELETE(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  const data = await request.json().catch(() => ({}));
  const endpoint = String(data?.endpoint || '');
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: me.id } });
  return NextResponse.json({ ok: true });
}
