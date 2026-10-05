'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withParam } from '@/lib/util';
import { PRICES } from '@/lib/pricing';
import { applyUsername, usernameProblem } from '@/lib/usernames';

const PAGE = '/edit?tab=username';

/** Change your @username: free the first time, then with coins (paying by card goes through checkout). */
export async function changeUsername(formData) {
  const me = await requireUser();
  const name = String(formData.get('itemId') || '').trim().replace(/^@/, '').toLowerCase();
  const problem = await usernameProblem(me, name);
  if (problem) redirect(withParam(PAGE, 'error', problem));

  const free = (me.usernameChanges || 0) === 0;
  if (!free) {
    const cost = PRICES.usernameChangeCoins;
    const paid = await prisma.user.updateMany({ where: { id: me.id, coins: { gte: cost } }, data: { coins: { decrement: cost } } });
    if (!paid.count) redirect(withParam(PAGE, 'error', `Changing your username costs 🪙 ${cost} coins, or pay by card below.`));
    try {
      await applyUsername(me, name, { paid: true });
    } catch (err) {
      // Someone grabbed it a moment ago: give the coins back.
      await prisma.user.update({ where: { id: me.id }, data: { coins: { increment: cost } } });
      redirect(withParam(PAGE, 'error', err.message || 'Couldn’t change it. Try again.'));
    }
  } else {
    try {
      await applyUsername(me, name);
    } catch (err) {
      redirect(withParam(PAGE, 'error', err.message || 'Couldn’t change it. Try again.'));
    }
  }
  redirect(`/${name}?renamed=1`);
}
