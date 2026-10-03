/**
 * Works out how to play a profile-song link.
 *   { kind: 'audio', src }                       -> a real audio file: play it in our own player
 *   { kind: 'embed', src, height, provider }     -> YouTube / SoundCloud / Spotify / ... : use their player
 *   { kind: 'link', href, provider }             -> something we can't play here: show a "listen" link
 * Safe to use on the server and in the browser.
 */
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)(\?|#|$)/i;

export function songSource(raw) {
  const url = String(raw || '').trim();
  if (!url) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const path = u.pathname;

  // Dropbox share link -> direct file
  if (host === 'dropbox.com' || host === 'dl.dropboxusercontent.com') {
    u.searchParams.delete('dl');
    u.searchParams.set('raw', '1');
    return { kind: 'audio', src: u.toString() };
  }

  // Our own uploads and any direct audio file.
  if (host.endsWith('.blob.vercel-storage.com') || AUDIO_EXT.test(path)) {
    return { kind: 'audio', src: url };
  }

  // YouTube and YouTube Music
  let yt = '';
  if (host === 'youtu.be') yt = path.slice(1, 12);
  else if (/(^|\.)youtube\.com$/.test(host)) {
    yt = u.searchParams.get('v') || (/^\/(shorts|embed|live)\/([\w-]{11})/.exec(path)?.[2] ?? '');
  }
  if (/^[\w-]{11}$/.test(yt)) {
    return { kind: 'embed', provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0`, height: 200, thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, href: `https://www.youtube.com/watch?v=${yt}` };
  }

  // SoundCloud (tracks, playlists, on.soundcloud.com short links)
  if (host === 'soundcloud.com' || host === 'm.soundcloud.com' || host === 'on.soundcloud.com') {
    const clean = `https://soundcloud.com${path}`;
    const target = host === 'on.soundcloud.com' ? url : clean;
    return {
      kind: 'embed',
      provider: 'SoundCloud',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(target)}&color=%23ff7a1a&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`,
      height: 166,
    };
  }

  // Spotify (track / album / playlist / episode). Non-Spotify users hear a 30-second preview.
  if (host === 'open.spotify.com') {
    const m = /^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(path);
    if (m) {
      return {
        kind: 'embed',
        provider: 'Spotify',
        src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`,
        height: m[1] === 'track' || m[1] === 'episode' ? 152 : 352,
      };
    }
  }

  // Apple Music (plays previews unless the listener is signed in)
  if (host === 'music.apple.com') {
    return { kind: 'embed', provider: 'Apple Music', src: `https://embed.music.apple.com${path}${u.search}`, height: u.searchParams.get('i') ? 175 : 450 };
  }

  // Audiomack: /artist/song/slug -> /embed/song/artist/slug
  if (host === 'audiomack.com') {
    const m = /^\/([^/]+)\/(song|album|playlist)\/([^/]+)/.exec(path);
    if (m) return { kind: 'embed', provider: 'Audiomack', src: `https://audiomack.com/embed/${m[2]}/${m[1]}/${m[3]}`, height: m[2] === 'song' ? 252 : 400 };
  }

  // Deezer
  if (host === 'deezer.com') {
    const m = /\/(track|album|playlist)\/(\d+)/.exec(path);
    if (m) return { kind: 'embed', provider: 'Deezer', src: `https://widget.deezer.com/widget/dark/${m[1]}/${m[2]}`, height: m[1] === 'track' ? 150 : 300 };
  }

  // Google Drive file -> Drive's own player
  if (host === 'drive.google.com') {
    const id = /\/file\/d\/([\w-]+)/.exec(path)?.[1] || u.searchParams.get('id');
    if (id) return { kind: 'embed', provider: 'Google Drive', src: `https://drive.google.com/file/d/${id}/preview`, height: 120 };
  }

  // Anything else (Bandcamp, TIDAL, etc.): we can't play it, but we can link to it.
  const provider = host.split('.').slice(-2, -1)[0] || host;
  return { kind: 'link', href: url, provider: provider.charAt(0).toUpperCase() + provider.slice(1) };
}
