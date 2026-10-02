'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { safeBack, str, withParam } from '@/lib/util';
import { isBlockedEither } from '@/lib/moderation';
import { MIN_ACCOUNT_AGE_MS, weekKey } from '@/lib/potw';

export async function votePotw(formData) {
  const me = await requireUser();
  const nomineeId = str(formData, 'userId', 40);
  const back = safeBack(formData.get('back'), '/potw');
  if (!nomineeId || nomineeId === me.id) redirect(withParam(back, 'error', "You can't vote for yourself 😉"));
  if (Date.now() - new Date(me.createdAt).getTime() < MIN_ACCOUNT_AGE_MS) {
    redirect(withParam(back, 'error', 'New accounts can vote after their first day on BFRENZ.'));
  }
  const nominee = await prisma.user.findUnique({ where: { id: nomineeId }, select: { id: true, bannedAt: true } });
  if (!nominee || nominee.bannedAt || (await isBlockedEither(me.id, nomineeId))) redirect(back);

  const week = weekKey();
  await prisma.potwVote.upsert({
    where: { week_voterId: { week, voterId: me.id } },
    create: { week, voterId: me.id, nomineeId },
    update: { nomineeId },
  });
  redirect(withParam(back, 'voted', '1'));
}

export async function unvotePotw(formData) {
  const me = await requireUser();
  const back = safeBack(formData.get('back'), '/potw');
  await prisma.potwVote.deleteMany({ where: { week: weekKey(), voterId: me.id } });
  redirect(back);
}
