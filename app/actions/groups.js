'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cleanUrl, safeBack, str, withParam } from '@/lib/util';
import { isAdmin } from '@/lib/moderation';
import { notify } from '@/lib/push';
import {
  GROUP_CATEGORIES, GROUP_DESC_MAX, GROUP_NAME_MAX, GROUP_POST_MAX, GROUP_REPLY_MAX, GROUPS_PER_OWNER,
  canModerate, freeSlug, isMember, membershipOf,
} from '@/lib/groups';

function picUrl(formData, back) {
  try {
    return cleanUrl(formData.get('avatarUrl'));
  } catch (e) {
    redirect(withParam(back, 'error', e.message));
  }
}

async function loadGroup(formData) {
  const id = str(formData, 'groupId', 40);
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) redirect('/groups');
  return group;
}

// ---------------- create / edit / delete ----------------

export async function createGroup(formData) {
  const me = await requireUser();
  const back = '/groups/new';
  const name = str(formData, 'name', GROUP_NAME_MAX);
  const description = str(formData, 'description', GROUP_DESC_MAX);
  const category = GROUP_CATEGORIES.includes(str(formData, 'category', 40)) ? str(formData, 'category', 40) : 'Other';
  const avatarUrl = picUrl(formData, back);
  if (name.length < 3) redirect(withParam(back, 'error', 'Group names need at least 3 characters.'));

  const owned = await prisma.group.count({ where: { ownerId: me.id } });
  if (owned >= GROUPS_PER_OWNER && !isAdmin(me)) {
    redirect(withParam(back, 'error', `You can run up to ${GROUPS_PER_OWNER} groups.`));
  }

  const slug = await freeSlug(name);
  const group = await prisma.group.create({
    data: {
      slug, name, description, category, avatarUrl, ownerId: me.id, memberCount: 1,
      members: { create: { userId: me.id, role: 'owner' } },
    },
  });
  redirect(`/groups/${group.slug}?created=1`);
}

export async function updateGroup(formData) {
  const me = await requireUser();
  const group = await loadGroup(formData);
  const back = `/groups/${group.slug}/edit`;
  const m = await membershipOf(group.id, me.id);
  if (!canModerate(me, m)) redirect(`/groups/${group.slug}`);
  const name = str(formData, 'name', GROUP_NAME_MAX);
  if (name.length < 3) redirect(withParam(back, 'error', 'Group names need at least 3 characters.'));
  const category = str(formData, 'category', 40);
  await prisma.group.update({
    where: { id: group.id },
    data: {
      name,
      description: str(formData, 'description', GROUP_DESC_MAX),
      category: GROUP_CATEGORIES.includes(category) ? category : group.category,
      avatarUrl: picUrl(formData, back),
    },
  });
  redirect(`${back}?saved=1`);
}

export async function deleteGroup(formData) {
  const me = await requireUser();
  const group = await loadGroup(formData);
  if (group.ownerId !== me.id && !isAdmin(me)) redirect(`/groups/${group.slug}`);
  if (str(formData, 'confirm', 100).toLowerCase() !== group.name.toLowerCase()) {
    redirect(withParam(`/groups/${group.slug}/edit`, 'error', 'Type the group name exactly to delete it.'));
  }
  await prisma.group.delete({ where: { id: group.id } });
  redirect('/groups?deleted=1');
}

// ---------------- join / leave ----------------

export async function joinGroup(formData) {
  const me = await requireUser();
  const group = await loadGroup(formData);
  const back = `/groups/${group.slug}`;
  const m = await membershipOf(group.id, me.id);
  if (m?.role === 'banned') redirect(withParam(back, 'error', "You can't join this group."));
  if (!m) {
    await prisma.$transaction([
      prisma.groupMember.create({ data: { groupId: group.id, userId: me.id } }),
      prisma.group.update({ where: { id: group.id }, data: { memberCount: { increment: 1 } } }),
    ]);
  }
  redirect(`${back}?joined=1`);
}

export async function leaveGroup(formData) {
  const me = await requireUser();
  const group = await loadGroup(formData);
  const back = `/groups/${group.slug}`;
  const m = await membershipOf(group.id, me.id);
  if (m?.role === 'owner') redirect(withParam(back, 'error', "Owners can't leave. Hand the group to a mod first, or delete it."));
  if (isMember(m)) {
    await prisma.$transaction([
      prisma.groupMember.delete({ where: { id: m.id } }),
      prisma.group.update({ where: { id: group.id }, data: { memberCount: { decrement: 1 } } }),
    ]);
  }
  redirect(back);
}

// ---------------- the wall ----------------

