'use server';

import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/moderation';
import { str, withParam } from '@/lib/util';
import { notify } from '@/lib/push';
import { getSticker } from '@/lib/stickers';

const BACK = '/admin?tab=stickers';

async function requireAdmin() {
  const me = await requireUser();
  if (!isAdmin(me)) notFound();
  return me;
}

/** Admin: mark a sticker order as mailed (or undo it). Tells the buyer when it ships. */
export async function markStickerShipped(formData) {
  await requireAdmin();
  const id = str(formData, 'id', 40);
  const undo = formData.get('undo') === '1';
  const tracking = str(formData, 'tracking', 60);
  const order = await prisma.stickerOrder.findUnique({ where: { id } });
  if (!order) redirect(withParam(BACK, 'error', 'Order not found.'));
  if (undo) {
    await prisma.stickerOrder.update({ where: { id }, data: { status: 'paid', shippedAt: null } });
    redirect(BACK);
  }
  const first = order.status !== 'shipped';
  await prisma.stickerOrder.update({ where: { id }, data: { status: 'shipped', shippedAt: order.shippedAt || new Date(), tracking } });
  if (first) {
    const name = getSticker(order.slug)?.name || 'stickers';
    notify(order.userId, {
      title: `📦 Your ${order.qty === 1 ? name : `${order.qty} stickers`} shipped!`,
      body: tracking ? `USPS tracking: ${tracking}` : 'They’re in the mail. Most arrive in 3 to 10 days.',
      url: tracking ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tracking)}` : '/shop#stickers',
    });
  }
  redirect(withParam(BACK, 'smsg', 'Marked as shipped. The buyer got a notification.'));
}

/** Admin: how many stickers you have on hand. Leave blank to stop tracking (never sells out). */
export async function setStickerStock(formData) {
  await requireAdmin();
  const slug = str(formData, 'slug', 40);
  if (!getSticker(slug)) redirect(withParam(BACK, 'error', 'Unknown sticker.'));
  const raw = str(formData, 'stock', 7).trim();
  if (raw === '') {
    await prisma.shopStock.deleteMany({ where: { slug } });
  } else {
    const stock = Math.max(0, Math.min(1000000, parseInt(raw, 10) || 0));
    await prisma.shopStock.upsert({ where: { slug }, create: { slug, stock }, update: { stock } });
  }
  redirect(withParam(BACK, 'smsg', 'Stock saved.'));
}
