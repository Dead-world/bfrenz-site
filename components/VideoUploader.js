'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';

/** Upload a video file (goes straight to Vercel Blob) or paste a YouTube link. */
export default function VideoUploader({ maxMb = 100 }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      setStatus(`That video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${maxMb} MB. Try a shorter clip, or upload it to YouTube and paste the link.`);
      e.target.value = '';
      return;
    }
    setBusy(true);
    setPct(0);
    setStatus('Uploading... keep this page open');
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
      const blob = await upload(`video/${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: 'video',
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setPct(Math.round(percentage)),
      });
      setUrl(blob.url);
      setStatus('Uploaded! Add a title and click Post video.');
    } catch (err) {
      let reason = err?.message || 'unknown error';
      try {
        const check = await fetch('/api/upload', { cache: 'no-store' }).then((r) => r.json());
        if (check?.problems?.length) reason = check.problems.join(' ');
      } catch {}
      setStatus('Upload failed: ' + reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="video-uploader stack">
      <label className="btn ghost small-btn picker" style={{ justifySelf: 'start' }}>
        {busy ? `Uploading… ${pct}%` : url ? 'Choose a different video' : 'Choose a video'}
        <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={onFile} disabled={busy} hidden />
      </label>
      {busy && (
        <div className="invite-progress" aria-label={`${pct}% uploaded`}>
          <div style={{ width: `${pct}%` }} />
        </div>
      )}
      {url && <video src={url} controls preload="metadata" className="video-preview" />}
      <input type="hidden" name="url" value={url} />
      <div className="small muted">MP4, MOV or WebM, up to {maxMb} MB.</div>
      <div className="small">
        or paste a YouTube link:{' '}
        <input type="url" name="youtube" placeholder="https://youtube.com/watch?v=..." size={40} disabled={!!url} />
      </div>
      {status && <div className="small status">{status}</div>}
      <input type="text" name="title" placeholder="Title" maxLength={100} required />
      <textarea name="description" rows={2} maxLength={1000} placeholder="Description (optional)" />
      <label className="small">
        <input type="checkbox" name="onProfile" /> Show this video on my profile
      </label>
      <div>
        <button className="btn" type="submit" disabled={busy}>Post video</button>
      </div>
    </div>
  );
}
