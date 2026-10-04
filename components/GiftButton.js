'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { sendGift } from '@/app/actions/gifts';
import { GIFTS } from '@/lib/gifts';
import { popPos } from '@/lib/popPos';

/** The member's coin balance, shared by every gift button on the page. */
function useCoins(initial) {
  const [coins, setCoins] = useState(initial ?? 0);
  useEffect(() => {
    if (typeof window.__bfrenzCoins === 'number') setCoins(window.__bfrenzCoins);
    else if (typeof initial === 'number') window.__bfrenzCoins = initial;
    const on = (e) => setCoins(e.detail);
    window.addEventListener('bfrenz-coins', on);
    return () => window.removeEventListener('bfrenz-coins', on);
  }, [initial]);
  const update = (n) => {
    window.__bfrenzCoins = n;
    window.dispatchEvent(new CustomEvent('bfrenz-coins', { detail: n }));
  };
  return [coins, update];
}

/** A big gift that floats up the screen after it's sent. */
function burst(emoji) {
  const el = document.createElement('div');
  el.className = 'gift-burst';
  el.textContent = emoji;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

/**
 * 🎁 gifts on anything: shows what it has received, and (unless it's yours) lets you send one.
 * look: 'bar' (in a feed footer), 'contact' (profile contact box), 'live' (live stream).
 */
export default function GiftButton({ k, totals, coins: myCoins, mine = false, look = 'bar', label = 'Gift' }) {
  const [t, setT] = useState(totals || null);
  const [coins, setCoins] = useCoins(myCoins);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, start] = useTransition();
  const btn = useRef(null);
  const pop = useRef(null);

  useEffect(() => setT(totals || null), [JSON.stringify(totals || null)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!btn.current?.contains(e.target) && !pop.current?.contains(e.target)) setOpen(false); };
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

  function send(g) {
    if (coins < g.coins) {
      setMsg('need');
      return;
    }
    setMsg('');
    setCoins(coins - g.coins);
    setOpen(false);
    burst(g.emoji);
    start(async () => {
      try {
        const r = await sendGift(k, g.slug);
        if (r?.ok) {
          setCoins(r.coins);
          setT(r.totals);
        } else {
          setCoins(coins);
          setMsg(r?.needCoins ? 'need' : r?.error || 'Not sent');
          setOpen(true);
        }
      } catch {
        setCoins(coins);
      }
    });
  }

  const count = t?.count || 0;
  const summary = count > 0 && (
    <span className="gift-sum" title={`${count} ${count === 1 ? 'gift' : 'gifts'}`}>
      {t.top?.join('')} {count}
    </span>
  );
  if (mine) return summary || null;

  return (
    <span className={`gift-wrap gift-${look}`}>
      {look !== 'contact' && summary}
      <button
        type="button"
        ref={btn}
        className={look === 'contact' ? 'linkbtn gift-contact-btn' : 'linkbtn small gift-btn'}
        onClick={() => {
          setPos(popPos(btn.current, { height: 300, align: look === 'bar' ? 'right' : 'left', width: Math.min(292, window.innerWidth - 16) }));
          setMsg('');
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        disabled={busy && !open}
      >
        {look === 'contact' ? <><span className="ico">🎁</span>{label}</> : `🎁 ${label}`}
      </button>
      {open && pos && createPortal(
        <div className="gift-pop" ref={pop} style={pos} role="dialog" aria-label="Send a gift">
          <div className="gift-pop-head">
            <b>Send a gift</b>
            <span className="gift-bal">🪙 {coins.toLocaleString('en-US')}</span>
          </div>
          <div className="gift-grid">
            {GIFTS.map((g) => (
              <button key={g.slug} type="button" className={`gift-opt${coins < g.coins ? ' poor' : ''}`} onClick={() => send(g)}>
                <span className="gx-emoji">{g.emoji}</span>
                <span className="gift-name">{g.name}</span>
                <span className="gift-cost">🪙 {g.coins}</span>
              </button>
            ))}
          </div>
          {msg === 'need' ? (
            <a href="/coins" className="btn small-btn gift-more">Not enough coins · Get coins</a>
          ) : msg ? (
            <div className="small gift-err">{msg}</div>
          ) : (
            <a href="/coins" className="small gift-get">+ Get coins</a>
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}
