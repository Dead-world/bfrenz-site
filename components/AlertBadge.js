'use client';

import { useEffect, useState } from 'react';

/** A red count bubble that stays in sync with live alerts. */
export default function AlertBadge({ initial = 0, className = 'top-badge' }) {
  const [n, setN] = useState(initial);
  useEffect(() => {
    if (typeof window.__bfrenzAlerts === 'number') setN(window.__bfrenzAlerts);
    const on = (e) => setN(e.detail?.unseen || 0);
    window.addEventListener('bfrenz-alerts', on);
    return () => window.removeEventListener('bfrenz-alerts', on);
  }, []);
  if (!n) return null;
  return <span className={className}>{n > 9 ? '9+' : n}</span>;
}
