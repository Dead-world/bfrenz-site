/**
 * "Go Live" with a stream on YouTube, Twitch or TikTok: the platform carries the video (free,
 * no viewer limit) and BFRENZ shows it with the LIVE badge, chat and viewer count.
 * We only keep an id/channel name and build the player link ourselves.
 * No database code here, so the Go Live page can use it in the browser too.
 */
export const LINK_SOURCES = [
  { source: 'youtube', label: 'YouTube', emoji: '▶️', hint: 'On YouTube, open your live stream, tap Share and copy the link.' },
  { source: 'twitch', label: 'Twitch', emoji: '🟣', hint: 'Just your channel link, like twitch.tv/yourname.' },
  { source: 'tiktok', label: 'TikTok', emoji: '🎵', hint: 'Your TikTok profile link, like tiktok.com/@yourname. (TikTok doesn’t allow playing lives on other sites, so viewers get a big Watch on TikTok button.)' },
];
export const EXTERNAL_HOURS = 8; // link streams end on their own after this long

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const TWITCH_RESERVED = new Set(['videos', 'directory', 'settings', 'subscriptions', 'inventory', 'wallet', 'p', 'downloads', 'jobs', 'search']);

/** Paste → { source, ref } or { error }. */
export function parseStreamLink(raw) {
  let s = String(raw || '').trim();
  if (!s) return { error: 'Paste the link to your live stream.' };
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try {
    u = new URL(s);
  } catch {
    return { error: 'That doesn’t look like a link.' };
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  const parts = u.pathname.split('/').filter(Boolean);

  if (host === 'youtube.com' || host === 'youtu.be') {
    let id = '';
    if (host === 'youtu.be') id = parts[0] || '';
    else if (parts[0] === 'watch') id = u.searchParams.get('v') || '';
    else if (['live', 'embed', 'shorts'].includes(parts[0])) id = parts[1] || '';
    if (YT_ID.test(id)) return { source: 'youtube', ref: id };
    return { error: 'Use the link to the live video itself (open your stream on YouTube, tap Share, copy the link). A channel link won’t work.' };
  }
  if (host === 'twitch.tv') {
    const ch = (parts[0] || '').toLowerCase();
    if (/^[a-z0-9_]{3,25}$/.test(ch) && !TWITCH_RESERVED.has(ch)) return { source: 'twitch', ref: ch };
    return { error: 'Use your Twitch channel link, like twitch.tv/yourname.' };
  }
  if (host === 'tiktok.com') {
    const at = parts.find((p) => p.startsWith('@')) || '';
    const user = at.slice(1);
    if (/^[A-Za-z0-9_.]{2,24}$/.test(user)) return { source: 'tiktok', ref: user };
    return { error: 'Use your TikTok profile link, like tiktok.com/@yourname.' };
  }
  return { error: 'Paste a YouTube, Twitch or TikTok live link.' };
}

/** Where to watch it on the platform itself. */
export function streamPageUrl(source, ref) {
  if (source === 'youtube') return `https://www.youtube.com/watch?v=${ref}`;
  if (source === 'twitch') return `https://www.twitch.tv/${ref}`;
  if (source === 'tiktok') return `https://www.tiktok.com/@${ref}/live`;
  return null;
}

/** Player to show on BFRENZ (null = can't be embedded). Twitch needs our domain names as "parent". */
export function streamEmbedUrl(source, ref, hosts = []) {
  if (source === 'youtube') return `https://www.youtube.com/embed/${ref}?autoplay=1&mute=1&playsinline=1&rel=0`;
  if (source === 'twitch') {
    const parents = [...new Set(hosts.filter(Boolean).map((h) => String(h).toLowerCase().replace(/:\d+$/, '')))];
    return `https://player.twitch.tv/?channel=${ref}&${parents.map((p) => `parent=${encodeURIComponent(p)}`).join('&')}&autoplay=true&muted=true`;
  }
  return null;
}

export const sourceInfo = (source) => LINK_SOURCES.find((s) => s.source === source) || { source: 'browser', label: 'BFRENZ', emoji: '🔴' };
