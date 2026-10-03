'use client';

import { useEffect, useRef, useState } from 'react';
import { addPostComment } from '@/app/actions/posts';
import MentionInput from '@/components/MentionInput';

/** "Reply" under a feed comment or reply: opens that thread's reply box, starting with @name. */
export function ReplyButton({ thread, target, username }) {
  return (
    <button
      type="button"
      className="linkbtn small reply-btn"
      onClick={() => window.dispatchEvent(new CustomEvent('bfrenz-reply', { detail: { thread, target, username } }))}
    >
      Reply
    </button>
  );
}

/** The reply box at the bottom of a comment thread. Hidden until someone presses Reply. */
export function ThreadReplyForm({ postId, thread, back, pic, myName }) {
  const [open, setOpen] = useState(null); // { target, username }
  const box = useRef(null);

  useEffect(() => {
    const onReply = (e) => {
      if (e.detail.thread !== thread) return;
      setOpen({ target: e.detail.target, username: e.detail.username, n: Date.now() });
    };
    window.addEventListener('bfrenz-reply', onReply);
    return () => window.removeEventListener('bfrenz-reply', onReply);
  }, [thread]);

  useEffect(() => {
    if (!open) return;
    const input = box.current?.querySelector('input[name="body"]');
    if (!input) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    box.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open]);

  if (!open) return null;
  return (
    <form action={addPostComment} className="feed-comment-form feed-reply-form" ref={box}>
      <input type="hidden" name="id" value={postId} />
      <input type="hidden" name="parentId" value={open.target} />
      <input type="hidden" name="back" value={back} />
      <img src={pic || '/no-pic.svg'} alt="" width={26} height={26} className="pic" />
      <MentionInput
        key={open.n}
        type="text"
        name="body"
        maxLength={1000}
        defaultValue={`@${open.username} `}
        placeholder={`Reply as ${myName}…`}
        aria-label={`Reply to @${open.username}`}
        required
      />
      <button type="submit" className="btn small-btn">Reply</button>
      <button type="button" className="linkbtn small muted" onClick={() => setOpen(null)} aria-label="Cancel reply">✕</button>
    </form>
  );
}
