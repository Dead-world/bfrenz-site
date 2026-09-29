import crypto from 'node:crypto';

/**
 * Tiny Stripe client using Stripe's plain HTTP API (no extra packages).
 * Needs STRIPE_SECRET_KEY (sk_test_... or sk_live_...) in Vercel.
 */

const API = 'https://api.stripe.com/v1';
// Managed Payments (Stripe collects sales tax for you) needs 2025-03-31.basil or newer.
const VERSION = '2025-03-31.basil';

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** Turns {a: {b: [ {c: 1} ]}} into a[b][0][c]=1, the format Stripe expects. */
export function encodeForm(obj, prefix = '', out = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v !== null && typeof v === 'object') encodeForm(v, `${name}[${i}]`, out);
        else out.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(v))}`);
      });
    } else if (typeof value === 'object') {
      encodeForm(value, name, out);
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out.join('&');
}

async function call(method, path, params) {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': VERSION,
    },
    body: method === 'GET' ? undefined : encodeForm(params || {}),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Stripe ${res.status}: ${data?.error?.message || 'request failed'}`);
  }
  return data;
}

export const stripe = {
  createCheckoutSession: (params) => call('POST', '/checkout/sessions', params),
  getCheckoutSession: (id) => call('GET', `/checkout/sessions/${encodeURIComponent(id)}`),
  getSubscription: (id) => call('GET', `/subscriptions/${encodeURIComponent(id)}`),
  createPortalSession: (params) => call('POST', '/billing_portal/sessions', params),
};

/** Subscription end date, which moved between Stripe API versions. */
export function periodEnd(sub) {
  const s = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end;
  return s ? new Date(s * 1000) : null;
}

/**
 * Checks that a webhook really came from Stripe.
 * header looks like: t=1700000000,v1=abc123...,v1=...
 */
export function verifyWebhook(rawBody, header, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.create(null);
  const sigs = [];
  for (const piece of String(header).split(',')) {
    const i = piece.indexOf('=');
    if (i < 0) continue;
    const k = piece.slice(0, i).trim();
    const v = piece.slice(i + 1).trim();
    if (k === 'v1') sigs.push(v);
    else parts[k] = v;
  }
  const t = Number(parts.t);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('hex');
  const exp = Buffer.from(expected, 'hex');
  return sigs.some((s) => {
    const got = Buffer.from(s, 'hex');
    return got.length === exp.length && crypto.timingSafeEqual(got, exp);
  });
}
