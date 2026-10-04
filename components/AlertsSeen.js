'use client';

import { useEffect } from 'react';

/** On the notifications page: clears the 🔔 badges right away. */
export default function AlertsSeen() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bfrenz-alerts', { detail: { unseen: 0 } }));
  }, []);
  return null;
}
