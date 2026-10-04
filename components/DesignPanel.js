'use client';

import { useState } from 'react';
import { saveDesign } from '@/app/actions/cosmetics';
import { CORNERS, FONTS, PRESETS } from '@/lib/design';

const START = { bg: '#0b0b0c', bg2: '#2a1206', useBg2: false, box: '#16161a', boxAlpha: 90, text: '#f2f2f2', accent: '#ff7a1a', border: '#2c2c31', font: '', corners: '' };
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
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const radius = RAD[d.corners] ?? 14;
  const pageBg = d.useBg2 ? `linear-gradient(160deg, ${d.bg}, ${d.bg2})` : d.bg;
  const font = FONT_CSS[d.font] || 'inherit';

  const color = (k, label) => (
    <label className="dp-color">
      <input type="color" name={k} value={d[k]} onChange={set(k)} />
      <span>{label}</span>
    </label>
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
            <label className="dp-color">
              <input type="color" name="bg2" value={d.bg2} onChange={set('bg2')} disabled={!d.useBg2} />
              <span>
                <input type="checkbox" name="useBg2" checked={d.useBg2} onChange={set('useBg2')} /> Fade to
              </span>
            </label>
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
            These colors go on top of your theme. Your own CSS (in Customize) still wins over everything.
          </p>
        </form>

        <div className="dp-preview" style={{ background: pageBg, fontFamily: font }} aria-label="Preview">
          <div className="dp-name" style={{ color: d.text }}>{name}</div>
          <div className="dp-box" style={{ background: rgba(d.box, d.boxAlpha / 100), borderColor: d.border, borderRadius: radius }}>
            <div className="dp-box-h" style={{ color: d.accent, borderBottomColor: d.border }}>
              <i style={{ background: d.accent }} /> About me
            </div>
            <div className="dp-box-b" style={{ color: d.text }}>
              <img src={pic} alt="" width={54} height={54} style={{ borderRadius: Math.min(radius, 27) }} />
              <span>
                hey it&apos;s me 👋 welcome to my page! check out my <u style={{ color: d.accent }}>top 8</u> and leave a comment.
              </span>
            </div>
          </div>
          <div className="dp-box" style={{ background: rgba(d.box, d.boxAlpha / 100), borderColor: d.border, borderRadius: radius }}>
            <div className="dp-box-h" style={{ color: d.accent, borderBottomColor: d.border }}>
              <i style={{ background: d.accent }} /> Comments
            </div>
            <div className="dp-box-b" style={{ color: d.text, opacity: 0.85 }}>love the new look!! 🔥</div>
          </div>
        </div>
      </div>
    </div>
  );
}
