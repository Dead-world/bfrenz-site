'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { safeBack, str, withParam } from '@/lib/util';
import { isBlockedEither } from '@/lib/moderation';
import { notify } from '@/lib/push';
import { CREATOR_TYPES, MAX_LINKS, cleanLinks, isCreator } from '@/lib/creators';

export async function followCreator(formData) {
  const me = await requireUser();
  const id = str(formData, 'userId', 40);
  const back = safeBack(formData.get('back'), '/creators');
  const them = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, creatorType: true, bannedAt: true } });
  if (!them || them.bannedAt || them.id === me.id || !isCreator(them)) redirect(back);
  if (await isBlockedEither(me.id, them.id)) redirect(withParam(back, 'error', "You can't follow this member."));

  // Stop people from mass-following to spam notifications.
  const recent = await prisma.follow.count({ where: { followerId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= 100) redirect(withParam(back, 'error', "That's a lot of follows for one hour. Try again later."));

  try {
    await prisma.follow.create({ data: { followerId: me.id, followingId: them.id } });
    notify(them.id, { title: `⭐ ${me.displayName} followed you`, body: 'You have a new follower on BFRENZ!', url: `/${me.username}`, tag: 'follows' });
  } catch (e) {
    if (e?.code !== 'P2002') throw e; // already following
  }
  redirect(back);
}

export async function unfollowCreator(formData) {
  const me = await requireUser();
  const id = str(formData, 'userId', 40);
  const back = safeBack(formData.get('back'), '/creators');
  await prisma.follow.deleteMany({ where: { followerId: me.id, followingId: id } });
  redirect(back);
}

/** Creator settings: type (or "" to turn creator mode off) and My Links. */
export async function saveCreatorSettings(formData) {
  const me = await requireUser();
  const type = str(formData, 'creatorType', 30);
  const creatorType = CREATOR_TYPES.some(([k]) => k === type) ? type : '';
  const rows = [];
  for (let i = 0; i < MAX_LINKS; i++) rows.push({ url: formData.get(`url${i}`), label: formData.get(`label${i}`) });
  const bad = rows.find((r) => String(r.url || '').trim() && !/^https?:\/\//i.test(String(r.url).trim()));
  if (bad) redirect(withParam('/edit?tab=creator', 'error', 'Links must start with http:// or https://'));
  await prisma.user.update({
    where: { id: me.id },
    data: {
      creatorType,
      creatorLinks: cleanLinks(rows),
      ...(creatorType && (me.isArtist || ['artist', 'dj'].includes(creatorType)) ? { isArtist: true } : {}),
    },
  });
  redirect('/edit?tab=creator&saved=1');
}
