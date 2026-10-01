'use client';

import { useEffect } from 'react';

/** Registers the service worker (offline page + makes BFRENZ installable as an app). */
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
