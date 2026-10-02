'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { str, withParam } from '@/lib/util';
import { isBlockedEither } from '@/lib/moderation';
import { isSupporter } from '@/lib/perks';
import { notify } from '@/lib/push';
import { GIVES_PER_DAY, NOTE_MAX, canGive, getStamp } from '@/lib/stamps';
import { ownedStampSlugs } from '@/lib/stampsDb';

export async function giveStamp(formData) {
  const me = await requireUser();
  const toName = str(formData, 'to', 40).toLowerCase();
  const back = `/stamps/give?to=${encodeURIComponent(toName)}`;
  const stamp = getStamp(str(formData, 'stamp', 40));
  const note = str(formData, 'note', NOTE_MAX).replace(/[<>]/g, '');

  const to = await prisma.user.findUnique({ where: { username: toName } });
  if (!to || to.bannedAt) redirect('/stamps');
  if (to.id === me.id) redirect(withParam('/stamps', 'error', "You can't stamp yourself 😄"));
  if (await isBlockedEither(me.id, to.id)) redirect('/stamps');
  if (!stamp) redirect(withParam(back, 'error', 'Pick a stamp first.'));

  const check = canGive(stamp, { supporter: isSupporter(me), owned: await ownedStampSlugs(me.id) });
  if (!check.ok) redirect(withParam(back, 'error', check.why));

  const today = await prisma.stampGift.count({
    where: { fromId: me.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (today >= GIVES_PER_DAY) redirect(withParam(back, 'error', `You've given ${GIVES_PER_DAY} stamps today. More tomorrow!`));

  try {
    await prisma.stampGift.create({ data: { stampSlug: stamp.slug, fromId: me.id, toId: to.id, note } });
  } catch (e) {
    if (e?.code === 'P2002') redirect(withParam(back, 'error', `You already gave ${to.displayName} the ${stamp.name} stamp. Try a different one!`));
    throw e;
  }
  notify(to.id, {
    title: `🎟️ ${me.displayName} gave you a stamp!`,
    body: `${stamp.emoji} ${stamp.name}${note ? `: "${note}"` : ''}`,
    url: `/${to.username}/stamps`,
  });
  redirect(`/${to.username}?stamped=${stamp.slug}#stamps`);
}

/** The person who got a stamp can take it off their page. */
export async function removeStamp(formData) {
  const me = await requireUser();
  const slug = str(formData, 'stamp', 40);
  const fromId = str(formData, 'fromId', 40);
  await prisma.stampGift.deleteMany({ where: { toId: me.id, stampSlug: slug, ...(fromId ? { fromId } : {}) } });
  redirect(`/${me.username}/stamps?removed=1`);
}
