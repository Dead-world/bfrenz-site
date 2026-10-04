'use client';

import { useEffect, useState } from 'react';
import { editPost } from '@/app/actions/posts';
import { MOODS } from '@/lib/moods';
import MentionInput from '@/components/MentionInput';

/** The "Edit" link in your post's header. Opens the editor below it. */
export function EditPostButton({ id }) {
  return (
    <button type="button" className="linkbtn small muted post-edit-btn" onClick={() => window.dispatchEvent(new CustomEvent('bfrenz-edit-post', { detail: id }))}>
      Edit
    </button>
  );
}

/** The editor that takes the place of the post's text while you edit. */
export default function EditPost({ post, back, canPublic = false }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(post.body || '');

  useEffect(() => {
    const on = (e) => {
      if (e.detail !== post.id) return;
      setBody(post.body || '');
      setOpen((o) => !o);
    };
    window.addEventListener('bfrenz-edit-post', on);
    return () => window.removeEventListener('bfrenz-edit-post', on);
  }, [post.id, post.body]);

  if (!open) return null;
  const hasVideo = !!(post.videoUrl || post.youtubeId);
  return (
    <form action={editPost} className="post-edit-form">
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="back" value={back} />
      <MentionInput
        as="textarea"
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={Math.min(10, Math.max(3, body.split('\n').length + 1))}
        placeholder="What's on your mind? (@ to tag, # for hashtags)"
        aria-label="Edit your post"
        autoFocus
      />
      {(post.imageUrls.length > 0 || hasVideo || post.songUrl) && (
        <div className="post-edit-media">
          <span className="small muted">Keep on this post (untick to remove):</span>
          <div className="post-edit-thumbs">
            {post.imageUrls.map((u) => (
              <label key={u} className="post-edit-thumb">
                <input type="checkbox" name="keepImage" value={u} defaultChecked />
                <img src={u} alt="" />
              </label>
            ))}
            {hasVideo && (
              <label className="post-edit-chip"><input type="checkbox" name="keepVideo" value="1" defaultChecked /> 🎬 Video</label>
            )}
            {post.songUrl && (
              <label className="post-edit-chip"><input type="checkbox" name="keepSong" value="1" defaultChecked /> 🎵 Song</label>
            )}
          </div>
        </div>
      )}
      <div className="post-edit-row">
        <select name="mood" defaultValue={post.mood || ''} aria-label="Mood">
          <option value="">No mood</option>
          {MOODS.map(([e, m]) => <option key={m} value={m}>{e} {m}</option>)}
        </select>
        {canPublic && (
          <select name="visibility" defaultValue={post.visibility} aria-label="Who can see this">
            <option value="frenz">👥 Frenz</option>
            <option value="public">🌍 Public</option>
          </select>
        )}
        <span className="post-edit-btns">
          <button type="button" className="btn ghost small-btn" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className="btn small-btn">Save</button>
        </span>
      </div>
    </form>
  );
}
