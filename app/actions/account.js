'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { del } from '@vercel/blob';
import { prisma } from '@/lib/db';
import { requireUser, destroySession } from '@/lib/auth';
import { stripe, stripeConfigured } from '@/lib/stripe';
import { findSubscription } from '@/lib/fulfill';
import { withParam } from '@/lib/util';

const BLOB = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

function blobToken() {
  let t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    const key = Object.keys(process.env).find((k) => k.endsWith('_READ_WRITE_TOKEN') && process.env[k]);
    t = key ? process.env[key] : '';
  }
  return String(t || '').trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Permanently deletes the member's account and everything they posted
 * (profile, photos, videos, songs, posts, comments, messages, IMs, friendships).
 * Their uploaded files are removed from storage and a Supporter subscription is cancelled.
 */
export async function deleteAccount(formData) {
  const me = await requireUser();
  const back = '/account/delete';
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '').trim().toUpperCase();

  if (confirm !== 'DELETE') redirect(withParam(back, 'error', 'Type DELETE to confirm.'));
  if (!(await bcrypt.compare(password, me.passwordHash))) redirect(withParam(back, 'error', "That password isn't right."));
  if ((process.env.FOUNDER_USERNAME || '').toLowerCase() === me.username) {
    redirect(withParam(back, 'error', "The site owner's account can't be deleted here. Remove it from FOUNDER_USERNAME first."));
  }

  // 1. Stop any Supporter billing right away.
  if (stripeConfigured()) {
    try {
      const sub = await findSubscription(me);
      if (sub && ['active', 'trialing', 'past_due'].includes(sub.status)) await stripe.cancelSubscriptionNow(sub.id);
    } catch (err) {
      console.error('[delete account] could not cancel subscription:', err?.message);
    }
  }

  // 2. Collect their uploaded files so they can be removed from storage.
  const [photos, videos, posts] = await Promise.all([
    prisma.photo.findMany({ where: { userId: me.id }, select: { url: true } }),
    prisma.video.findMany({ where: { userId: me.id }, select: { url: true } }),
    prisma.post.findMany({ where: { authorId: me.id }, select: { imageUrls: true, videoUrl: true } }),
  ]);
  const files = [
    me.avatarUrl, me.songUrl,
    ...(Array.isArray(me.playlist) ? me.playlist.map((t) => t?.url) : []),
    ...photos.map((p) => p.url),
    ...videos.map((v) => v.url),
    ...posts.flatMap((p) => [...p.imageUrls, p.videoUrl]),
  ].filter((u) => u && BLOB.test(u));

  // 3. Delete the account. Everything linked to it is removed along with it.
  await prisma.user.delete({ where: { id: me.id } });

  const token = blobToken();
  if (token && files.length) {
    try {
      const unique = [...new Set(files)];
      for (let i = 0; i < unique.length; i += 100) await del(unique.slice(i, i + 100), { token });
    } catch (err) {
      console.error('[delete account] could not remove some files:', err?.message);
    }
  }

  await destroySession();
  redirect('/goodbye');
}
