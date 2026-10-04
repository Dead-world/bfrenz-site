'use client';

import { useState } from 'react';
import { saveDesign } from '@/app/actions/cosmetics';
import { CORNERS, FONTS, PRESETS } from '@/lib/design';

// '' = keep the theme's own color. Nothing changes until you pick something.
const START = { bg: '', bg2: '#2a1206', useBg2: false, box: '', boxAlpha: 90, text: '', accent: '', border: '', font: '', corners: '' };
// What the preview shows for "keep theme" (the site's normal look).
const SHOWN = { bg: '#0b0b0c', box: '#16161a', text: '#f2f2f2', accent: '#ff7a1a', border: '#2c2c31' };
const FONT_CSS = {
  arial: 'Arial, sans-serif', verdana: 'Verdana, sans-serif', georgia: 'Georgia, serif', times: '"Times New Roman", serif',
  courier: '"Courier New", monospace', comic: '"Comic Sans MS", "Comic Neue", cursive', impact: 'Impact, "Arial Black", sans-serif', trebuchet: '"Trebuchet MS", sans-serif',
};
const RAD = { square: 0, round: 14, bubbly: 28 };

function rgba(h, a) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Pick colors, a font and corners for your profile, with a live preview. */
export default function DesignPanel({ saved, name, pic }) {
  const [d, setD] = useState(() => (saved ? { ...START, ...saved, useBg2: !!saved.bg2, bg2: saved.bg2 || START.bg2 } : START));
  const v = (k) => d[k] || SHOWN[k]; // the color to show for a field
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const radius = RAD[d.corners] ?? 14;
  const pageBg = !d.bg
    ? 'repeating-linear-gradient(45deg, #1b1b20 0 10px, #141418 10px 20px)'
    : d.useBg2 ? `linear-gradient(160deg, ${d.bg}, ${d.bg2})` : d.bg;
  const font = FONT_CSS[d.font] || 'inherit';

  // A color that can be left as the theme's: the hidden field carries '' until a color is picked.
  const color = (k, label) => (
    <div className={`dp-color${d[k] ? '' : ' keep'}`}>
      <input type="hidden" name={k} value={d[k]} />
      <label className="dp-swatch">
        <input type="color" value={v(k)} onChange={(e) => setD((x) => ({ ...x, [k]: e.target.value }))} aria-label={label} />
        {!d[k] && <span className="dp-keep-tag">Theme</span>}
      </label>
      <span>{label}</span>
      {d[k] ? (
        <button type="button" className="linkbtn small dp-keep" onClick={() => setD((x) => ({ ...x, [k]: '', ...(k === 'bg' ? { useBg2: false } : {}) }))}>↺ Keep theme</button>
      ) : (
        <span className="small muted dp-keep-note">tap to change</span>
      )}
    </div>
  );

  return (
    <div className="dp">
      <div className="dp-presets">
        <span className="small muted">Start from:</span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="dp-preset"
            style={{ background: p.bg2 ? `linear-gradient(135deg, ${p.bg}, ${p.bg2})` : p.bg, color: p.text, borderColor: p.accent }}
            onClick={() => setD((x) => ({ ...x, ...p, useBg2: !!p.bg2, bg2: p.bg2 || x.bg2 }))}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="dp-grid">
        <form action={saveDesign} className="dp-controls">
          <div className="dp-colors">
            {color('bg', 'Background')}
            {color('box', 'Boxes')}
            {color('text', 'Text')}
            {color('accent', 'Links & titles')}
            {color('border', 'Borders')}
            <div className={`dp-color${d.bg && d.useBg2 ? '' : ' keep'}`}>
              <label className="dp-swatch">
                <input type="color" name="bg2" value={d.bg2} onChange={set('bg2')} disabled={!d.bg || !d.useBg2} aria-label="Fade to" />
              </label>
              <span>
                <input type="checkbox" name="useBg2" checked={d.useBg2} onChange={set('useBg2')} disabled={!d.bg} /> Fade to
              </span>
              <span className="small muted dp-keep-note">{d.bg ? 'second color' : 'pick a background first'}</span>
            </div>
          </div>
          <label className="dp-row">
            <span>Box see-through</span>
            <input type="range" name="boxAlpha" min="20" max="100" value={d.boxAlpha} onChange={set('boxAlpha')} />
            <span className="small muted">{100 - d.boxAlpha}%</span>
          </label>
          <label className="dp-row">
            <span>Font</span>
            <select name="font" value={d.font} onChange={set('font')}>
              {FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="dp-row">
            <span>Corners</span>
            <select name="corners" value={d.corners} onChange={set('corners')}>
              {CORNERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <div className="dp-btns">
            <button type="submit" className="btn">Save design</button>
            <button type="submit" name="reset" value="1" className="btn ghost small-btn" onClick={() => setD(START)}>Reset to my theme</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Anything left on <b>Theme</b> stays exactly as your theme has it (backgrounds, falling money, animations and all).
            Your own CSS (in Customize) still wins over everything.
          </p>
        </form>

        <div className="dp-preview" style={{ background: pageBg, fontFamily: font }} aria-label="Preview">
          <div className="dp-name" style={{ color: v('text') }}>{name}</div>
          <div className="dp-box" style={{ background: rgba(v('box'), d.boxAlpha / 100), borderColor: v('border'), borderRadius: radius }}>
            <div className="dp-box-h" style={{ color: v('accent'), borderBottomColor: v('border') }}>
              <i style={{ background: v('accent') }} /> About me
            </div>
            <div className="dp-box-b" style={{ color: v('text') }}>
              <img src={pic} alt="" width={54} height={54} style={{ borderRadius: Math.min(radius, 27) }} />
              <span>
                hey it&apos;s me 👋 welcome to my page! check out my <u style={{ color: v('accent') }}>top 8</u> and leave a comment.
              </span>
            </div>
          </div>
          <div className="dp-box" style={{ background: rgba(v('box'), d.boxAlpha / 100), borderColor: v('border'), borderRadius: radius }}>
            <div className="dp-box-h" style={{ color: v('accent'), borderBottomColor: v('border') }}>
              <i style={{ background: v('accent') }} /> Comments
            </div>
            <div className="dp-box-b" style={{ color: v('text'), opacity: 0.85 }}>love the new look!! 🔥</div>
          </div>
        </div>
      </div>
    </div>
  );
}
