'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { areFriends } from '@/lib/friends';
import { safeBack, withParam } from '@/lib/util';
import { isBlockedEither } from '@/lib/moderation';
import { notify } from '@/lib/push';

async function tooFast(me) {
  const recent = await prisma.comment.count({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  return recent >= 15;
}

/**
 * New comment, or a reply when parentId is set.
 * Replies always attach to the top-level comment, so threads stay one level deep.
 */
export async function addComment(formData) {
  const me = await requireUser();
  const profileId = String(formData.get('profileId') || '');
  const parentIdRaw = String(formData.get('parentId') || '');
  const back = safeBack(formData.get('back'));
  const body = String(formData.get('body') || '').trim().slice(0, 5000);
  if (!body) redirect(withParam(back, 'error', 'Your comment was empty.'));

  let parent = null;
  let replyTo = null; // the reply being answered, when someone replies to a reply
  if (parentIdRaw) {
    parent = await prisma.comment.findUnique({ where: { id: parentIdRaw } });
    if (parent?.parentId) {
      replyTo = parent;
      parent = await prisma.comment.findUnique({ where: { id: parent.parentId } });
    }
    if (!parent || parent.profileId !== profileId) redirect(withParam(back, 'error', 'That comment is gone.'));
  }

  const allowed =
    profileId === me.id ||
    (parent && parent.authorId === me.id) ||
    (await areFriends(me.id, profileId));
  if (!allowed) redirect(withParam(back, 'error', 'You have to be frenz to leave a comment.'));
  if (await isBlockedEither(me.id, profileId)) redirect(withParam(back, 'error', "You can't comment here."));
  if (parent && parent.authorId !== me.id && (await isBlockedEither(me.id, parent.authorId))) {
    redirect(withParam(back, 'error', "You can't reply to this member."));
  }
  if (replyTo && replyTo.authorId !== me.id && (await isBlockedEither(me.id, replyTo.authorId))) {
    redirect(withParam(back, 'error', "You can't reply to this member."));
  }
  if (await tooFast(me)) redirect(withParam(back, 'error', 'Slow down! Too many comments in a minute.'));

  const c = await prisma.comment.create({
    data: { profileId, authorId: me.id, body, parentId: parent?.id || null },
  });

  // Notifications: the page owner hears about new comments; the original commenter hears about replies.
  const snippet = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110);
  const owner = profileId !== me.id ? await prisma.user.findUnique({ where: { id: profileId }, select: { username: true } }) : null;
  if (owner) {
    notify(profileId, {
      title: parent ? `↩︎ ${me.displayName} replied on your page` : `💬 ${me.displayName} commented on your page`,
      body: snippet,
      url: `/${owner.username}#c-${parent?.id || c.id}`,
    });
  }
  const pageName = parent ? (await prisma.user.findUnique({ where: { id: profileId }, select: { username: true } }))?.username || '' : '';
  if (parent && parent.authorId !== me.id && parent.authorId !== profileId && parent.authorId !== replyTo?.authorId) {
    notify(parent.authorId, { title: `↩︎ ${me.displayName} replied to your comment`, body: snippet, url: `/${pageName}#c-${c.id}` });
  }
  // Replying to a reply: the person being answered hears about it too (once, even if they own the page).
  if (replyTo && replyTo.authorId !== me.id && replyTo.authorId !== profileId) {
    notify(replyTo.authorId, { title: `↩︎ ${me.displayName} replied to you`, body: snippet, url: `/${pageName}#c-${c.id}` });
  }

  // Old-school "comment back": also drop the reply on the other person's page.
  if (parent && formData.get('alsoPost') === 'on' && parent.authorId !== me.id && parent.authorId !== profileId) {
    const ok = (await areFriends(me.id, parent.authorId)) && !(await isBlockedEither(me.id, parent.authorId));
    if (ok) {
      await prisma.comment.create({ data: { profileId: parent.authorId, authorId: me.id, body } });
    }
  }

  redirect(`${back.split('?')[0]}#c-${c.id}`);
}

export async function deleteComment(formData) {
  const me = await requireUser();
  const id = String(formData.get('id') || '');
  const back = safeBack(formData.get('back'));
  // Profile owners can delete any comment on their page; authors can delete their own.
  // Deleting a comment also deletes its replies.
  await prisma.comment.deleteMany({
    where: { id, OR: [{ profileId: me.id }, { authorId: me.id }] },
  });
  redirect(back + '#comments');
}
