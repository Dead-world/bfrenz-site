import { songSource } from './songEmbed';

export const PLAYLIST_MAX = 10; // songs in total, counting the main profile song

function clip(v, n) {
  return String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
}

/** Cleans the extra songs sent from the Edit Profile form (drops anything unplayable). */
export function cleanPlaylist(raw, max = PLAYLIST_MAX - 1) {
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw || '[]');
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const t of list) {
    const url = clip(t?.url, 1000);
    if (!url || !/^https?:\/\/[^\s"'<>]+$/i.test(url) || !songSource(url)) continue;
    out.push({ url, title: clip(t?.title, 100), artist: clip(t?.artist, 100) });
    if (out.length >= max) break;
  }
  return out;
}

/** Every song on a profile, main song first. */
export function profileTracks(user) {
  const main = user?.songUrl ? [{ url: user.songUrl, title: user.songTitle || '', artist: user.songArtist || '' }] : [];
  return [...main, ...cleanPlaylist(user?.playlist)].slice(0, PLAYLIST_MAX);
}
