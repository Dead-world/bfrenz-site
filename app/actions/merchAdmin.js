'use server';

import { redirect, notFound } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/moderation';
import { siteUrl } from '@/lib/email';
import { str, withParam } from '@/lib/util';
import { pf, webhookKey } from '@/lib/printful';
import { sendToPrintful, syncFromPrintful } from '@/lib/merchOrders';
import { createStarterMerch } from '@/lib/merchStarter';
import { makeMerchPhotos } from '@/lib/merchPhotos';

const BACK = '/admin?tab=merch';
const done = (msg, bad = false) => redirect(withParam(BACK, bad ? 'error' : 'mmsg', msg));

async function requireAdmin() {
  const me = await requireUser();
  if (!isAdmin(me)) notFound();
  return me;
}

/** Re-sends an order that didn't reach Printful (for example, no card was on file there yet). */
export async function retryMerchOrder(formData) {
  await requireAdmin();
  const id = str(formData, 'id', 40);
  const o = await prisma.merchOrder.findUnique({ where: { id } });
  if (!o) done('Order not found.', true);
  if (o.status === 'failed') await prisma.merchOrder.update({ where: { id }, data: { status: 'paid' } });
  const r = await sendToPrintful(id);
  if (r?.status === 'sent') done('Sent to Printful. 🎉');
  done(`Still not going through: ${r?.error || 'unknown error'}`, true);
}

/** Asks Printful for the latest on an order (shipping + tracking). */
export async function checkMerchOrder(formData) {
  await requireAdmin();
  const id = str(formData, 'id', 40);
  let r;
  try {
    r = await syncFromPrintful(`@${id}`);
  } catch (err) {
    done(String(err?.message || err).slice(0, 300), true);
  }
  done(r?.status === 'shipped' ? 'It shipped! The buyer got a notification with tracking.' : 'Checked. Not shipped yet.');
}

/** Shows new Printful products (and price changes) right away instead of within 10 minutes. */
export async function refreshMerch() {
  await requireAdmin();
  revalidateTag('merch');
  done('Merch list refreshed from Printful.');
}

/** Tells Printful where to send "shipped" updates, so buyers get tracking automatically. */
export async function connectPrintfulWebhook() {
  await requireAdmin();
  try {
    await pf('POST', '/webhooks', {
      url: `${siteUrl()}/api/printful/webhook?key=${webhookKey()}`,
      types: ['package_shipped', 'order_failed', 'order_canceled'],
    });
  } catch (err) {
    done(String(err?.message || err).slice(0, 300), true);
  }
  done('Shipping updates are on. Buyers will get tracking automatically.');
}

/** Makes the starter BFRENZ merch line in your Printful store (tees, hoodie, hat, mug, phone case). */
export async function makeStarterMerch() {
  await requireAdmin();
  let results;
  try {
    results = await createStarterMerch();
  } catch (err) {
    done(`Printful: ${String(err?.message || err).slice(0, 250)}`, true);
  }
  revalidateTag('merch');
  const made = results.filter((r) => r.status === 'made');
  const later = results.filter((r) => r.status === 'later');
  const failed = results.filter((r) => r.status === 'failed');
  const parts = [];
  if (made.length) parts.push(`Created ${made.map((r) => r.name).join(', ')}.`);
  if (!made.length && !failed.length && !later.length) parts.push('All the starter merch is already in your Printful store.');
  if (later.length) parts.push(`Tap the button again to finish: ${later.map((r) => r.name).join(', ')}.`);
  if (failed.length) parts.push(`Couldn't make: ${failed.map((r) => `${r.name} (${r.error})`).join('; ')}.`);
  redirect(withParam(BACK, failed.length ? 'error' : 'mmsg', parts.join(' ').slice(0, 900)));
}

/** Makes real product photos (models, flat lays, lifestyle) with Printful's mockup generator. */
export async function makeMerchPhotosNow(formData) {
  await requireAdmin();
  const redo = formData?.get?.('redo') === '1';
  let results;
  try {
    results = await makeMerchPhotos({ redo });
  } catch (err) {
    done(String(err?.message || err).slice(0, 300), true);
  }
  revalidateTag('merch');
  const made = results.filter((r) => r.status === 'made');
  const later = results.filter((r) => r.status === 'later');
  const failed = results.filter((r) => r.status === 'failed');
  const parts = [];
  if (made.length) parts.push(`📸 New photos for ${made.map((r) => `${r.name} (${r.count})`).join(', ')}.`);
  if (later.length) parts.push(`Tap again to finish: ${later.map((r) => r.name).join(', ')}.`);
  if (!made.length && !later.length && !failed.length) parts.push('Every product already has photos. Use "Redo all photos" to make fresh ones.');
  if (failed.length) parts.push(`Couldn't make photos for: ${failed.map((r) => `${r.name} (${r.error})`).join('; ')}.`);
  redirect(withParam(BACK, failed.length && !made.length ? 'error' : 'mmsg', parts.join(' ').slice(0, 900)));
}
