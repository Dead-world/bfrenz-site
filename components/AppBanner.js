'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const KEY = 'bfrenz.appBannerHidden';

/** A small "Get the app" bar on phones. Hidden once installed, inside the app, or after ✕ (for 30 days). */
export default function AppBanner() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const phone = window.matchMedia('(max-width: 860px)').matches;
    let hiddenUntil = 0;
    try {
      hiddenUntil = Number(localStorage.getItem(KEY) || 0);
    } catch {}
    setShow(phone && !standalone && Date.now() > hiddenUntil);
  }, []);

  if (!show || pathname === '/app') return null;

  function hide() {
    try {
      localStorage.setItem(KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    } catch {}
    setShow(false);
  }

  return (
    <div className="app-banner" role="region" aria-label="Get the app">
      <img src="/icons/icon-192.png" alt="" width={40} height={40} />
      <div className="app-banner-text">
        <b>BFRENZ app</b>
        <span>Faster, full screen, right on your home screen</span>
      </div>
      <Link href="/app" className="btn small-btn">Get it</Link>
      <button type="button" className="app-banner-x" aria-label="Hide" onClick={hide}>✕</button>
    </div>
  );
}
