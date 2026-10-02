'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';
import { isActive } from '@/components/NavBar';

/**
 * Phone menu: ☰ opens a panel with your profile, quick-tap tiles for the main pages,
 * then everything else in groups. Drawn at page level (a portal) so the sticky header can't clip it.
 */
export default function MobileMenu({ me, primary, groups, account = [], alerts = 0 }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '/';

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

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
            <div className="menu-scrim" onClick={close} />
            <nav className="menu-panel" aria-label="Menu">
              <div className="menu-head">
                {me ? (
                  <Link href={`/${me.username}`} className="menu-me" onClick={close}>
                    <img src={me.pic} alt="" width={46} height={46} />
                    <span>
                      <b>{me.name}</b>
                      <span className="small muted">View my profile</span>
                    </span>
                  </Link>
                ) : (
                  <b className="menu-title">Menu</b>
                )}
                <button type="button" className="menu-close" aria-label="Close menu" onClick={close}>✕</button>
              </div>

              {!me && (
                <div className="menu-join">
                  <Link href="/signup" className="btn" onClick={close}>Join free</Link>
                  <Link href="/login" className="btn ghost" onClick={close}>Log in</Link>
                </div>
              )}

              <div className="menu-tiles">
                {primary.map((item) => (
                  <Link key={item.href} href={item.href} className={`menu-tile${isActive(pathname, item) ? ' on' : ''}`} onClick={close}>
                    <Icon name={item.icon} size={22} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              {groups.map((g) => (
                <div key={g.title} className="menu-group">
                  <div className="menu-group-title">{g.title}</div>
                  {g.items.map((item) => (
                    <Link key={item.href} href={item.href} className={`menu-row${isActive(pathname, item) ? ' here' : ''}`} onClick={close}>
                      <Icon name={item.icon} size={19} />
                      <span className="menu-label">{item.label}</span>
                    </Link>
                  ))}
                </div>
              ))}

              {account.length > 0 && (
                <div className="menu-group">
                  <div className="menu-group-title">Account</div>
                  {account.map((item) => (
                    <Link key={item.href} href={item.href} className="menu-row" onClick={close}>
                      <Icon name={item.icon} size={19} />
                      <span className="menu-label">{item.label}</span>
                      {item.count > 0 && <span className="menu-count">{item.count}</span>}
                    </Link>
                  ))}
                  <form action="/logout" method="post">
                    <button type="submit" className="menu-row menu-out">
                      <Icon name="logout" size={19} />
                      <span className="menu-label">Sign out</span>
                    </button>
                  </form>
                </div>
              )}
            </nav>
          </>,
          document.body,
        )}
    </div>
  );
}
