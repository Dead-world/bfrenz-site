'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { react, reactEmoji } from '@/app/actions/reactions';
import { EMOJIS } from '@/lib/feedKeys';

const EMPTY = { up: 0, down: 0, mine: 0, emo: {}, myEmo: null };

/**
 * 👍 Like / 👎 Dislike and emoji reactions for any feed item.
 * Updates right away (no page reload) and settles on what the server says.
 */
export default function LikeBar({ k, rx }) {
  const [s, setS] = useState({ ...EMPTY, ...rx, emo: { ...(rx?.emo || {}) } });
  const [picking, setPicking] = useState(false);
  const [, start] = useTransition();
  const wrap = useRef(null);

  // When the page reloads its data (after commenting, etc.), show the fresh counts.
  const fresh = JSON.stringify(rx || null);
  useEffect(() => {
    if (rx) setS({ ...EMPTY, ...rx, emo: { ...(rx.emo || {}) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh]);

  useEffect(() => {
    if (!picking) return;
    const close = (e) => { if (!wrap.current?.contains(e.target)) setPicking(false); };
    const esc = (e) => { if (e.key === 'Escape') setPicking(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [picking]);

  function send(guess, call) {
    const before = s;
    setS(guess);
    start(async () => {
      try {
        const r = await call();
        setS(r ? { ...EMPTY, ...r } : before);
      } catch {
        setS(before);
      }
    });
  }

  function press(v) {
    const n = { ...s };
    if (s.mine === 1) n.up--;
    if (s.mine === -1) n.down--;
    if (s.mine === v) n.mine = 0;
    else {
      n.mine = v;
      if (v === 1) n.up++;
      else n.down++;
    }
    send(n, () => react(k, v));
  }

  function pick(e) {
    setPicking(false);
    const emo = { ...s.emo };
    if (s.myEmo) emo[s.myEmo] = Math.max(0, (emo[s.myEmo] || 1) - 1);
    const myEmo = s.myEmo === e ? null : e;
    if (myEmo) emo[myEmo] = (emo[myEmo] || 0) + 1;
    for (const x of Object.keys(emo)) if (!emo[x]) delete emo[x];
    send({ ...s, emo, myEmo }, () => reactEmoji(k, e));
  }

  const chips = Object.entries(s.emo).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

  return (
    <span className="like-bar" ref={wrap}>
      <button type="button" className={`like-btn${s.mine === 1 ? ' on' : ''}`} aria-pressed={s.mine === 1} onClick={() => press(1)} title={s.mine === 1 ? 'Take back your like' : 'Like'}>
        👍 {s.mine === 1 ? 'Liked' : 'Like'}{s.up > 0 ? ` · ${s.up}` : ''}
      </button>
      <button type="button" className={`like-btn dislike${s.mine === -1 ? ' on' : ''}`} aria-pressed={s.mine === -1} onClick={() => press(-1)} title={s.mine === -1 ? 'Take back your dislike' : 'Dislike'}>
        👎 {s.mine === -1 ? 'Disliked' : 'Dislike'}{s.down > 0 ? ` · ${s.down}` : ''}
      </button>
      {chips.map(([e, n]) => (
        <button key={e} type="button" className={`emo-chip${s.myEmo === e ? ' on' : ''}`} onClick={() => pick(e)} title={s.myEmo === e ? 'Take back your reaction' : `React ${e}`}>
          {e} {n}
        </button>
      ))}
      <span className="emo-add-wrap">
        <button type="button" className={`like-btn emo-add${picking ? ' on' : ''}`} onClick={() => setPicking((p) => !p)} aria-expanded={picking} title="React with an emoji">
          {s.myEmo && !chips.length ? s.myEmo : '😀'}<span className="emo-plus">+</span>
        </button>
        {picking && (
          <span className="emo-pop" role="menu">
            {EMOJIS.map((e) => (
              <button key={e} type="button" role="menuitem" className={s.myEmo === e ? 'on' : ''} onClick={() => pick(e)} aria-label={`React ${e}`}>
                {e}
              </button>
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
