'use client';

import { useEffect, useRef, useState } from 'react';

/** Counts down, then presses the hidden button to carry on (used for Printful's per-minute limit). */
export default function AutoContinue({ seconds, action, label = 'Making more photos' }) {
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const form = useRef(null);
  useEffect(() => {
    if (paused) return undefined;
    if (left <= 0) {
      form.current?.requestSubmit();
      return undefined;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused]);
  return (
    <form action={action} ref={form} className="notice auto-continue">
      {paused ? (
        <>Paused. <button type="submit" className="linkbtn">Continue now</button></>
      ) : left > 0 ? (
        <>
          ⏳ Printful makes a few photos per minute. {label} in <b>{left}s</b>, so leave this page open.{' '}
          <button type="button" className="linkbtn small" onClick={() => setPaused(true)}>Stop</button>
        </>
      ) : (
        <>📸 {label}… (this can take up to a minute)</>
      )}
    </form>
  );
}
