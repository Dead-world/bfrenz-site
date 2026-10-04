'use client';

import { useEffect, useState, useTransition } from 'react';
import { react } from '@/app/actions/reactions';

/** A small 👍 Like for a comment or reply. Updates right away. */
export default function CommentLike({ k, rx }) {
  const [s, setS] = useState({ up: rx?.up || 0, mine: rx?.mine || 0 });
  const [, start] = useTransition();
  const fresh = `${rx?.up || 0}:${rx?.mine || 0}`;
  useEffect(() => setS({ up: rx?.up || 0, mine: rx?.mine || 0 }), [fresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const liked = s.mine === 1;
  function press() {
    const before = s;
    setS({ up: s.up + (liked ? -1 : 1), mine: liked ? 0 : 1 });
    start(async () => {
      try {
        const r = await react(k, 1);
        setS(r ? { up: r.up, mine: r.mine } : before);
      } catch {
        setS(before);
      }
    });
  }
  return (
    <button type="button" className={`linkbtn small comment-like${liked ? ' on' : ''}`} onClick={press} aria-pressed={liked} title={liked ? 'Take back your like' : 'Like this comment'}>
      👍 {liked ? 'Liked' : 'Like'}{s.up > 0 ? ` · ${s.up}` : ''}
    </button>
  );
}
