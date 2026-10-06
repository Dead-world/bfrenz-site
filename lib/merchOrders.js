import { prisma } from './db';
import { pf } from './printful';
import { notify } from './push';
import { merchShipping } from './merch';

const money = (c) => (c / 100).toFixed(2);

async function ownerId() {
  const owner = (process.env.FOUNDER_USERNAME || '').toLowerCase();
  if (!owner) return null;
  const u = await prisma.user.findUnique({ where: { username: owner }, select: { id: true } });
  return u?.id || null;
}

/**
 * Sends a paid order to Printful so they print and mail it. Safe to call again
 * (if Printful already has it, we just link to that order). Returns the updated order.
 * Set PRINTFUL_AUTO_CONFIRM=false to have orders wait as drafts for you to approve in Printful.
 */
export async function sendToPrintful(orderId) {
  const o = await prisma.merchOrder.findUnique({ where: { id: orderId } });
  if (!o || ['sent', 'shipped', 'canceled'].includes(o.status)) return o;
  const confirm = String(process.env.PRINTFUL_AUTO_CONFIRM || 'true').toLowerCase() !== 'false';
  try {
    let pfo = await pf('GET', `/orders/@${o.id}`).catch(() => null);
    if (!pfo) {
      const unit = Math.round((o.amountCents - merchShipping(o.qty)) / o.qty);
      pfo = await pf('POST', `/orders?confirm=${confirm ? 'true' : 'false'}`, {
        external_id: o.id,
        shipping: 'STANDARD',
        recipient: {
          name: o.shipName || 'BFRENZ customer',
          address1: o.line1,
          address2: o.line2 || undefined,
          city: o.city,
          state_code: o.state,
          country_code: o.country || 'US',
          zip: o.postal,
          email: o.email || undefined,
        },
        items: [{ sync_variant_id: Number(o.variantId), quantity: o.qty, retail_price: money(unit) }],
        retail_costs: { currency: 'USD', subtotal: money(unit * o.qty), shipping: money(merchShipping(o.qty)), tax: '0.00' },
      });
    }
    return await prisma.merchOrder.update({ where: { id: o.id }, data: { status: 'sent', printfulId: String(pfo?.id || ''), error: '' } });
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 500);
    console.error('[merch] Printful order failed:', msg);
    const updated = await prisma.merchOrder.update({ where: { id: o.id }, data: { status: 'failed', error: msg } });
    const boss = await ownerId();
    if (boss) notify(boss, { title: '⚠️ A merch order didn’t reach Printful', body: msg.slice(0, 200), url: '/admin?tab=merch', tag: 'merch-failed' });
    return updated;
  }
}

/** Reads an order back from Printful and records shipping/tracking. Tells the buyer when it ships. */
export async function syncFromPrintful(printfulIdOrExternal) {
  const pfo = await pf('GET', `/orders/${encodeURIComponent(printfulIdOrExternal)}`);
  if (!pfo) return null;
  const o = await prisma.merchOrder.findUnique({ where: { id: String(pfo.external_id || '') } });
  if (!o) return null;
  const ship = (pfo.shipments || []).find((s) => s.tracking_number) || (pfo.shipments || [])[0];
  if (ship && o.status !== 'shipped') {
    const updated = await prisma.merchOrder.update({
      where: { id: o.id },
      data: { status: 'shipped', printfulId: String(pfo.id), tracking: String(ship.tracking_number || '').slice(0, 80), trackingUrl: String(ship.tracking_url || '').slice(0, 400), shippedAt: new Date() },
    });
    notify(o.userId, {
      title: `📦 Your ${o.name} shipped!`,
      body: ship.tracking_number ? `Tracking: ${ship.tracking_number}` : 'It’s on its way!',
      url: /^https:\/\//.test(updated.trackingUrl) ? updated.trackingUrl : '/merch#orders',
    });
    return updated;
  }
  if (['canceled', 'failed'].includes(pfo.status) && o.status !== pfo.status) {
    const updated = await prisma.merchOrder.update({ where: { id: o.id }, data: { status: pfo.status === 'canceled' ? 'canceled' : 'failed', error: `Printful says: ${pfo.status}` } });
    const boss = await ownerId();
    if (boss) notify(boss, { title: `⚠️ Printful ${pfo.status} a merch order`, body: `${o.qty} × ${o.name} for @… Check the admin Merch tab.`, url: '/admin?tab=merch', tag: 'merch-failed' });
    return updated;
  }
  return o;
}

/** Called from the Stripe fulfillment once the buyer has paid. */
export async function createMerchOrder(session, user, md, shipping) {
  const [variantId, qtyRaw] = String(md.itemId || '').split(':');
  const qty = parseInt(qtyRaw, 10);
  if (!/^\d+$/.test(variantId) || !(qty > 0)) return;
  const o = await prisma.merchOrder.create({
    data: {
      userId: user.id,
      variantId,
      productId: String(md.productId || ''),
      name: String(md.name || 'BFRENZ merch').slice(0, 200),
      img: String(md.img || '').slice(0, 400),
      qty,
      amountCents: session.amount_total ?? 0,
      stripeSessionId: session.id,
      email: String(session.customer_details?.email || user.email || '').slice(0, 200),
      ...shipping,
    },
  });
  const sent = await sendToPrintful(o.id);
  const boss = await ownerId();
  if (boss && sent?.status === 'sent') notify(boss, { title: `👕 New merch order: ${qty} × ${o.name}`, body: `From @${user.username}. Printful is making it.`, url: '/admin?tab=merch', tag: 'merch-orders' });
}
