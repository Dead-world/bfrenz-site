import { getFriendIds } from './friends';
import { hiddenUserIds, isAdmin } from './moderation';

/** Survey answers are shared with frenz (like feed posts). */
export async function canSeeAnswers(me, ownerId) {
  if (!me) return false;
  if (me.id === ownerId || isAdmin(me)) return true;
  const [friends, hidden] = await Promise.all([getFriendIds(me.id), hiddenUserIds(me.id)]);
  return friends.includes(ownerId) && !hidden.includes(ownerId);
}

/** Me plus my frenz (minus blocks): whose answers I can see in lists. */
export async function visiblePeople(me) {
  if (!me) return [];
  const [friends, hidden] = await Promise.all([getFriendIds(me.id), hiddenUserIds(me.id)]);
  const h = new Set(hidden);
  return [me.id, ...friends.filter((id) => !h.has(id))];
}
