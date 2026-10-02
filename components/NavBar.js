'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';

export function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

/** Computer menu: a few main tabs, and a "More" panel with everything else in groups. */
export default function NavBar({ primary, groups }) {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const moreActive = groups.some((g) => g.items.some((i) => isActive(pathname, i)));

  return (
    <nav className="mainnav" aria-label="Main">
      {primary.map((item) => (
        <Link key={item.href} href={item.href} className={`mainnav-tab${isActive(pathname, item) ? ' on' : ''}`}>
          <Icon name={item.icon} size={17} />
          <span>{item.label}</span>
        </Link>
      ))}
      <div className="mainnav-more" ref={ref}>
        <button
          type="button"
          className={`mainnav-tab${open || moreActive ? ' on' : ''}`}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="grid" size={17} />
          <span>More</span>
          <Icon name="chevron" size={14} className={`chev${open ? ' up' : ''}`} />
        </button>
        {open && (
          <div className="more-panel" role="menu">
            {groups.map((g) => (
              <div key={g.title} className="more-col">
                <div className="more-title">{g.title}</div>
                {g.items.map((item) => (
                  <Link key={item.href} href={item.href} className={`more-item${isActive(pathname, item) ? ' on' : ''}`} role="menuitem">
                    <span className="more-ico"><Icon name={item.icon} size={18} /></span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
