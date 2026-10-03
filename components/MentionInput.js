'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOKEN = /(^|[^a-zA-Z0-9_@.])@([a-zA-Z0-9_]{0,20})$/;

/**
 * A text box (input or textarea) that suggests people when you type @.
 * Works controlled (value + onChange) or uncontrolled (defaultValue / nothing).
 */
export default function MentionInput({ as = 'input', value, onChange, className, ...rest }) {
  const ref = useRef(null);
  const [people, setPeople] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const query = useRef(null); // { start, q }
  const timer = useRef(null);
  const cache = useRef(new Map());

  useEffect(() => () => clearTimeout(timer.current), []);
  // The list floats over the page (so boxes with clipped edges can't cut it off) and closes on scroll.
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function check(el) {
    const caret = el.selectionStart ?? el.value.length;
    const m = el.value.slice(0, caret).match(TOKEN);
    if (!m) {
      query.current = null;
      setOpen(false);
      return;
    }
    const q = m[2].toLowerCase();
    query.current = { start: caret - m[2].length - 1, end: caret, q };
    clearTimeout(timer.current);
    const show = (list) => {
      if (query.current?.q !== q) return;
      setPeople(list);
      setActive(0);
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom > 260 || r.top < 260;
      setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 328)), top: below ? r.bottom + 4 : null, bottom: below ? null : window.innerHeight - r.top + 4 });
      setOpen(list.length > 0);
    };
    if (cache.current.has(q)) return show(cache.current.get(q));
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mention-search?q=${encodeURIComponent(q)}`);
        const data = res.ok ? await res.json() : { people: [] };
        cache.current.set(q, data.people || []);
        show(data.people || []);
      } catch {
        setOpen(false);
      }
    }, 150);
  }

  function pick(p) {
    const el = ref.current;
    const k = query.current;
    if (!el || !k || !p) return;
    const before = el.value.slice(0, k.start);
    const after = el.value.slice(k.end);
    const insert = `@${p.username} `;
    const next = before + insert + after.replace(/^ /, '');
    const caret = before.length + insert.length;
    if (onChange) {
      onChange({ target: { value: next, name: el.name } });
    } else {
      el.value = next;
    }
    setOpen(false);
    query.current = null;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  function onKeyDown(e) {
    if (open && people.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % people.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + people.length) % people.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(people[active]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    }
    rest.onKeyDown?.(e);
  }

  const Tag = as;
  const props = {
    ...rest,
    ref,
    className,
    onKeyDown,
    onChange: (e) => { onChange?.(e); check(e.target); },
    onClick: (e) => check(e.target),
    onBlur: (e) => { setTimeout(() => setOpen(false), 150); rest.onBlur?.(e); },
    autoComplete: 'off',
    ...(value !== undefined ? { value } : {}),
  };

  return (
    <span className={`mention-wrap ${as === 'textarea' ? 'mw-block' : 'mw-inline'}`}>
      <Tag {...props} />
      {open && pos && createPortal(
        <span className="mention-pop" role="listbox" style={{ position: 'fixed', left: pos.left, top: pos.top ?? 'auto', bottom: pos.bottom ?? 'auto' }}>
          {people.map((p, i) => (
            <button
              key={p.username}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`mention-opt${i === active ? ' on' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
            >
              <img src={p.avatarUrl || '/no-pic.svg'} alt="" width={30} height={30} />
              <span>
                <b>{p.displayName}</b>
                <small>@{p.username}{p.fren ? ' · fren' : ''}</small>
              </span>
            </button>
          ))}
        </span>,
        document.body,
      )}
    </span>
  );
}
