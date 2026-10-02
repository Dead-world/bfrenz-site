'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';

/** Your picture in the top corner; opens your account menu. */
export default function AccountMenu({ me, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pathname = usePathname();

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

  return (
    <div className="acct" ref={ref}>
      <button type="button" className="acct-btn" aria-expanded={open} aria-haspopup="true" aria-label="Your account" onClick={() => setOpen((o) => !o)}>
        <img src={me.pic} alt="" width={34} height={34} />
        <Icon name="chevron" size={14} className={`chev${open ? ' up' : ''}`} />
      </button>
      {open && (
        <div className="acct-panel" role="menu">
          <Link href={`/${me.username}`} className="acct-head">
            <img src={me.pic} alt="" width={44} height={44} />
            <span>
              <b>{me.name}</b>
              <span className="small muted">bfrenz.com/{me.username}</span>
            </span>
          </Link>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="acct-item" role="menuitem">
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.count > 0 && <span className="menu-count">{item.count}</span>}
            </Link>
          ))}
          <form action="/logout" method="post">
            <button type="submit" className="acct-item acct-out" role="menuitem">
              <Icon name="logout" size={18} />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
