import { NextResponse } from 'next/server';
import { verifyWebhook } from '@/lib/stripe';
import { fulfillCheckout, syncSubscription } from '@/lib/fulfill';

/**
 * Stripe calls this after payments and subscription changes.
 * In Stripe: Developers -> Webhooks -> Add endpoint
 *   URL:    https://www.bfrenz.com/api/stripe/webhook
 *   Events: checkout.session.completed, checkout.session.async_payment_succeeded,
 *           customer.subscription.updated, customer.subscription.deleted
 * Then copy the signing secret (whsec_...) into STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request) {
  const raw = await request.text();
  const ok = verifyWebhook(raw, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return NextResponse.json({ error: 'bad signature' }, { status: 400 });

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await fulfillCheckout(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object);
        break;
    }
  } catch (err) {
    console.error('[stripe webhook] failed:', err);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 }); // Stripe will retry
  }
  return NextResponse.json({ received: true });
}
