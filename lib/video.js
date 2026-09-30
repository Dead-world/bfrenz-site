/** Pulls the video id out of any normal YouTube link (watch, youtu.be, shorts, embed, live). */
export function youtubeId(link) {
  const s = String(link || '').trim();
  const m =
    /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/.exec(s) ||
    /^(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{11})/.exec(s);
  return m ? m[1] : '';
}

export function videoMaxMb() {
  return Math.max(5, Math.min(500, parseInt(process.env.VIDEO_MAX_MB || '100', 10) || 100));
}
