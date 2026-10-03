/**
 * "Support me" buttons: fans pay creators directly through apps the creator already uses.
 * BFRENZ never touches the money and takes no cut. We only store usernames and build
 * the links ourselves, so a button can only ever go to the real app.
 * No database code here, so the Edit page can use it in the browser too.
 */
export const SUPPORT_KINDS = [
  { kind: 'cashapp', label: 'Cash App', emoji: '💵', prefix: '$', placeholder: 'yourcashtag', re: /^(?=[A-Za-z0-9_]*[A-Za-z])[A-Za-z0-9_]{1,20}$/, url: (h) => `https://cash.app/$${h}` },
  { kind: 'venmo', label: 'Venmo', emoji: '💙', prefix: '@', placeholder: 'your-venmo', re: /^[A-Za-z0-9_-]{5,30}$/, url: (h) => `https://venmo.com/u/${h}` },
  { kind: 'paypal', label: 'PayPal', emoji: '🅿️', prefix: 'paypal.me/', placeholder: 'yourname', re: /^[A-Za-z0-9]{1,20}$/, url: (h) => `https://paypal.me/${h}` },
  { kind: 'kofi', label: 'Ko-fi', emoji: '☕', prefix: 'ko-fi.com/', placeholder: 'yourname', re: /^[A-Za-z0-9_]{1,40}$/, url: (h) => `https://ko-fi.com/${h}` },
  { kind: 'patreon', label: 'Patreon', emoji: '🎨', prefix: 'patreon.com/', placeholder: 'yourname', re: /^[A-Za-z0-9_-]{1,64}$/, url: (h) => `https://www.patreon.com/${h}` },
  { kind: 'bmac', label: 'Buy Me a Coffee', emoji: '🧋', prefix: 'buymeacoffee.com/', placeholder: 'yourname', re: /^[A-Za-z0-9_-]{1,40}$/, url: (h) => `https://buymeacoffee.com/${h}` },
];
export const SUPPORT_NOTE_MAX = 120;

const kindOf = (k) => SUPPORT_KINDS.find((s) => s.kind === k);

/** What people paste is messy: "$Kayla", "@kayla", "https://paypal.me/kayla"… keep just the handle. */
export function cleanHandle(kind, raw) {
  const k = kindOf(kind);
  if (!k) return '';
  let h = String(raw || '').trim();
  h = h.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  h = h.replace(/^(cash\.app\/|venmo\.com\/(u\/)?|paypal\.me\/|paypal\.com\/paypalme\/|ko-fi\.com\/|patreon\.com\/|buymeacoffee\.com\/)/i, '');
  h = h.replace(/^[$@]/, '').replace(/[/?#].*$/, '');
  return k.re.test(h) ? h : '';
}

/** Saved form → [{ kind, handle }] in the standard order, plus any handles that didn't look right. */
export function cleanSupport(entries) {
  const out = [];
  const bad = [];
  for (const k of SUPPORT_KINDS) {
    const raw = String(entries[k.kind] || '').trim();
    if (!raw) continue;
    const h = cleanHandle(k.kind, raw);
    if (h) out.push({ kind: k.kind, handle: h });
    else bad.push(k.label);
  }
  return { list: out, bad };
}

/** The buttons to show: [{ kind, label, emoji, text, url }]. */
export function supportButtons(user) {
  const raw = Array.isArray(user?.supportLinks) ? user.supportLinks : [];
  return raw
    .map((s) => {
      const k = kindOf(s?.kind);
      const h = k ? cleanHandle(k.kind, s.handle) : '';
      return h ? { kind: k.kind, label: k.label, emoji: k.emoji, text: `${k.prefix === '$' || k.prefix === '@' ? k.prefix : ''}${h}`, url: k.url(h) } : null;
    })
    .filter(Boolean);
}

export function handleFor(user, kind) {
  const raw = Array.isArray(user?.supportLinks) ? user.supportLinks : [];
  return raw.find((s) => s?.kind === kind)?.handle || '';
}
