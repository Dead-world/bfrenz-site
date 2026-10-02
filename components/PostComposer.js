'use client';

import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { createPost } from '@/app/actions/posts';
import { MOODS } from '@/lib/moods';

const MAX_IMAGES = 4;

async function uploadFile(file, kind, onProgress) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const blob = await upload(`${kind}/${safeName}`, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    clientPayload: kind,
    multipart: file.size > 20 * 1024 * 1024,
    onUploadProgress: onProgress ? ({ percentage }) => onProgress(Math.round(percentage)) : undefined,
  });
  return blob.url;
}

async function uploadProblem(err) {
  let reason = err?.message || 'unknown error';
  try {
    const check = await fetch('/api/upload', { cache: 'no-store' }).then((r) => r.json());
    if (check?.problems?.length) reason = check.problems.join(' ');
  } catch {}
  return reason;
}

/** "What's on your mind?" box at the top of the feed. */
export default function PostComposer({ me, back = '/home', videoMaxMb = 100, creator = false }) {
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState('public'); // creators only
  const [images, setImages] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [panel, setPanel] = useState(''); // '', 'video', 'song', 'mood'
  const [mood, setMood] = useState('');
  const [youtube, setYoutube] = useState('');
  const [songUrl, setSongUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const photoInput = useRef(null);
  const videoInput = useRef(null);

  async function onPhotos(e) {
    const files = [...(e.target.files || [])].slice(0, MAX_IMAGES - images.length);
    e.target.value = '';
    if (!files.length) return;
    setError('');
    for (let i = 0; i < files.length; i++) {
      setBusy(`Uploading photo ${i + 1} of ${files.length}…`);
      try {
        const url = await uploadFile(files[i], 'image');
        setImages((list) => [...list, url].slice(0, MAX_IMAGES));
      } catch (err) {
        setError('Photo upload failed: ' + (await uploadProblem(err)));
      }
    }
    setBusy('');
  }

  async function onVideo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > videoMaxMb * 1024 * 1024) {
      setError(`That video is over ${videoMaxMb} MB. Try a shorter clip or paste a YouTube link.`);
      return;
    }
    setError('');
    setBusy('Uploading video… 0%');
    try {
      const url = await uploadFile(file, 'video', (pct) => setBusy(`Uploading video… ${pct}%`));
      setVideoUrl(url);
      setYoutube('');
    } catch (err) {
      setError('Video upload failed: ' + (await uploadProblem(err)));
    }
    setBusy('');
  }

  const hasContent = body.trim() || images.length || videoUrl || youtube.trim() || songUrl.trim() || mood;
  const toggle = (name) => setPanel((p) => (p === name ? '' : name));

  return (
    <form action={createPost} className="box composer" onSubmit={() => setSending(true)}>
      <input type="hidden" name="back" value={back} />
      <div className="composer-top">
        <img src={me.pic} alt="" width={44} height={44} className="composer-pic" />
        <textarea
          name="body"
          rows={body.length > 80 ? 4 : 2}
          maxLength={2000}
          placeholder={`What's on your mind, ${me.name}?`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {images.length > 0 && (
        <div className={`composer-images n${images.length}`}>
          {images.map((u) => (
            <div key={u} className="composer-thumb">
              <img src={u} alt="" />
              <button type="button" aria-label="Remove photo" onClick={() => setImages((l) => l.filter((x) => x !== u))}>✕</button>
              <input type="hidden" name="image" value={u} />
            </div>
          ))}
        </div>
      )}

      {videoUrl && (
        <div className="composer-video">
          <video src={videoUrl} controls preload="metadata" />
          <button type="button" className="linkbtn small" onClick={() => setVideoUrl('')}>Remove video</button>
        </div>
      )}
      <input type="hidden" name="videoUrl" value={videoUrl} />

      {panel === 'video' && !videoUrl && (
        <div className="composer-panel">
          <button type="button" className="btn ghost small-btn" onClick={() => videoInput.current?.click()} disabled={!!busy}>
            Upload a video
          </button>
          <span className="small muted"> or paste a YouTube link:</span>
          <input type="url" placeholder="https://youtube.com/watch?v=..." value={youtube} onChange={(e) => setYoutube(e.target.value)} />
        </div>
      )}
      <input type="hidden" name="youtube" value={videoUrl ? '' : youtube} />

      {panel === 'song' && (
        <div className="composer-panel">
          <span className="small muted">Song link (YouTube, SoundCloud, Spotify, Apple Music…):</span>
          <input type="url" placeholder="https://..." value={songUrl} onChange={(e) => setSongUrl(e.target.value)} />
        </div>
      )}
      <input type="hidden" name="songUrl" value={songUrl} />

      {panel === 'mood' && (
        <div className="composer-moods">
          {MOODS.map(([emoji, name]) => (
            <button
              key={name}
              type="button"
              className={`mood-chip${mood === name ? ' on' : ''}`}
              onClick={() => setMood((m) => (m === name ? '' : name))}
            >
              {emoji} {name}
            </button>
          ))}
        </div>
      )}
      <input type="hidden" name="mood" value={mood} />

      {(busy || error) && <div className={`small ${error ? 'composer-error' : 'muted'}`}>{error || busy}</div>}

      <div className="composer-bar">
        <button type="button" className="composer-tool" onClick={() => photoInput.current?.click()} disabled={!!busy || images.length >= MAX_IMAGES}>
          📷 Photo
        </button>
        <button type="button" className={`composer-tool${panel === 'video' ? ' on' : ''}`} onClick={() => toggle('video')} disabled={!!busy}>
          🎬 Video
        </button>
        <button type="button" className={`composer-tool${panel === 'song' ? ' on' : ''}`} onClick={() => toggle('song')}>
          🎵 Song
        </button>
        <button type="button" className={`composer-tool${panel === 'mood' || mood ? ' on' : ''}`} onClick={() => toggle('mood')}>
          {mood ? `${MOODS.find(([, m]) => m === mood)?.[0] || '🙂'} ${mood}` : '🙂 Mood'}
        </button>
        {creator && (
          <button
            type="button"
            className={`composer-tool composer-vis${visibility === 'public' ? ' on' : ''}`}
            onClick={() => setVisibility(visibility === 'public' ? 'frenz' : 'public')}
            title={visibility === 'public' ? 'Public: your followers and anyone on BFRENZ can see it' : 'Frenz only'}
          >
            {visibility === 'public' ? '🌍 Public' : '👥 Frenz'}
          </button>
        )}
        <input type="hidden" name="visibility" value={creator ? visibility : 'frenz'} />
        <button type="submit" className="btn small-btn composer-post" disabled={!hasContent || !!busy || sending}>
          {sending ? 'Posting…' : 'Post'}
        </button>
      </div>

      <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={onPhotos} />
      <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" hidden onChange={onVideo} />
    </form>
  );
}
