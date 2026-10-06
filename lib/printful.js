import crypto from 'node:crypto';

/**
 * Tiny Printful client (API v1, no extra packages).
 * Needs PRINTFUL_API_KEY in Vercel: a private token from developers.printful.com.
 * If the token is for your whole account (not one store), also set PRINTFUL_STORE_ID.
 */
const API = 'https://api.printful.com';

export function printfulConfigured() {
  return !!String(process.env.PRINTFUL_API_KEY || '').trim();
}

/**
 * cache: seconds to reuse the answer (product lists), or 0 for always fresh.
 * Throws an Error with Printful's own message when something goes wrong.
 */
export async function pf(method, path, body, { cache = 0 } = {}) {
  const key = String(process.env.PRINTFUL_API_KEY || '').trim();
  if (!key) throw new Error('PRINTFUL_API_KEY is not set');
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const store = String(process.env.PRINTFUL_STORE_ID || '').trim();
  if (store) headers['X-PF-Store-Id'] = store;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...(cache && method === 'GET' ? { next: { revalidate: cache, tags: ['merch'] } } : { cache: 'no-store' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.result || `request failed (${res.status})`;
    throw new Error(`Printful ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return data.result;
}

/** A secret for the webhook address, made from the API key (nothing extra to set up). */
export function webhookKey() {
  return crypto.createHash('sha256').update(`bfrenz-printful:${process.env.PRINTFUL_API_KEY || ''}`).digest('hex').slice(0, 32);
}
