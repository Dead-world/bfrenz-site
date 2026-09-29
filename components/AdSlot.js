'use client';

import { useEffect } from 'react';

/**
 * A Google AdSense box. Shows nothing unless both
 * NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-...) and NEXT_PUBLIC_ADSENSE_SLOT are set.
 * Never used on profile pages, and hidden for Supporters.
 */
export default function AdSlot() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

  useEffect(() => {
    if (!client || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [client, slot]);

  if (!client || !slot) return null;
  return (
    <div className="ad-slot">
      <div className="ad-label">Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
