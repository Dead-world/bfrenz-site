'use server';

import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { safeBack, str, withParam } from '@/lib/util';
import { isAdmin, isBlockedEither } from '@/lib/moderation';
import { notify } from '@/lib/push';
import { sendMentions } from '@/lib/mentions';
import { resolveTarget } from '@/lib/feedTargets';
import { ITEM_COMMENT_KINDS, keyKind } from '@/lib/feedKeys';

const anchor = (key) => key; // feed items use their key as their id

/** Comment (or reply) on a news-feed item: a bulletin, photos, video, profile song, survey or new frenz. */
export async function addItemComment(formData) {
  const me = await requireUser();
  const to = safeBack(formData.get('back'), '/home');
  const key = str(formData, 'id', 100);
  const body = String(formData.get('body') || '').replace(/\r/g, '').trim().slice(0, 1000);
  if (!ITEM_COMMENT_KINDS.includes(keyKind(key))) redirect(to);
  const t = await resolveTarget(me, key);
  if (!t) redirect(withParam(to, 'error', 'That’s not available anymore.'));
  if (!body) redirect(`${to}#${anchor(key)}`);

  // Replies hang off the top-level comment; replying to a reply also alerts that person.
  let parent = null;
  let replyTo = null;
  const parentId = str(formData, 'parentId', 40);
  if (parentId) {
    parent = await prisma.itemComment.findUnique({ where: { id: parentId } });
    if (parent?.parentId) {
      replyTo = parent;
      parent = await prisma.itemComment.findUnique({ where: { id: parent.parentId } });
    }
    if (!parent || parent.key !== key) redirect(withParam(to, 'error', 'That comment is gone.'));
    for (const who of [parent.authorId, replyTo?.authorId]) {
      if (who && who !== me.id && (await isBlockedEither(me.id, who))) redirect(withParam(to, 'error', "You can't reply to this member."));
    }
  }

  const recent = await prisma.itemComment.count({ where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } } });
  if (recent >= 15) redirect(withParam(to, 'error', 'Slow down! Too many comments in a minute.'));
  const c = await prisma.itemComment.create({ data: { key, authorId: me.id, body, parentId: parent?.id || null } });

  const url = `/comments/${key}#ic-${c.id}`;
  const told = new Set([me.id]);
  const tell = (id, title) => {
    if (!id || told.has(id)) return;
    told.add(id);
    notify(id, { title, body: body.slice(0, 110), url });
  };
  if (replyTo) tell(replyTo.authorId, `↩︎ ${me.displayName} replied to you`);
  if (parent) tell(parent.authorId, `↩︎ ${me.displayName} replied to your comment`);
  for (const o of t.owners) tell(o, `💬 ${me.displayName} commented on your ${t.what}`);
  if (body.includes('@')) after(() => sendMentions(me, body, { kind: 'comment', targetId: c.id, url, skip: [...told] }));
  redirect(`${to}#ic-${c.id}`);
}

export async function deleteItemComment(formData) {
  const me = await requireUser();
  const to = safeBack(formData.get('back'), '/home');
  const c = await prisma.itemComment.findUnique({ where: { id: str(formData, 'id', 40) } });
  if (!c) redirect(to);
  // The commenter, whoever owns the item, or an admin can delete it.
  let ok = c.authorId === me.id || isAdmin(me);
  if (!ok) ok = !!(await resolveTarget(me, c.key))?.owners.includes(me.id);
  if (ok) await prisma.itemComment.delete({ where: { id: c.id } });
  redirect(`${to}#${anchor(c.key)}`);
}
