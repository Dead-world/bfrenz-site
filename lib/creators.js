import { prisma } from './db';

/** Creator types (key, label, emoji). "" = regular member. */
export const CREATOR_TYPES = [
  ['artist', 'Artist / Musician', '🎤'],
  ['dj', 'DJ / Producer', '🎧'],
  ['youtuber', 'YouTuber', '▶️'],
  ['streamer', 'Streamer', '🔴'],
  ['tiktoker', 'TikToker', '🎬'],
  ['podcaster', 'Podcaster', '🎙️'],
  ['gamer', 'Gamer', '🎮'],
  ['photographer', 'Photographer', '📸'],
  ['artist_visual', 'Visual Artist', '🎨'],
  ['comedian', 'Comedian', '😂'],
  ['dancer', 'Dancer', '💃'],
  ['writer', 'Writer / Poet', '✍️'],
  ['fashion', 'Fashion / Beauty', '💄'],
  ['fitness', 'Fitness', '💪'],
  ['other', 'Creator', '✨'],
];

export function creatorLabel(type) {
  const t = CREATOR_TYPES.find(([k]) => k === type);
  return t ? { label: t[1], emoji: t[2] } : null;
}

export const isCreator = (user) => !!creatorLabel(user?.creatorType);

export const MAX_LINKS = 8;

/** Works out which site a link points to, for its button icon and default label. */
export function linkKind(url) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return { site: 'Link', emoji: '🔗' };
  }
  const SITES = [
    [/youtube\.com|youtu\.be/, 'YouTube', '▶️'],
    [/tiktok\.com/, 'TikTok', '🎵'],
    [/instagram\.com/, 'Instagram', '📸'],
    [/twitch\.tv/, 'Twitch', '🔴'],
    [/(^|\.)x\.com|twitter\.com/, 'X', '✖️'],
    [/spotify\.com/, 'Spotify', '🟢'],
    [/soundcloud\.com/, 'SoundCloud', '☁️'],
    [/music\.apple\.com/, 'Apple Music', '🎵'],
    [/bandcamp\.com/, 'Bandcamp', '💿'],
    [/facebook\.com/, 'Facebook', '📘'],
    [/snapchat\.com/, 'Snapchat', '👻'],
    [/discord\.(gg|com)/, 'Discord', '💬'],
    [/patreon\.com/, 'Patreon', '🧡'],
    [/kick\.com/, 'Kick', '🟩'],
    [/cash\.app/, 'Cash App', '💵'],
    [/venmo\.com/, 'Venmo', '💸'],
    [/paypal\.(me|com)/, 'PayPal', '💳'],
    [/(shop|store|merch)/, 'Merch', '👕'],
  ];
  for (const [re, site, emoji] of SITES) if (re.test(host)) return { site, emoji };
  return { site: host.split('.').slice(-2).join('.'), emoji: '🔗' };
}

/** Cleans the links saved from the Creator settings form. */
export function cleanLinks(rows) {
  const out = [];
  for (const r of rows) {
    const url = String(r.url || '').trim().slice(0, 500);
    if (!url || !/^https?:\/\/[^\s"'<>]+$/i.test(url)) continue;
    const label = String(r.label || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
    out.push({ url, label });
    if (out.length >= MAX_LINKS) break;
  }
  return out;
}

/** A creator's links with button text and icon filled in. */
export function displayLinks(user) {
  const list = Array.isArray(user?.creatorLinks) ? user.creatorLinks : [];
  return cleanLinks(list).map((l, i) => {
    const k = linkKind(l.url);
    return { ...l, i, emoji: k.emoji, text: l.label || k.site };
  });
}

export async function followerCount(userId) {
  return prisma.follow.count({ where: { followingId: userId, follower: { bannedAt: null } } });
}

export async function isFollowing(meId, userId) {
  if (!meId || meId === userId) return false;
  const f = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: meId, followingId: userId } }, select: { id: true } });
  return !!f;
}

/** Ids of everyone this member follows. */
export async function followingIds(meId) {
  const rows = await prisma.follow.findMany({ where: { followerId: meId }, select: { followingId: true } });
  return rows.map((r) => r.followingId);
}
