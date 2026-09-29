'use client';

import { useEffect, useState } from 'react';

/** Copy link + native share sheet + quick links to the big apps. */
export default function ShareButtons({ url, text = 'Come be my fren on BFRENZ!' }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: 'BFRENZ', text, url });
    } catch {}
  }

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return (
    <div className="share">
      <div className="share-url">
        <input type="text" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Your link" />
        <button type="button" className="btn small-btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
      </div>
      <div className="actions">
        {canShare && (
          <button type="button" className="btn ghost small-btn" onClick={nativeShare}>Share…</button>
        )}
        <a className="btn ghost small-btn" href={`sms:?&body=${t}%20${u}`}>Text</a>
        <a className="btn ghost small-btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${t}%20${u}`}>WhatsApp</a>
        <a className="btn ghost small-btn" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${t}&url=${u}`}>X</a>
        <a className="btn ghost small-btn" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${u}`}>Facebook</a>
      </div>
    </div>
  );
}
