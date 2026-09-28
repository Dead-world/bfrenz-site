'use client';

import { useEffect, useRef, useState } from 'react';

/** Profile song player. Tries to autoplay (browsers often block it until a click). */
export default function SongPlayer({ src, title, artist }) {
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
