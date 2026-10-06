'use client';

import { useEffect } from 'react';

/** Keeps --site-header-h equal to the sticky header's height, so other sticky bars sit right under it. */
export default function HeaderHeight() {
  useEffect(() => {
    const h = document.querySelector('header.site-header');
    if (!h) return undefined;
    const set = () => document.documentElement.style.setProperty('--site-header-h', `${Math.round(h.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(h);
    return () => ro.disconnect();
  }, []);
  return null;
}
