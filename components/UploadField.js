'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';

/**
 * File picker that uploads straight to Vercel Blob, then drops the resulting
 * link into a normal form field. People can also just paste a link.
 * kind: "image" or "song"
 */
export default function UploadField({ name, kind, accept, defaultValue = '' }) {
  const [url, setUrl] = useState(defaultValue);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus('Uploading... please wait');
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
      const blob = await upload(`${kind}/${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: kind,
      });
      setUrl(blob.url);
      setStatus('Uploaded! Now click Save.');
    } catch (err) {
      setStatus('Upload failed: ' + (err?.message || 'unknown error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload-field">
      <input type="file" accept={accept} onChange={onFile} disabled={busy} />
      <div className="small" style={{ marginTop: 4 }}>
        or paste a link:{' '}
        <input
          type="url"
          name={name}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          size={40}
        />
      </div>
      {status && <div className="small status">{status}</div>}
    </div>
  );
}
