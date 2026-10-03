'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { normalizeLayout, isDefaultLayout } from '@/lib/profileLayout';

/** Saves the box order from Edit Profile > Layout. */
export async function saveLayout(formData) {
  const me = await requireUser();
  let raw = null;
  try {
    raw = JSON.parse(String(formData.get('layout') || '').slice(0, 4000));
  } catch {
    raw = null;
  }
  const reset = formData.get('reset') === '1';
  const layout = reset ? null : normalizeLayout(raw);
  await prisma.user.update({
    where: { id: me.id },
    data: { profileLayout: !layout || isDefaultLayout(layout) ? Prisma.DbNull : layout },
  });
  revalidatePath(`/${me.username}`);
  redirect(`/edit?tab=layout&saved=${reset ? 'reset' : '1'}`);
}
