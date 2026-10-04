'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const POLL = 15000;

/** Splits "👍 Maya liked your post" into its emoji and the words. */
function split(title) {
  const m = /^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*|↩︎|@)\s*(.*)$/u.exec(title || '');
  return m ? [m[1], m[2]] : ['🔔', title];
}

/**
 * Live notifications on the site itself: checks for new alerts every few seconds while the
 * page is open, pops them up at the top of the screen, and keeps the 🔔 badges current.
 */
export default function LiveAlerts() {
  const router = useRouter();
  const [toasts, setToasts] = useState([]);
  const last = useRef(null);
  const busy = useRef(false);

  useEffect(() => {
    let stop = false;
    const broadcast = (unseen) => {
      window.__bfrenzAlerts = unseen;
      window.dispatchEvent(new CustomEvent('bfrenz-alerts', { detail: { unseen, live: true } }));
    };
    async function check() {
      if (busy.current || stop || document.visibilityState !== 'visible') return;
      busy.current = true;
      try {
        const q = last.current ? `?after=${encodeURIComponent(last.current)}` : '';
        const r = await fetch(`/api/alerts${q}`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        broadcast(d.unseen || 0);
        if (last.current && d.items?.length && !location.pathname.startsWith('/notifications')) {
          const fresh = d.items.slice(0, 3).reverse().map((a) => ({ ...a, key: `${a.id}-${a.createdAt}` }));
          setToasts((t) => [...t.filter((x) => !fresh.some((f) => f.id === x.id)), ...fresh].slice(-3));
          if (navigator.vibrate) navigator.vibrate(30);
        }
        const newest = [d.newest, ...(d.items || []).map((a) => a.createdAt)].filter(Boolean).sort().at(-1);
        if (newest && (!last.current || newest > last.current)) last.current = newest;
      } catch {
        // Offline for a moment: try again next round.
      } finally {
        busy.current = false;
      }
    }
    check();
    const timer = setInterval(check, POLL);
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    window.addEventListener('bfrenz-alerts-check', check);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
      window.removeEventListener('bfrenz-alerts-check', check);
    };
  }, []);

  // Each pop-up goes away by itself after a few seconds.
  useEffect(() => {
    if (!toasts.length) return undefined;
    const t = setTimeout(() => setToasts((list) => list.slice(1)), 6000);
    return () => clearTimeout(t);
  }, [toasts]);

  const dismiss = (id) => setToasts((list) => list.filter((x) => x.id !== id));
  const open = (a) => {
    dismiss(a.id);
    fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seen', id: a.id }) })
      .then(() => window.dispatchEvent(new Event('bfrenz-alerts-check')))
      .catch(() => {});
    router.push(a.url || '/notifications');
  };

  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((a) => {
        const [emoji, words] = split(a.title);
        return (
          <div key={a.key} className="toast">
            <button type="button" className="toast-main" onClick={() => open(a)}>
              <span className="toast-emoji">{emoji}</span>
              <span className="toast-text">
                <b>{words}</b>
                {a.body && <span>{a.body}</span>}
              </span>
            </button>
            <button type="button" className="toast-x" aria-label="Dismiss" onClick={() => dismiss(a.id)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}
