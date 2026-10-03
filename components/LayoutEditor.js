'use client';

import { useRef, useState } from 'react';
import { BOXES, DEFAULT_LAYOUT, boxInfo, normalizeLayout } from '@/lib/profileLayout';
import { saveLayout } from '@/app/actions/layout';

const COLS = [
  ['left', 'Left column', 'narrow'],
  ['right', 'Right column', 'wide'],
];

/**
 * Drag boxes to reorder them or move them to the other column (computer), or use the arrow
 * buttons (phones). The eye hides a box. Nothing changes on the page until you press Save.
 */
export default function LayoutEditor({ initial, username }) {
  const [layout, setLayout] = useState(() => normalizeLayout(initial));
  const [drag, setDrag] = useState(null); // id being dragged
  const [over, setOver] = useState(null); // { col, index }
  const saved = useRef(JSON.stringify(normalizeLayout(initial)));
  const dirty = JSON.stringify(layout) !== saved.current;
  const hidden = new Set(layout.hidden);

  function move(id, col, index) {
    setLayout((l) => {
      const next = { left: l.left.filter((x) => x !== id), right: l.right.filter((x) => x !== id), hidden: l.hidden };
      const fromCol = l.left.includes(id) ? 'left' : 'right';
      let at = index;
      // Moving down within the same column: removing the box first shifts the spot up by one.
      if (fromCol === col && l[col].indexOf(id) < index) at -= 1;
      next[col].splice(Math.max(0, Math.min(at, next[col].length)), 0, id);
      return next;
    });
  }

  function nudge(id, dir) {
    const col = layout.left.includes(id) ? 'left' : 'right';
    const i = layout[col].indexOf(id);
    if (dir === 'up' && i > 0) move(id, col, i - 1);
    if (dir === 'down' && i < layout[col].length - 1) move(id, col, i + 2);
    if (dir === 'other') move(id, col === 'left' ? 'right' : 'left', 0);
  }

  function toggleHidden(id) {
    if (boxInfo(id)?.lock) return;
    setLayout((l) => ({ ...l, hidden: l.hidden.includes(id) ? l.hidden.filter((x) => x !== id) : [...l.hidden, id] }));
  }

  // Dragging works with a mouse, a finger or a pen (pointer events, not the browser's
  // drag-and-drop, which phones don't support). On touch screens you drag by the ⋮⋮ handle
  // so the rest of the box still scrolls the page.
  const colRefs = { left: useRef(null), right: useRef(null) };
  const dragRef = useRef(null);
  const [ghost, setGhost] = useState(null); // { x, y, id }

  function dropSpot(x, y) {
    for (const col of ['left', 'right']) {
      const el = colRefs[col].current;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x < r.left - 30 || x > r.right + 30 || y < r.top - 40 || y > r.bottom + 40) continue;
      const items = [...el.querySelectorAll('[data-box]')].filter((n) => n.dataset.box !== dragRef.current?.id);
      let index = items.length;
      for (let i = 0; i < items.length; i++) {
        const ir = items[i].getBoundingClientRect();
        if (y < ir.top + ir.height / 2) { index = i; break; }
      }
      // index counts boxes without the dragged one; convert to an index in the real list
      const before = items[index]?.dataset.box;
      const real = before ? layout[col].indexOf(before) : layout[col].length;
      return { col, index: real };
    }
    return null;
  }

  function startDrag(e, id) {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button')) return;
    const fromHandle = !!e.target.closest('.layout-grip');
    if (e.pointerType !== 'mouse' && !fromHandle) return; // touch: only the handle drags
    e.preventDefault();
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, live: e.pointerType !== 'mouse' };
    if (dragRef.current.live) { setDrag(id); setGhost({ x: e.clientX, y: e.clientY, id }); }
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.live && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 5) return;
      if (!d.live) { d.live = true; setDrag(d.id); }
      ev.preventDefault();
      setGhost({ x: ev.clientX, y: ev.clientY, id: d.id });
      setOver(dropSpot(ev.clientX, ev.clientY));
      // scroll the page when dragging near the top or bottom edge
      if (ev.clientY < 60) window.scrollBy(0, -12);
      else if (ev.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const d = dragRef.current;
      dragRef.current = null;
      if (d?.live && ev.type === 'pointerup') {
        const spot = dropSpot(ev.clientX, ev.clientY);
        if (spot) move(d.id, spot.col, spot.index);
      }
      setDrag(null);
      setOver(null);
      setGhost(null);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  return (
    <div className="layout-editor">
      <div className="layout-cols">
        {COLS.map(([col, title, width]) => (
          <div key={col} ref={colRefs[col]} className={`layout-col ${width}${over?.col === col ? ' drop-target' : ''}`}>
            <div className="layout-col-h">{title} <span className="muted">({width})</span></div>
            {layout[col].map((id, i) => {
              const b = boxInfo(id);
              const isHidden = hidden.has(id);
              return (
                <div key={id}>
                  {over?.col === col && over.index === i && drag && drag !== id && <div className="layout-drop" />}
                  <div
                    data-box={id}
                    className={`layout-item${isHidden ? ' is-hidden' : ''}${drag === id ? ' dragging' : ''}`}
                    onPointerDown={(e) => startDrag(e, id)}
                  >
                    <span className="layout-grip" aria-hidden="true" title="Drag to move">⋮⋮</span>
                    <span className="layout-emoji">{b.emoji}</span>
                    <span className="layout-label">
                      <b>{b.label}</b>
                      {(isHidden || b.note || b.lock) && (
                        <small>{isHidden ? 'Hidden from your page' : b.lock ? `${b.note ? b.note + ' · ' : ''}always shown` : b.note}</small>
                      )}
                    </span>
                    <span className="layout-btns">
                      <button type="button" title="Move up" aria-label={`Move ${b.label} up`} disabled={i === 0} onClick={() => nudge(id, 'up')}>↑</button>
                      <button type="button" title="Move down" aria-label={`Move ${b.label} down`} disabled={i === layout[col].length - 1} onClick={() => nudge(id, 'down')}>↓</button>
                      <button type="button" title={col === 'left' ? 'Move to the right column' : 'Move to the left column'} aria-label={`Move ${b.label} to the ${col === 'left' ? 'right' : 'left'} column`} onClick={() => nudge(id, 'other')}>
                        {col === 'left' ? '→' : '←'}
                      </button>
                      <button
                        type="button"
                        className={`eye${isHidden ? ' off' : ''}`}
                        title={b.lock ? 'This box always shows' : isHidden ? 'Show this box' : 'Hide this box'}
                        aria-label={isHidden ? `Show ${b.label}` : `Hide ${b.label}`}
                        disabled={b.lock}
                        onClick={() => toggleHidden(id)}
                      >
                        {isHidden ? '🙈' : '👁'}
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}
            {over?.col === col && over.index === layout[col].length && drag && <div className="layout-drop" />}
            {layout[col].length === 0 && <div className="layout-empty small muted">Drag boxes here</div>}
          </div>
        ))}
      </div>

      {ghost && (
        <div className="layout-ghost" style={{ left: ghost.x, top: ghost.y }}>
          {boxInfo(ghost.id)?.emoji} {boxInfo(ghost.id)?.label}
        </div>
      )}

      <form action={saveLayout} className="layout-save">
        <input type="hidden" name="layout" value={JSON.stringify(layout)} />
        <button type="submit" className="btn" disabled={!dirty}>{dirty ? 'Save layout' : 'Saved'}</button>
        <button
          type="button"
          className="btn ghost small-btn"
          onClick={() => setLayout(normalizeLayout(DEFAULT_LAYOUT))}
          disabled={JSON.stringify(layout) === JSON.stringify(normalizeLayout(DEFAULT_LAYOUT))}
        >
          Reset to default
        </button>
        <a href={`/${username}`} className="small">View my page ↗</a>
        {dirty && <span className="small layout-dirty">Unsaved changes</span>}
      </form>
    </div>
  );
}
