'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A comment box with a toolbar: ✨ glitter text, 🖼️ comment graphics and 💖 stickers.
 * They're added as plain HTML into the box, so they work anywhere HTML comments do.
 */
export const GLITTER_STYLES = [
  ['pink', 'Pink'], ['gold', 'Gold'], ['rainbow', 'Rainbow'], ['ice', 'Ice'],
  ['fire', 'Fire'], ['toxic', 'Toxic'], ['purple', 'Purple'], ['orange', 'BFRENZ'],
];

export const GRAPHICS = [
  ['thanks-for-the-add', 'Thanks for the add'],
  ['thanks-for-the-comment', 'Thanks for the comment'],
  ['hiii', 'Hiii'],
  ['love-your-page', 'Love your page'],
  ['miss-you', 'Miss you'],
  ['thinking-of-you', 'Thinking of you'],
  ['have-a-great-day', 'Have a great day'],
  ['good-morning', 'Good morning'],
  ['good-night', 'Good night'],
  ['great-weekend', 'Have a great weekend'],
  ['happy-birthday', 'Happy birthday'],
  ['you-rock', 'You rock'],
  ['bfrenz-4-life', 'BFRENZ 4 life'],
  ['happy-halloween', 'Happy Halloween'],
];

export const STICKERS = ['heart', 'star', 'crown', 'fire', 'music', 'smiley', 'ghost', 'pumpkin', 'peace', 'bolt', 'diamond', 'butterfly'];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default function RichTextarea({ id, name = 'body', rows = 3, maxLength = 5000, placeholder, defaultValue = '', required, autoFocus }) {
  const ref = useRef(null);
  const [panel, setPanel] = useState('');
  const [text, setText] = useState('');

  // Jump into the box with the cursor after any starting text (e.g. "@maya ") when asked to.
  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    const el = ref.current;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
    el.scrollIntoView({ block: 'center' });
  }, [autoFocus]);

  function insert(snippet) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const add = (before && !/\s$/.test(before) ? ' ' : '') + snippet + ' ';
    const next = before + add + el.value.slice(end);
    if (next.length > maxLength) return;
    // Set the value the way React expects, so the form sends it.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const pos = before.length + add.length;
    el.focus();
    el.setSelectionRange(pos, pos);
    setPanel('');
    setText('');
  }

  function openGlitter() {
    const el = ref.current;
    const sel = el ? el.value.slice(el.selectionStart, el.selectionEnd).trim() : '';
    if (sel) setText(sel.slice(0, 80));
    setPanel(panel === 'glitter' ? '' : 'glitter');
  }

  const toggle = (p) => setPanel(panel === p ? '' : p);

  return (
    <div className="rich-textarea">
      <textarea
        ref={ref}
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        autoFocus={autoFocus}
      />
      <div className="rich-tools">
        <button type="button" className={`rich-tool${panel === 'glitter' ? ' on' : ''}`} onClick={openGlitter}>✨ Glitter text</button>
        <button type="button" className={`rich-tool${panel === 'graphics' ? ' on' : ''}`} onClick={() => toggle('graphics')}>🖼️ Graphics</button>
        <button type="button" className={`rich-tool${panel === 'stickers' ? ' on' : ''}`} onClick={() => toggle('stickers')}>💖 Stickers</button>
      </div>

      {panel === 'glitter' && (
        <div className="rich-panel">
          <input type="text" value={text} maxLength={80} placeholder="Type your glitter text…" onChange={(e) => setText(e.target.value)} aria-label="Glitter text" autoFocus />
          <div className="rich-styles">
            {GLITTER_STYLES.map(([k, label]) => (
              <button
                key={k}
                type="button"
                className="rich-style"
                disabled={!text.trim()}
                onClick={() => insert(`<span class="glitter g-${k}">${esc(text.trim())}</span>`)}
                title={`Add ${label} glitter text`}
              >
                <span className={`glitter g-${k}`}>{text.trim() || label}</span>
              </button>
            ))}
          </div>
          <div className="small muted rich-note">Pick a style to add it.</div>
        </div>
      )}

      {panel === 'graphics' && (
        <div className="rich-panel">
          <div className="rich-grid">
            {GRAPHICS.map(([slug, alt]) => (
              <button key={slug} type="button" onClick={() => insert(`<img src="/graphics/${slug}.svg" alt="${alt}">`)} title={alt}>
                <img src={`/graphics/${slug}.svg`} alt={alt} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === 'stickers' && (
        <div className="rich-panel">
          <div className="rich-grid stickers">
            {STICKERS.map((s) => (
              <button key={s} type="button" onClick={() => insert(`<img src="/graphics/sticker-${s}.svg" alt="${s}" width="60">`)} title={s}>
                <img src={`/graphics/sticker-${s}.svg`} alt={s} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
      {panel && <div className="small muted rich-note">It looks like code in the box, but shows as the real thing once you post.</div>}
    </div>
  );
}
