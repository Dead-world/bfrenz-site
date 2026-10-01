'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';

/**
 * Extra songs for the profile playlist (the main song is edited above it).
 * Each song can be uploaded or pasted as a link. Sent to the server as JSON in a hidden field.
 */
export default function PlaylistEditor({ name = 'playlist', initial = [], max = 9 }) {
  const [tracks, setTracks] = useState(() => (Array.isArray(initial) ? initial : []).map((t, i) => ({ key: `t${i}`, url: t.url || '', title: t.title || '', artist: t.artist || '' })));
  const [status, setStatus] = useState({});

  const update = (key, patch) => setTracks((ts) => ts.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  const remove = (key) => setTracks((ts) => ts.filter((t) => t.key !== key));
  const move = (i, d) =>
    setTracks((ts) => {
      const j = i + d;
      if (j < 0 || j >= ts.length) return ts;
      const next = [...ts];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = () => setTracks((ts) => (ts.length >= max ? ts : [...ts, { key: `n${Date.now()}`, url: '', title: '', artist: '' }]));

  async function onFile(key, file) {
    if (!file) return;
    setStatus((s) => ({ ...s, [key]: 'Uploading… please wait' }));
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
      const blob = await upload(`song/${safeName}`, file, { access: 'public', handleUploadUrl: '/api/upload', clientPayload: 'song' });
      setTracks((ts) =>
        ts.map((t) => (t.key === key ? { ...t, url: blob.url, title: t.title || file.name.replace(/\.[^.]+$/, '').slice(0, 100) } : t)),
      );
      setStatus((s) => ({ ...s, [key]: 'Uploaded! Click Save when you’re done.' }));
    } catch (err) {
      setStatus((s) => ({ ...s, [key]: `Upload failed: ${err?.message || 'unknown error'}` }));
    }
  }

  const payload = JSON.stringify(tracks.filter((t) => t.url.trim()).map(({ url, title, artist }) => ({ url: url.trim(), title, artist })));

  return (
    <div className="playlist-editor">
      <input type="hidden" name={name} value={payload} />
      {tracks.length === 0 && <div className="small muted">No extra songs yet. Your main song plays by itself.</div>}
      <ol className="pl-edit-list">
        {tracks.map((t, i) => (
          <li key={t.key} className="pl-edit-row">
            <div className="pl-edit-num">{i + 2}</div>
            <div className="pl-edit-main">
              <input type="url" value={t.url} placeholder="Paste a link (YouTube, SoundCloud, Spotify…) or upload ↓" onChange={(e) => update(t.key, { url: e.target.value })} aria-label={`Song ${i + 2} link`} />
              <div className="pl-edit-meta">
                <input type="text" value={t.title} maxLength={100} placeholder="Song title" onChange={(e) => update(t.key, { title: e.target.value })} aria-label={`Song ${i + 2} title`} />
                <input type="text" value={t.artist} maxLength={100} placeholder="Artist" onChange={(e) => update(t.key, { artist: e.target.value })} aria-label={`Song ${i + 2} artist`} />
              </div>
              <label className="pl-upload small">
                or upload an MP3: <input type="file" accept="audio/*" onChange={(e) => onFile(t.key, e.target.files?.[0])} />
              </label>
              {status[t.key] && <div className="small status">{status[t.key]}</div>}
            </div>
            <div className="pl-edit-btns">
              <button type="button" className="im-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
              <button type="button" className="im-icon" onClick={() => move(i, 1)} disabled={i === tracks.length - 1} aria-label="Move down">▼</button>
              <button type="button" className="im-icon" onClick={() => remove(t.key)} aria-label="Remove song">✕</button>
            </div>
          </li>
        ))}
      </ol>
      {tracks.length < max ? (
        <button type="button" className="btn ghost small-btn" onClick={add}>+ Add a song</button>
      ) : (
        <div className="small muted">That&apos;s the max ({max + 1} songs total).</div>
      )}
    </div>
  );
}
