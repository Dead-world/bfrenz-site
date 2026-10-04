'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';
import AlertBadge from '@/components/AlertBadge';

const badge = (n) => (n > 0 ? <i className="bnav-badge">{n > 9 ? '9+' : n}</i> : null);

/**
 * Phone tab bar, pinned to the bottom like Facebook's: Feed, Frenz, Chat (the IM buddy list),
 * Alerts (the 🔔 notifications list) and Menu (the full menu panel). Only shows on phone-sized screens, for members.
 */
export default function BottomNav({ username, pending = 0, alerts = 0, mail = 0 }) {
  const pathname = usePathname() || '/';
  const [mounted, setMounted] = useState(false);
  const [im, setIm] = useState({ unread: 0, open: false });

  useEffect(() => {
    setMounted(true);
    if (window.__bfrenzIm) setIm(window.__bfrenzIm);
    const onIm = (e) => setIm(e.detail);
    window.addEventListener('bfrenz-im-state', onIm);
    return () => window.removeEventListener('bfrenz-im-state', onIm);
  }, []);

  if (!mounted) return null;
  const here = (href) => pathname === href || pathname.startsWith(href + '/');
  const frenzHref = pending > 0 ? '/requests' : `/${username}/friends`;

  return createPortal(
    <nav className="bnav" aria-label="Main">
      <Link href="/home" className={`bnav-tab${pathname === '/home' ? ' on' : ''}`}>
        <span className="bnav-ico"><Icon name="feed" size={23} /></span>
        <span>Feed</span>
      </Link>
      <Link href={frenzHref} className={`bnav-tab${here(`/${username}/friends`) || here('/requests') ? ' on' : ''}`}>
        <span className="bnav-ico"><Icon name="users" size={23} />{badge(pending)}</span>
        <span>Frenz</span>
      </Link>
      <button type="button" className={`bnav-tab${im.open ? ' on' : ''}`} onClick={() => window.dispatchEvent(new Event('bfrenz-im-toggle'))} aria-expanded={im.open}>
        <span className="bnav-ico"><Icon name="chat" size={23} />{badge(im.unread)}</span>
        <span>Chat</span>
      </button>
      <Link href="/notifications" className={`bnav-tab${here('/notifications') || here('/mentions') ? ' on' : ''}`}>
        <span className="bnav-ico"><Icon name="bell" size={23} /><AlertBadge initial={alerts} className="bnav-badge" /></span>
        <span>Alerts</span>
      </Link>
      <button type="button" className="bnav-tab" onClick={() => window.dispatchEvent(new Event('bfrenz-menu'))}>
        <span className="bnav-ico"><Icon name="menu" size={23} />{badge(mail)}</span>
        <span>Menu</span>
      </button>
    </nav>,
    document.body,
  );
}
