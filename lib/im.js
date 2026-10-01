import { prisma } from './db';
import { getFriendIds } from './friends';
import { hiddenUserIds } from './moderation';

export const IM_MAX = 1000; // characters per message

/** Friends you can IM: accepted friends, minus anyone blocked either way. */
export async function imBuddyIds(userId) {
  const [friends, hidden] = await Promise.all([getFriendIds(userId), hiddenUserIds(userId)]);
  const h = new Set(hidden);
  return friends.filter((id) => !h.has(id));
}

export function publicMessage(m) {
  return { id: m.id, from: m.fromId, to: m.toId, body: m.body, at: m.createdAt.toISOString(), read: !!m.readAt };
}

export async function canIm(meId, otherId) {
  if (!otherId || otherId === meId) return false;
  return (await imBuddyIds(meId)).includes(otherId);
}

export { prisma };
