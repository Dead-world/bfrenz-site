'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getFriendship } from '@/lib/friends';
import { safeBack, withParam } from '@/lib/util';
import { topFriendLimit } from '@/lib/perks';
import { isBlockedEither } from '@/lib/moderation';
import { notify } from '@/lib/push';

export async function sendFriendRequest(formData) {
  const me = await requireUser();
  const targetId = String(formData.get('userId') || '');
  const back = safeBack(formData.get('back'));
  if (!targetId || targetId === me.id) redirect(back);

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, bannedAt: true } });
  if (!target || target.bannedAt) redirect(back);
  if (await isBlockedEither(me.id, targetId)) redirect(withParam(back, 'error', "You can't add this member."));

  const existing = await getFriendship(me.id, targetId);
  if (!existing) {
    await prisma.friendship.create({ data: { requesterId: me.id, addresseeId: targetId } });
    notify(targetId, { title: '➕ New friend request', body: `${me.displayName} wants to be your fren!`, url: '/requests', tag: 'requests' });
    redirect(withParam(back, 'requested', '1'));
  }
  // They already asked us: adding them back accepts it.
  if (existing.status === 'PENDING' && existing.addresseeId === me.id) {
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
    notify(existing.requesterId, { title: '🤝 You have a new fren', body: `${me.displayName} accepted your friend request.`, url: `/${me.username}` });
  }
  redirect(back);
}

export async function respondToRequest(formData) {
  const me = await requireUser();
  const id = String(formData.get('id') || '');
  const accept = formData.get('accept') === '1';
  const req = await prisma.friendship.findUnique({ where: { id } });
  if (req && req.addresseeId === me.id && req.status === 'PENDING') {
    if (accept) {
      await prisma.friendship.update({ where: { id }, data: { status: 'ACCEPTED' } });
      notify(req.requesterId, { title: '🤝 You have a new fren', body: `${me.displayName} accepted your friend request.`, url: `/${me.username}` });
    } else await prisma.friendship.delete({ where: { id } });
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
  const limit = topFriendLimit(me);
  for (let i = 1; i <= limit; i++) {
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

  const before = await prisma.topFriend.findMany({ where: { userId: me.id }, select: { friendId: true, position: true } });

  await prisma.$transaction([
    prisma.topFriend.deleteMany({ where: { userId: me.id } }),
    prisma.topFriend.createMany({
      data: final.map((friendId, i) => ({ userId: me.id, friendId, position: i + 1 })),
    }),
  ]);
  top8Alerts(me, before, final);
  redirect('/edit/top8?saved=1');
}

/**
 * Top 8 drama, delivered as notifications:
 * added to someone's Top 8, moved up to #1, or bumped out.
 */
function top8Alerts(me, before, after) {
  const was = new Map(before.map((t) => [t.friendId, t.position]));
  const page = `/${me.username}#top8`;
  after.forEach((id, i) => {
    const pos = i + 1;
    const old = was.get(id);
    if (pos === 1 && old !== 1) {
      notify(id, { title: `👑 You're #1 in ${me.displayName}'s Top 8!`, body: 'Top spot. Big moves.', url: page, tag: `top8-${me.id}` });
    } else if (!old) {
      notify(id, { title: `🔥 ${me.displayName} added you to their Top 8`, body: `You're #${pos}. Go see.`, url: page, tag: `top8-${me.id}` });
    }
  });
  const still = new Set(after);
  for (const t of before) {
    if (!still.has(t.friendId)) {
      notify(t.friendId, { title: `😬 You got bumped from ${me.displayName}'s Top 8`, body: 'Better leave a comment and win your spot back.', url: `/${me.username}`, tag: `top8-${me.id}` });
    }
  }
}
