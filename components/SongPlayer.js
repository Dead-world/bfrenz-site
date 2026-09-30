'use client';

import { useEffect, useRef, useState } from 'react';
import { songSource } from '@/lib/songEmbed';

/**
 * Profile song. Uploaded/direct audio files play in our own player; links from
 * YouTube, SoundCloud, Spotify, Apple Music, Audiomack, Deezer and Google Drive
 * play in that site's own player; anything else gets a "Listen" link.
 */
export default function SongPlayer({ src, title, artist }) {
  const source = songSource(src);
  if (!source) return null;
  if (source.kind === 'audio') return <AudioPlayer src={source.src} title={title} artist={artist} />;
  return (
    <div className="box song-player">
      <div className="box-h">&#9835; Profile Song</div>
      {(title || artist) && (
        <div className="song-meta song-meta-embed">
          <b>{title || 'Untitled'}</b>
          {artist && <span className="small"> &middot; {artist}</span>}
        </div>
      )}
      {source.kind === 'embed' ? (
        <iframe
          className="song-embed"
          src={source.src}
          title={title || `${source.provider} player`}
          height={source.height}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="song-body">
          <a className="btn small-btn" href={source.href} target="_blank" rel="noopener noreferrer">
            &#9654; Listen on {source.provider}
          </a>
        </div>
      )}
    </div>
  );
}

/** Our own player for real audio files. Tries to autoplay (browsers often block it until a click). */
function AudioPlayer({ src, title, artist }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.volume = 0.6;
    a.play().then(() => setPlaying(true)).catch(() => {});
  }, []);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else {
      a.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="box song-player">
      <div className="box-h">&#9835; Profile Song</div>
      <div className="song-body">
        <button type="button" className="song-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '►'}
        </button>
        <div className="song-meta">
          <b>{title || 'Untitled'}</b>
          {artist && <div className="small">{artist}</div>}
          {playing && <div className="eq"><i /><i /><i /><i /><i /></div>}
        </div>
      </div>
      <audio ref={ref} src={src} loop preload="auto" onEnded={() => setPlaying(false)} />
    </div>
  );
}
