'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { popPos } from '@/lib/popPos';

/**
 * Share button. On phones it opens the phone's own share sheet (Messages, Facebook, Instagram,
 * TikTok, WhatsApp, Snapchat…). Where that isn't available it shows a small menu instead.
 * `path` is a page on this site, e.g. /post/abc.
 */
export default function ShareButton({ path, title = 'Check this out on BFRENZ', text = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState(null);
  const wrap = useRef(null);
  const menu = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!wrap.current?.contains(e.target) && !menu.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    const away = () => setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', away, { passive: true });
    window.addEventListener('resize', away);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', away);
      window.removeEventListener('resize', away);
    };
  }, [open]);

  const link = () => {
    const u = new URL(path, window.location.origin);
    u.searchParams.set('src', 'share'); // counts sign-ups that came from shared links
    return u.toString();
  };
  const blurb = (text || title).slice(0, 140);

  async function share() {
    const url = link();
    if (navigator.share) {
      try {
        await navigator.share({ title, text: blurb, url });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // they closed the share sheet
      }
    }
    setPos(popPos(wrap.current, { height: 340 }));
    setOpen((o) => !o);
  }

  async function copy() {
    const url = link();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement('textarea');
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
  }

  const enc = encodeURIComponent;
  const apps = open
    ? [
        ['📘', 'Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(link())}`],
        ['✖️', 'X', `https://twitter.com/intent/tweet?url=${enc(link())}&text=${enc(blurb)}`],
        ['🟢', 'WhatsApp', `https://wa.me/?text=${enc(`${blurb} ${link()}`)}`],
        ['👽', 'Reddit', `https://www.reddit.com/submit?url=${enc(link())}&title=${enc(title)}`],
        ['💬', 'Text message', `sms:?&body=${enc(`${blurb} ${link()}`)}`],
        ['✉️', 'Email', `mailto:?subject=${enc(title)}&body=${enc(`${blurb}\n\n${link()}`)}`],
      ]
    : [];

  return (
    <span className="share-wrap" ref={wrap}>
      <button type="button" className="linkbtn small share-btn" onClick={share} aria-expanded={open} aria-haspopup="menu">
        ↗ Share
      </button>
      {open && pos && createPortal(
        <span className="share-menu" role="menu" ref={menu} style={pos}>
          <button type="button" role="menuitem" onClick={copy}>{copied ? '✅ Link copied!' : '🔗 Copy link'}</button>
          {apps.map(([ico, name, href]) => (
            <a key={name} role="menuitem" href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              {ico} {name}
            </a>
          ))}
        </span>,
        document.body,
      )}
    </span>
  );
}
