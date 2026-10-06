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
