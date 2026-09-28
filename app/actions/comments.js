'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { areFriends } from '@/lib/friends';
import { safeBack, withParam } from '@/lib/util';

export async function addComment(formData) {
  const me = await requireUser();
  const profileId = String(formData.get('profileId') || '');
  const back = safeBack(formData.get('back'));
  const body = String(formData.get('body') || '').trim().slice(0, 5000);
  if (!body) redirect(withParam(back, 'error', 'Your comment was empty.'));

  const allowed = profileId === me.id || (await areFriends(me.id, profileId));
  if (!allowed) redirect(withParam(back, 'error', 'You have to be frenz to leave a comment.'));

  await prisma.comment.create({ data: { profileId, authorId: me.id, body } });
  redirect(back + '#comments');
}

export async function deleteComment(formData) {
  const me = await requireUser();
  const id = String(formData.get('id') || '');
  const back = safeBack(formData.get('back'));
  // Profile owners can delete any comment on their page; authors can delete their own.
  await prisma.comment.deleteMany({
    where: { id, OR: [{ profileId: me.id }, { authorId: me.id }] },
  });
  redirect(back + '#comments');
}
