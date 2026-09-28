'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getFriendship } from '@/lib/friends';
import { safeBack, withParam } from '@/lib/util';

export async function sendFriendRequest(formData) {
  const me = await requireUser();
  const targetId = String(formData.get('userId') || '');
  const back = safeBack(formData.get('back'));
  if (!targetId || targetId === me.id) redirect(back);

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) redirect(back);

  const existing = await getFriendship(me.id, targetId);
  if (!existing) {
    await prisma.friendship.create({ data: { requesterId: me.id, addresseeId: targetId } });
    redirect(withParam(back, 'requested', '1'));
  }
  // They already asked us: adding them back accepts it.
  if (existing.status === 'PENDING' && existing.addresseeId === me.id) {
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
  }
  redirect(back);
}

export async function respondToRequest(formData) {
  const me = await requireUser();
  const id = String(formData.get('id') || '');
  const accept = formData.get('accept') === '1';
  const req = await prisma.friendship.findUnique({ where: { id } });
  if (req && req.addresseeId === me.id && req.status === 'PENDING') {
    if (accept) await prisma.friendship.update({ where: { id }, data: { status: 'ACCEPTED' } });
    else await prisma.friendship.delete({ where: { id } });
  }
  redirect('/requests');
}

export async function cancelRequest(formData) {
  const me = await requireUser();
  const id = String(formData.get('id') || '');
  await prisma.friendship.deleteMany({ where: { id, requesterId: me.id, status: 'PENDING' } });
  redirect('/requests');
}

export async function removeFriend(formData) {
  const me = await requireUser();
  const otherId = String(formData.get('userId') || '');
  const back = safeBack(formData.get('back'));
  await prisma.$transaction([
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: me.id, addresseeId: otherId },
          { requesterId: otherId, addresseeId: me.id },
        ],
      },
    }),
    prisma.topFriend.deleteMany({
      where: {
        OR: [
          { userId: me.id, friendId: otherId },
          { userId: otherId, friendId: me.id },
        ],
      },
    }),
  ]);
  redirect(back);
}

export async function saveTop8(formData) {
  const me = await requireUser();
  const picks = [];
  for (let i = 1; i <= 8; i++) {
    const id = String(formData.get(`slot${i}`) || '');
    if (id && !picks.includes(id)) picks.push(id);
  }
  // Only real, accepted friends can go in the Top 8.
  const valid = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: me.id, addresseeId: { in: picks } },
        { addresseeId: me.id, requesterId: { in: picks } },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const ok = new Set(valid.map((f) => (f.requesterId === me.id ? f.addresseeId : f.requesterId)));
  const final = picks.filter((id) => ok.has(id));

  await prisma.$transaction([
    prisma.topFriend.deleteMany({ where: { userId: me.id } }),
    prisma.topFriend.createMany({
      data: final.map((friendId, i) => ({ userId: me.id, friendId, position: i + 1 })),
    }),
  ]);
  redirect('/edit/top8?saved=1');
}
