'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { songSource } from '@/lib/songEmbed';

/**
 * Profile music player. Plays one song, or a whole playlist one after another.
 * - Uploaded/direct audio files play in the BFRENZ player (with prev/next, seek bar).
 * - YouTube and SoundCloud play in their own player and move on to the next song when they end.
 * - Spotify, Apple Music and others play in their own player; use Next to skip ahead.
 * Usage: <SongPlayer tracks={[{ url, title, artist }]} /> or <SongPlayer src title artist />
 */
export default function SongPlayer({ tracks, src, title, artist, heading }) {
  const list = (tracks || [{ url: src, title, artist }])
    .map((t) => ({ ...t, source: songSource(t.url) }))
    .filter((t) => t.source);
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(false); // autoplay the next song (only after someone presses play/next)
  const [playing, setPlaying] = useState(false);
  const many = list.length > 1;

  const go = useCallback(
    (i, play = true) => {
      if (!list.length) return;
      setIdx(((i % list.length) + list.length) % list.length);
      setAuto(play);
    },
    [list.length],
  );
  const next = useCallback(() => go(idx + 1), [go, idx]);
  const prev = () => go(idx - 1);

  if (!list.length) return null;
  const cur = list[Math.min(idx, list.length - 1)];
  const label = heading || (many ? 'Playlist' : 'Profile Song');

  return (
    <div className={`box song-player${many ? ' is-playlist' : ''}`}>
      <div className="box-h">
        &#9835; {label}
        {many && <span className="right small">{idx + 1} / {list.length}</span>}
      </div>

      {cur.source.kind === 'audio' ? (
        <AudioDeck
          key={`a-${idx}`}
          src={cur.source.src}
          title={cur.title}
          artist={cur.artist}
          autoplay={auto}
          tryAutoplay={idx === 0 && !auto}
          many={many}
          onEnded={many ? next : null}
          onPrev={prev}
          onNext={next}
          onPlaying={setPlaying}
        />
      ) : (
        <EmbedDeck key={`e-${idx}`} source={cur.source} title={cur.title} artist={cur.artist} autoplay={auto} many={many} onEnded={many ? next : null} onPrev={prev} onNext={next} />
      )}

      {many && (
        <ol className="pl-list">
          {list.map((t, i) => (
            <li key={i}>
              <button type="button" className={`pl-item${i === idx ? ' on' : ''}`} onClick={() => go(i)}>
                <span className="pl-n">{i === idx && (playing || cur.source.kind !== 'audio') ? <span className="eq mini"><i /><i /><i /></span> : i + 1}</span>
                <span className="pl-t">
                  <b>{t.title || 'Untitled'}</b>
                  {t.artist && <span className="small"> · {t.artist}</span>}
                </span>
                {t.source.kind !== 'audio' && <span className="pl-src small">{t.source.provider}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/** BFRENZ's own player for real audio files. */
function AudioDeck({ src, title, artist, autoplay, tryAutoplay, many, onEnded, onPrev, onNext, onPlaying }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  const setP = useCallback(
    (v) => {
      setPlaying(v);
      onPlaying?.(v);
    },
    [onPlaying],
  );

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.volume = 0.6;
    // First song tries to autoplay (browsers often block it until a click); later songs play on their own.
    if (autoplay || tryAutoplay) a.play().then(() => setP(true)).catch(() => setP(false));
  }, [autoplay, tryAutoplay, setP]);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setP(true)).catch(() => {});
    else {
      a.pause();
      setP(false);
    }
  }

  return (
    <>
      <div className="song-body">
        {many && <button type="button" className="song-skip" onClick={onPrev} aria-label="Previous song">⏮</button>}
        <button type="button" className="song-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '►'}
        </button>
        {many && <button type="button" className="song-skip" onClick={onNext} aria-label="Next song">⏭</button>}
        <div className="song-meta">
          <b>{title || 'Untitled'}</b>
          {artist && <div className="small">{artist}</div>}
          {playing && <div className="eq"><i /><i /><i /><i /><i /></div>}
        </div>
      </div>
      <div className="song-seek">
        <span className="small">{fmt(time)}</span>
        <input
          type="range"
          min={0}
          max={dur || 0}
          step="any"
          value={Math.min(time, dur || 0)}
          onChange={(e) => {
            const a = ref.current;
            if (a) a.currentTime = Number(e.target.value);
            setTime(Number(e.target.value));
          }}
          aria-label="Seek"
          disabled={!dur}
        />
        <span className="small">{fmt(dur)}</span>
      </div>
      <audio
        ref={ref}
        src={src}
        loop={!onEnded}
        preload="metadata"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onPause={() => setP(false)}
        onPlay={() => setP(true)}
        onEnded={() => {
          setP(false);
          onEnded?.();
        }}
      />
    </>
  );
}

/**
 * Another site's player. YouTube and SoundCloud tell us when the song ends
 * (through their embed messaging), so the playlist can move on.
 */
function EmbedDeck({ source, title, artist, autoplay, many, onEnded, onPrev, onNext }) {
  const frame = useRef(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  let url = source.src;
  if (source.provider === 'YouTube') {
    url += `&enablejsapi=1${autoplay ? '&autoplay=1' : ''}`;
    if (typeof window !== 'undefined') url += `&origin=${encodeURIComponent(window.location.origin)}`;
  } else if (source.provider === 'SoundCloud' && autoplay) {
    url = url.replace('auto_play=false', 'auto_play=true');
  } else if (autoplay && (source.provider === 'Spotify' || source.provider === 'Deezer')) {
    url += (url.includes('?') ? '&' : '?') + 'autoplay=1';
  }

  useEffect(() => {
    if (source.provider !== 'YouTube' && source.provider !== 'SoundCloud') return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      endedRef.current?.();
    };
    function onMessage(e) {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      let d = e.data;
      if (typeof d === 'string') {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      if (!d || typeof d !== 'object') return;
      // YouTube: state 0 = ended
      if (d.event === 'onStateChange' && d.info === 0) finish();
      if (d.event === 'infoDelivery' && d.info && d.info.playerState === 0) finish();
      // SoundCloud
      if (d.method === 'finish') finish();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [source.provider]);

  function onLoad() {
    const w = frame.current?.contentWindow;
    if (!w) return;
    if (source.provider === 'YouTube') {
      w.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
      w.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'widget' }), '*');
    } else if (source.provider === 'SoundCloud') {
      w.postMessage(JSON.stringify({ method: 'addEventListener', value: 'finish' }), '*');
    }
  }

  return (
    <>
      {(title || artist || many) && (
        <div className="song-meta song-meta-embed">
          {many && (
            <span className="pl-skips">
              <button type="button" className="song-skip" onClick={onPrev} aria-label="Previous song">⏮</button>
              <button type="button" className="song-skip" onClick={onNext} aria-label="Next song">⏭</button>
            </span>
          )}
          <span>
            <b>{title || 'Untitled'}</b>
            {artist && <span className="small"> &middot; {artist}</span>}
          </span>
        </div>
      )}
      {source.kind === 'embed' ? (
        <iframe
          ref={frame}
          className="song-embed"
          src={url}
          title={title || `${source.provider} player`}
          height={source.height}
          loading="lazy"
          onLoad={onLoad}
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
    </>
  );
}
