'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Phone menu: a ☰ button that opens a full list of links. Hidden on computers.
 * The panel is drawn at the page level (a portal) so the sticky header can't clip it.
 */
export default function MobileMenu({ links, alerts = 0 }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close after moving to another page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close with the Escape key, and stop the page scrolling behind the menu.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="mobile-menu">
      <button
        type="button"
        className={`burger${open ? ' open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
        {alerts > 0 && !open && <i className="burger-dot">{alerts > 9 ? '9+' : alerts}</i>}
      </button>
      {open &&
        createPortal(
        <>
          <div className="menu-scrim" onClick={() => setOpen(false)} />
          <nav className="menu-panel" aria-label="Menu">
            <div className="menu-head">
              <b>Menu</b>
              <button type="button" className="menu-close" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
            </div>
            {links.map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                className={`${l.alert ? 'alert' : ''}${pathname === l.href ? ' here' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className="menu-ico">{l.icon}</span>
                <span className="menu-label">{l.label}</span>
                {l.count > 0 && <span className="menu-count">{l.count}</span>}
              </Link>
            ))}
          </nav>
        </>,
        document.body,
      )}
    </div>
  );
}
