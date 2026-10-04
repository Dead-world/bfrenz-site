'use client';

import { useEffect, useState } from 'react';
import { editComment } from '@/app/actions/commentEdit';
import MentionInput from '@/components/MentionInput';
import RichTextarea from '@/components/RichTextarea';

const EVT = 'bfrenz-edit-comment';

/** "Edit" under your own comment or reply. */
export function EditCommentButton({ kind, id }) {
  return (
    <button type="button" className="linkbtn small muted comment-edit-btn" onClick={() => window.dispatchEvent(new CustomEvent(EVT, { detail: `${kind}-${id}` }))}>
      Edit
    </button>
  );
}

/**
 * The editor that takes the comment's place while you edit it.
 * rich = the profile comment wall (glitter, graphics and stickers toolbar).
 */
export default function EditCommentForm({ kind, id, body, back, max = 1000, rich = false }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(body || '');
  const me = `${kind}-${id}`;

  useEffect(() => {
    const on = (e) => {
      if (e.detail !== me) return;
      setText(body || '');
      setOpen((o) => !o);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, [me, body]);

  if (!open) return null;
  return (
    <form action={editComment} className="comment-edit-form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      {rich ? (
        <RichTextarea rows={3} maxLength={max} defaultValue={body} autoFocus required />
      ) : (
        <MentionInput
          as="textarea"
          name="body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={max}
          rows={Math.min(8, Math.max(2, text.split('\n').length + 1))}
          aria-label="Edit your comment"
          autoFocus
          required
        />
      )}
      <span className="comment-edit-btns">
        <button type="button" className="btn ghost small-btn" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="btn small-btn">Save</button>
      </span>
    </form>
  );
}
