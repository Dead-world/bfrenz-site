export const SITE_NAME = 'BFRENZ';
export const SITE_DOMAIN = 'bfrenz.com';

export const RESERVED = new Set([
  'home', 'login', 'signup', 'logout', 'edit', 'browse', 'bulletins', 'mail', 'requests',
  'api', 'u', 'friends', 'photos', 'admin', 'about', 'terms', 'privacy', 'help', 'search',
  'settings', 'static', 'public', '_next', 'favicon.ico', 'icon.svg', 'robots.txt',
  'sitemap.xml', 'bfrenz', 'support', 'root', 'null', 'undefined',
]);

export function validateUsername(name) {
  if (!/^[a-z0-9_]{3,20}$/.test(name)) {
    return 'Usernames are 3-20 characters: letters, numbers and underscores only.';
  }
  if (RESERVED.has(name)) return 'That username is reserved. Try another.';
  return null;
}

/** Accepts an empty string or an http(s) link. Throws on anything else. */
export function cleanUrl(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (s.length > 1000 || !/^https?:\/\/[^\s"'<>]+$/i.test(s)) {
    throw new Error('Links must start with http:// or https://');
  }
  return s;
}

export function str(formData, key, max = 1000) {
  return String(formData.get(key) ?? '').trim().slice(0, max);
}

/** Only allow redirects back to our own pages. */
export function safeBack(value, fallback = '/home') {
  const s = String(value || '');
  return s.startsWith('/') && !s.startsWith('//') ? s : fallback;
}

export function withParam(path, key, value) {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export function fmtDate(d) {
  return new Date(d).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function fmtDay(d) {
  return new Date(d).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isOnline(user) {
  return !!user?.lastSeen && Date.now() - new Date(user.lastSeen).getTime() < 10 * 60 * 1000;
}
