import { NextResponse } from 'next/server';
import { printfulConfigured, webhookKey } from '@/lib/printful';
import { syncFromPrintful } from '@/lib/merchOrders';

/**
 * Printful calls this when an order ships (or is canceled/fails).
 * Printful doesn't sign these, so we never trust the message itself: we only take the
 * order number from it and read the real order back from Printful with our own key.
 */
export async function POST(request) {
  if (!printfulConfigured()) return NextResponse.json({ ok: false }, { status: 404 });
  const key = new URL(request.url).searchParams.get('key') || '';
  if (key !== webhookKey()) return NextResponse.json({ ok: false }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch { /* ignore */ }
  const order = body?.data?.order || {};
  const ref = order.id ? String(order.id) : order.external_id ? `@${order.external_id}` : '';
  if (!/^@?[\w-]{1,40}$/.test(ref)) return NextResponse.json({ ok: true, skipped: true });
  try {
    await syncFromPrintful(ref);
  } catch (err) {
    console.error('[printful webhook]', err?.message);
    return NextResponse.json({ ok: false }, { status: 500 }); // Printful will retry
  }
  return NextResponse.json({ ok: true });
}
