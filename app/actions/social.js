'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cleanUrl, str, withParam } from '@/lib/util';

// ---------- bulletins ----------

export async function postBulletin(formData) {
  const me = await requireUser();
  const subject = str(formData, 'subject', 120);
  const body = str(formData, 'body', 10000);
  if (!subject || !body) redirect('/bulletins?post=1&error=' + encodeURIComponent('Add a subject and a message.'));

  // Light flood control: one bulletin per minute.
  const recent = await prisma.bulletin.findFirst({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recent) redirect('/bulletins?post=1&error=' + encodeURIComponent('Slow down! Wait a minute between bulletins.'));

  const b = await prisma.bulletin.create({ data: { authorId: me.id, subject, body } });
  redirect(`/bulletins/${b.id}`);
}

export async function deleteBulletin(formData) {
  const me = await requireUser();
  await prisma.bulletin.deleteMany({ where: { id: String(formData.get('id') || ''), authorId: me.id } });
  redirect('/bulletins');
}

// ---------- mail ----------

export async function sendMessage(formData) {
  const me = await requireUser();
  const to = str(formData, 'to', 40).toLowerCase().replace(/^@/, '');
  const subject = str(formData, 'subject', 150) || '(no subject)';
  const body = str(formData, 'body', 10000);
  const back = `/mail/compose?to=${encodeURIComponent(to)}`;

  if (!body) redirect(withParam(back, 'error', 'Your message is empty.'));
  const recipient = await prisma.user.findUnique({ where: { username: to } });
  if (!recipient) redirect(withParam(back, 'error', `No member named "${to}".`));
  if (recipient.id === me.id) redirect(withParam(back, 'error', "You can't message yourself."));

  const recentCount = await prisma.message.count({
    where: { senderId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recentCount >= 10) redirect(withParam(back, 'error', 'Slow down! Too many messages in a minute.'));

  await prisma.message.create({
    data: { senderId: me.id, recipientId: recipient.id, subject, body },
  });
  redirect('/mail/sent?sent=1');
}

export async function deleteMessage(formData) {
  const me = await requireUser();
  const id = String(formData.get('id') || '');
  const msg = await prisma.message.findUnique({ where: { id } });
  if (msg) {
    if (msg.recipientId === me.id) {
      await prisma.message.update({ where: { id }, data: { recipientDeleted: true } });
    } else if (msg.senderId === me.id) {
      await prisma.message.update({ where: { id }, data: { senderDeleted: true } });
    }
  }
  redirect(msg?.senderId === me.id && msg?.recipientId !== me.id ? '/mail/sent' : '/mail');
}

// ---------- photos ----------

export async function addPhoto(formData) {
  const me = await requireUser();
  const back = `/${me.username}/photos`;
  let url;
  try {
    url = cleanUrl(formData.get('url'));
  } catch (e) {
    redirect(withParam(back, 'error', e.message));
  }
  if (!url) redirect(withParam(back, 'error', 'Choose a photo first.'));
  const count = await prisma.photo.count({ where: { userId: me.id } });
  if (count >= 300) redirect(withParam(back, 'error', 'You have hit the 300 photo limit.'));

  await prisma.photo.create({ data: { userId: me.id, url, caption: str(formData, 'caption', 200) } });
  redirect(back);
}

export async function deletePhoto(formData) {
  const me = await requireUser();
  await prisma.photo.deleteMany({ where: { id: String(formData.get('id') || ''), userId: me.id } });
  redirect(`/${me.username}/photos`);
}

export async function makeProfilePic(formData) {
  const me = await requireUser();
  const photo = await prisma.photo.findFirst({ where: { id: String(formData.get('id') || ''), userId: me.id } });
  if (photo) await prisma.user.update({ where: { id: me.id }, data: { avatarUrl: photo.url } });
  redirect(`/${me.username}/photos?saved=1`);
}
