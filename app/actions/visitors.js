'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { COUNTER_STYLES } from '@/lib/visitors';

export async function saveVisitorSettings(formData) {
  const me = await requireUser();
  const look = String(formData.get('counterStyle') || '');
  const privateBrowsing = formData.get('privateBrowsing') === 'on';
  await prisma.user.update({
    where: { id: me.id },
    data: {
      showCounter: formData.get('showCounter') === 'on',
      counterStyle: COUNTER_STYLES.some(([k]) => k === look) ? look : 'classic',
      privateBrowsing,
    },
  });
  // Turning private browsing on also hides the visits you already made.
  if (privateBrowsing && !me.privateBrowsing) {
    await prisma.profileVisit.updateMany({ where: { visitorId: me.id }, data: { hidden: true } });
  }
  redirect('/visitors?saved=1');
}
