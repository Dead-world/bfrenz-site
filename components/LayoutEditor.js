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

  function onDrop(e, col, index) {
    e.preventDefault();
    const id = drag || e.dataTransfer.getData('text/plain');
    if (id && BOXES.some((b) => b.id === id)) move(id, col, index);
    setDrag(null);
    setOver(null);
  }

  return (
    <div className="layout-editor">
      <div className="layout-cols">
        {COLS.map(([col, title, width]) => (
          <div
            key={col}
            className={`layout-col ${width}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!over || over.col !== col) setOver({ col, index: layout[col].length });
            }}
            onDrop={(e) => onDrop(e, col, over?.col === col ? over.index : layout[col].length)}
          >
            <div className="layout-col-h">{title} <span className="muted">({width})</span></div>
            {layout[col].map((id, i) => {
              const b = boxInfo(id);
              const isHidden = hidden.has(id);
              return (
                <div key={id}>
                  {over?.col === col && over.index === i && drag && drag !== id && <div className="layout-drop" />}
                  <div
                    className={`layout-item${isHidden ? ' is-hidden' : ''}${drag === id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      setDrag(id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', id);
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      const index = e.clientY < r.top + r.height / 2 ? i : i + 1;
                      if (!over || over.col !== col || over.index !== index) setOver({ col, index });
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      onDrop(e, col, over?.col === col ? over.index : i);
                    }}
                  >
                    <span className="layout-grip" aria-hidden="true">⋮⋮</span>
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
