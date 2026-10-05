'use client';

import { useState } from 'react';
import { SUPER_TIERS } from '@/lib/supers';

/**
 * ⭐ next to a comment box: pick a Super tier to highlight and pin your comment (costs coins).
 * Adds a hidden "super" field to the form it's in.
 */
export default function SuperPick({ coins = 0, live = false }) {
  const [tier, setTier] = useState(0);
  const [open, setOpen] = useState(false);
  const t = SUPER_TIERS.find((x) => x.tier === tier);
  return (
    <span className="super-pick">
      <input type="hidden" name="super" value={tier || ''} />
      <button
        type="button"
        className={`super-toggle${t ? ' on' : ''}`}
        style={t ? { background: t.color } : undefined}
        onClick={() => setOpen((o) => !o)}
        title="Super Comment: highlight and pin it"
        aria-expanded={open}
      >
        {t ? `${t.emoji} ${t.coins}` : '⭐'}
      </button>
      {open && (
        <span className="super-menu" role="menu">
          <b className="small">{live ? 'Super Chat' : 'Super Comment'} · you have 🪙 {coins}</b>
          {SUPER_TIERS.map((x) => (
            <button
              key={x.tier}
              type="button"
              role="menuitem"
              className={`super-opt${tier === x.tier ? ' on' : ''}`}
              style={{ borderColor: x.color }}
              disabled={coins < x.coins}
              onClick={() => { setTier(x.tier); setOpen(false); }}
            >
              <span>{x.emoji} {x.name}</span>
              <small>{live ? `pinned ${x.liveSecs / 60} min` : `pinned ${x.hours}h`} · 🪙 {x.coins}</small>
            </button>
          ))}
          {tier > 0 && <button type="button" className="linkbtn small" onClick={() => { setTier(0); setOpen(false); }}>Normal comment</button>}
          {coins < SUPER_TIERS[0].coins && <a href="/coins" className="small">Get coins</a>}
        </span>
      )}
    </span>
  );
}