export async function postToGroup(formData) {
  const me = await requireUser();
  const group = await loadGroup(formData);
  const back = `/groups/${group.slug}`;
  if (!isMember(await membershipOf(group.id, me.id))) redirect(withParam(back, 'error', 'Join the group to post.'));
  const body = str(formData, 'body', GROUP_POST_MAX);
  let imageUrl = '';
  try {
    imageUrl = cleanUrl(formData.get('imageUrl'));
  } catch {
    imageUrl = '';
  }
  if (!body && !imageUrl) redirect(withParam(back, 'error', 'Write something first.'));

  const recent = await prisma.groupPost.count({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recent >= 5) redirect(withParam(back, 'error', 'Slow down! Too many posts in a minute.'));

  const post = await prisma.groupPost.create({ data: { groupId: group.id, authorId: me.id, body, imageUrl } });
  await prisma.group.update({ where: { id: group.id }, data: { lastPostAt: new Date() } });
  redirect(`${back}#gp-${post.id}`);
}

export async function replyToGroupPost(formData) {
  const me = await requireUser();
  const id = str(formData, 'postId', 40);
  const post = await prisma.groupPost.findUnique({ where: { id }, include: { group: true } });
  if (!post) redirect('/groups');
  const back = `/groups/${post.group.slug}`;
  if (!isMember(await membershipOf(post.groupId, me.id))) redirect(withParam(back, 'error', 'Join the group to reply.'));
  const body = str(formData, 'body', GROUP_REPLY_MAX);
  if (!body) redirect(`${back}#gp-${id}`);

  const recent = await prisma.groupReply.count({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recent >= 10) redirect(withParam(back, 'error', 'Slow down! Too many replies in a minute.'));

  await prisma.groupReply.create({ data: { postId: id, authorId: me.id, body } });
  if (post.authorId !== me.id) {
    notify(post.authorId, {
      title: `💬 ${me.displayName} replied in ${post.group.name}`,
      body: body.slice(0, 110),
      url: `/groups/${post.group.slug}#gp-${id}`,
      tag: `gp-${id}`,
    });
  }
  redirect(`${back}#gp-${id}`);
}

export async function deleteGroupPost(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const post = await prisma.groupPost.findUnique({ where: { id }, include: { group: true } });
  if (!post) redirect('/groups');
  const m = await membershipOf(post.groupId, me.id);
  if (post.authorId === me.id || canModerate(me, m)) await prisma.groupPost.delete({ where: { id } });
  redirect(`/groups/${post.group.slug}`);
}

export async function deleteGroupReply(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const reply = await prisma.groupReply.findUnique({ where: { id }, include: { post: { include: { group: true } } } });
  if (!reply) redirect('/groups');
  const m = await membershipOf(reply.post.groupId, me.id);
  if (reply.authorId === me.id || canModerate(me, m)) await prisma.groupReply.delete({ where: { id } });
  redirect(`/groups/${reply.post.group.slug}#gp-${reply.postId}`);
}

export async function togglePin(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const post = await prisma.groupPost.findUnique({ where: { id }, include: { group: true } });
  if (!post) redirect('/groups');
  if (canModerate(me, await membershipOf(post.groupId, me.id))) {
    await prisma.groupPost.update({ where: { id }, data: { pinned: !post.pinned } });
  }
  redirect(`/groups/${post.group.slug}#gp-${id}`);
}

// ---------------- members ----------------

/** action = mod | unmod | kick | ban | unban | owner (hand over the group) */
export async function manageMember(formData) {
  const me = await requireUser();
  const group = await loadGroup(formData);
  const back = safeBack(formData.get('back'), `/groups/${group.slug}/members`);
  const action = str(formData, 'action', 10);
  const userId = str(formData, 'userId', 40);
  const mine = await membershipOf(group.id, me.id);
  const target = await membershipOf(group.id, userId);
  const owner = mine?.role === 'owner' || isAdmin(me);
  if (!target || userId === me.id || target.role === 'owner') redirect(back);
  if (!canModerate(me, mine)) redirect(back);
  // Mods can only kick, ban or unban regular members.
  if (!owner && (target.role === 'mod' || !['kick', 'ban', 'unban'].includes(action))) redirect(back);

  if (action === 'mod' || action === 'unmod') {
    if (!isMember(target)) redirect(back);
    await prisma.groupMember.update({ where: { id: target.id }, data: { role: action === 'mod' ? 'mod' : 'member' } });
  } else if (action === 'kick') {
    if (isMember(target)) {
      await prisma.$transaction([
        prisma.groupMember.delete({ where: { id: target.id } }),
        prisma.group.update({ where: { id: group.id }, data: { memberCount: { decrement: 1 } } }),
      ]);
    }
  } else if (action === 'ban') {
    const ops = [prisma.groupMember.update({ where: { id: target.id }, data: { role: 'banned' } })];
    if (isMember(target)) ops.push(prisma.group.update({ where: { id: group.id }, data: { memberCount: { decrement: 1 } } }));
    ops.push(prisma.groupPost.deleteMany({ where: { groupId: group.id, authorId: userId } }));
    await prisma.$transaction(ops);
  } else if (action === 'unban') {
    if (target.role === 'banned') await prisma.groupMember.delete({ where: { id: target.id } });
  } else if (action === 'owner') {
    if (!isMember(target) || !mine || mine.role !== 'owner') redirect(back);
    await prisma.$transaction([
      prisma.groupMember.update({ where: { id: target.id }, data: { role: 'owner' } }),
      prisma.groupMember.update({ where: { id: mine.id }, data: { role: 'mod' } }),
      prisma.group.update({ where: { id: group.id }, data: { ownerId: userId } }),
    ]);
  }
  redirect(withParam(back, 'saved', '1'));
}
