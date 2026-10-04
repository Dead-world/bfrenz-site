'use server';

import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { safeBack, str, withParam } from '@/lib/util';
import { sendMentions } from '@/lib/mentions';
import { GROUP_REPLY_MAX } from '@/lib/groups';

/** Every kind of comment, keyed the same way as comment likes. */
const KINDS = {
  pc: { model: 'postComment', max: 1000 }, // comments on status posts
  ic: { model: 'itemComment', max: 1000 }, // comments on other feed items
  bc: { model: 'blogComment', max: 3000 }, // blog comments
  gr: { model: 'groupReply', max: GROUP_REPLY_MAX }, // replies in groups
  c: { model: 'comment', max: 5000 }, // profile comment wall (HTML allowed; cleaned when shown)
};

/** The author fixes their own comment or reply. */
export async function editComment(formData) {
  const me = await requireUser();
  const to = safeBack(formData.get('back'), '/home').split('#')[0];
  const kind = str(formData, 'kind', 4);
  const id = str(formData, 'id', 40);
  const k = KINDS[kind];
  if (!k) redirect(to);
  const c = await prisma[k.model].findUnique({ where: { id } });
  if (!c || c.authorId !== me.id) redirect(withParam(to, 'error', 'You can only edit your own comments.'));

  const body = String(formData.get('body') || '').replace(/\r/g, '').trim().slice(0, k.max);
  if (!body) redirect(withParam(to, 'error', 'A comment can’t be empty. Delete it instead?'));

  if (body !== c.body) {
    await prisma[k.model].update({ where: { id }, data: { body, editedAt: new Date() } });
    // Anyone newly @mentioned gets told (people already told aren't told twice).
    if (body.includes('@')) {
      if (kind === 'pc') {
        const post = await prisma.post.findUnique({ where: { id: c.postId } });
        if (post) after(() => sendMentions(me, body, { kind: 'comment', targetId: id, url: `/post/${post.id}#pc-${id}`, post }));
      } else if (kind === 'ic') {
        after(() => sendMentions(me, body, { kind: 'comment', targetId: id, url: `/comments/${c.key}#ic-${id}` }));
      } else if (kind === 'gr') {
        const gp = await prisma.groupPost.findUnique({ where: { id: c.postId }, include: { group: { select: { slug: true } } } });
        if (gp) after(() => sendMentions(me, body, { kind: 'groupreply', targetId: id, url: `/groups/${gp.group.slug}#gp-${gp.id}`, groupId: gp.groupId }));
      }
    }
  }
  redirect(`${to}#${kind}-${id}`);
}
