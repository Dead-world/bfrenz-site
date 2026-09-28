import { prisma } from './db';

export async function getFriendIds(userId) {
  const rows = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export async function countFriends(userId) {
  return prisma.friendship.count({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });
}

/** The friendship row between two people in either direction, or null. */
export async function getFriendship(a, b) {
  if (!a || !b || a === b) return null;
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

export async function areFriends(a, b) {
  const f = await getFriendship(a, b);
  return f?.status === 'ACCEPTED';
}

/** Top 8: the member's own picks first, then filled with their earliest friends. */
export async function getTop8(userId) {
  const [picks, friendIds] = await Promise.all([
    prisma.topFriend.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: { friend: true },
    }),
    getFriendIds(userId),
  ]);
  const friendSet = new Set(friendIds);
  const chosen = picks.filter((p) => friendSet.has(p.friendId)).map((p) => p.friend);
  if (chosen.length >= 8 || chosen.length >= friendIds.length) return chosen.slice(0, 8);

  const used = new Set(chosen.map((f) => f.id));
  const fill = await prisma.user.findMany({
    where: { id: { in: friendIds.filter((id) => !used.has(id)) } },
    orderBy: { createdAt: 'asc' },
    take: 8 - chosen.length,
  });
  return [...chosen, ...fill];
}
