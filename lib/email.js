/**
 * Sends email through Resend (resend.com) using its plain HTTP API,
 * so no extra packages are needed.
 *
 * Needs these environment variables in Vercel:
 *   RESEND_API_KEY  - from resend.com -> API Keys (starts with re_)
 *   EMAIL_FROM      - e.g.  BFRENZ <no-reply@bfrenz.com>
 *                     (the domain must be verified in Resend)
 */

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({ to, subject, html, text }) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const from = String(process.env.EMAIL_FROM || 'BFRENZ <no-reply@bfrenz.com>').trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Email failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

/** The public address of the site, used to build links in emails. */
export function siteUrl() {
  const raw = String(process.env.SITE_URL || 'https://www.bfrenz.com').trim();
  return raw.replace(/\/+$/, '');
}
