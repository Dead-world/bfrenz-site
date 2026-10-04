'use client';

import { useEffect, useState } from 'react';
import { fxEmoji } from '@/lib/cosmetics';

const OFF_KEY = 'bfrenz.fxOff';

/**
 * A member's cursor trail and falling effect, on their profile page.
 * Never runs for people who've asked their device for less motion, and visitors can switch it off.
 */
export default function ProfileEffects({ cursor, fall }) {
  const trail = fxEmoji('cursor', cursor);
  const drop = fxEmoji('fall', fall);
  const [off, setOff] = useState(true);
  const [flakes, setFlakes] = useState([]);

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stored = false;
    try {
      stored = localStorage.getItem(OFF_KEY) === '1';
    } catch {}
    setOff(calm || stored);
  }, []);

  // Falling effect: a fixed set of pieces with random spots, sizes and speeds.
  useEffect(() => {
    if (off || !drop) return setFlakes([]);
    const n = window.innerWidth < 600 ? 16 : 26;
    setFlakes(
      Array.from({ length: n }, (_, i) => ({
        i,
        left: Math.random() * 100,
        size: 14 + Math.random() * 16,
        dur: 7 + Math.random() * 9,
        delay: -Math.random() * 16,
        drift: (Math.random() - 0.5) * 120,
        spin: Math.random() > 0.5 ? 360 : -360,
      })),
    );
  }, [off, drop]);

  // Cursor trail: little emoji that pop out behind the mouse and fade.
  useEffect(() => {
    if (off || !trail) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined; // phones have no mouse
    let last = 0;
    const onMove = (e) => {
      const now = performance.now();
      if (now - last < 45) return;
      last = now;
      const el = document.createElement('span');
      el.className = 'fx-trail';
      el.textContent = trail;
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`);
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 900);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [off, trail]);

  if (!trail && !drop) return null;
  const toggle = () => {
    const next = !off;
    setOff(next);
    try {
      localStorage.setItem(OFF_KEY, next ? '1' : '0');
    } catch {}
  };
  return (
    <>
      {flakes.length > 0 && (
        <div className={`fx-fall fx-fall-${fall}`} aria-hidden="true">
          {flakes.map((f) => (
            <span
              key={f.i}
              style={{ left: `${f.left}%`, fontSize: `${f.size}px`, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, '--drift': `${f.drift}px`, '--spin': `${f.spin}deg` }}
            >
              {drop}
            </span>
          ))}
        </div>
      )}
      <button type="button" className="fx-toggle" onClick={toggle} title={off ? 'Turn on this page’s effects' : 'Turn off this page’s effects'}>
        {off ? '✨ Effects off' : '✨ Effects on'}
      </button>
    </>
  );
}
