'use client';

import { useEffect, useId, useState } from 'react';
import { songSource } from '@/lib/songEmbed';

const EVT = 'bfrenz-minisong';

/**
 * A song inside a feed item or the Featured Music box.
 *
 * Players from YouTube, Spotify, SoundCloud and others are heavy. Loading one per post made
 * phones run out of memory, and the browser replaced them with a sad-face box. So each song
 * shows a light "tap to play" card, the real player loads only when tapped, and starting one
 * song closes any other open player on the page.
 */
export default function MiniSong({ url, title, compact = false }) {
  const s = songSource(url);
  const me = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOther = (e) => { if (e.detail !== me) setOpen(false); };
    window.addEventListener(EVT, onOther);
    return () => window.removeEventListener(EVT, onOther);
  }, [me]);

  // Pause any other plain audio player when this one starts.
  useEffect(() => {
    const onPlay = (e) => {
      if (e.target?.tagName !== 'AUDIO') return;
      if (e.target.dataset.minisong === me) window.dispatchEvent(new CustomEvent(EVT, { detail: me }));
    };
    document.addEventListener('play', onPlay, true);
    return () => document.removeEventListener('play', onPlay, true);
  }, [me]);

  if (!s) return null;

  if (s.kind === 'audio') {
    return <audio className="feed-audio" controls preload="none" src={s.src} data-minisong={me} />;
  }

  const href = s.href || url;

  if (s.kind === 'embed') {
    if (!open) {
      return (
        <button
          type="button"
          className={`song-card${compact ? ' compact' : ''}`}
          onClick={() => {
            window.dispatchEvent(new CustomEvent(EVT, { detail: me }));
            document.querySelectorAll('audio').forEach((a) => a.pause());
            setOpen(true);
          }}
          aria-label={`Play ${title || 'song'} on ${s.provider}`}
        >
          {s.thumb ? <img className="song-card-art" src={s.thumb} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="song-card-art song-card-note">🎵</span>}
          <span className="song-card-text">
            <b>{title || 'Play song'}</b>
            <span className="small muted">{s.provider}</span>
          </span>
          <span className="song-card-play" aria-hidden="true">&#9654;</span>
        </button>
      );
    }
    let src = s.src;
    if (s.provider === 'YouTube') src += `&autoplay=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
    else if (s.provider === 'SoundCloud') src = src.replace('auto_play=false', 'auto_play=true');
    return (
      <div className="song-open">
        <iframe
          className={`song-embed ${compact ? 'fm-embed' : 'feed-embed'}`}
          src={src}
          title={title || `${s.provider} player`}
          height={Math.min(s.height, 166)}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <a className="song-out small" href={href} target="_blank" rel="noopener noreferrer">
          Not playing? Open on {s.provider} &#8599;
        </a>
      </div>
    );
  }

  return (
    <a className="btn ghost small-btn" href={href} target="_blank" rel="noopener noreferrer">
      &#9654; Listen on {s.provider}
    </a>
  );
}
