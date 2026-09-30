'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';

/**
 * Pick several photos at once. Each one uploads straight to Vercel Blob and
 * becomes a hidden "url" field, so the surrounding form saves them all together.
 */
export default function PhotoUploader({ max = 30 }) {
  const [urls, setUrls] = useState([]);
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFiles(e) {
    const files = [...(e.target.files || [])].slice(0, max);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    let done = 0;
    let failed = 0;
    let lastError = '';
    for (const file of files) {
      setStatus(`Uploading ${done + failed + 1} of ${files.length}...`);
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
        const blob = await upload(`image/${safeName}`, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          clientPayload: 'image',
        });
        setUrls((u) => [...u, blob.url]);
        done++;
      } catch (err) {
        failed++;
        lastError = err?.message || 'unknown error';
      }
    }
    if (failed && !done) {
      try {
        const check = await fetch('/api/upload', { cache: 'no-store' }).then((r) => r.json());
        if (check?.problems?.length) lastError = check.problems.join(' ');
      } catch {}
    }
    setStatus(
      failed
        ? `${done} uploaded, ${failed} failed (${lastError}).${done ? ' Click Add photos to save the ones that worked.' : ''}`
        : `${done} ready! Click Add photos to save.`,
    );
    setBusy(false);
  }

  return (
    <div className="photo-uploader">
      <label className="btn ghost small-btn picker">
        {busy ? 'Uploading…' : 'Choose photos'}
        <input type="file" accept="image/*" multiple onChange={onFiles} disabled={busy} hidden />
      </label>
      <span className="small muted"> You can pick several at once (up to {max}).</span>
      {urls.length > 0 && (
        <div className="pending-grid">
          {urls.map((u) => (
            <div key={u} className="pending">
              <img src={u} alt="" />
              <button type="button" className="linkbtn small" onClick={() => setUrls((x) => x.filter((y) => y !== u))} aria-label="Remove">
                ✕
              </button>
              <input type="hidden" name="url" value={u} />
            </div>
          ))}
        </div>
      )}
      <div className="small" style={{ marginTop: 6 }}>
        or paste a link:{' '}
        <input type="url" name="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." size={40} />
      </div>
      {status && <div className="small status">{status}</div>}
      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 10 }}>
        Add photos
      </button>
    </div>
  );
}
