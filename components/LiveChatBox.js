'use client';

import { useEffect, useRef, useState } from 'react';

/** Live chat under a stream. `chats` comes from the page's check-in; sending goes straight to the server. */
export default function LiveChatBox({ streamId, chats, onSent, disabled }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const list = useRef(null);
  useEffect(() => {
    const el = list.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
  }, [chats.length]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    setErr('');
    const r = await fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat', id: streamId, body }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setErr(d.error || 'Not sent');
    else onSent?.(d.chat);
  }

  return (
    <div className="live-chat">
      <div className="live-chat-list" ref={list}>
        {chats.length === 0 && <div className="small muted live-chat-empty">Say hi in the chat 👋</div>}
        {chats.map((c) => (
          <div key={c.id} className="live-chat-msg">
            <img src={c.user.pic} alt="" width={22} height={22} />
            <span><a href={`/${c.user.username}`} target="_blank" rel="noopener"><b>{c.user.name}</b></a> {c.body}</span>
          </div>
        ))}
      </div>
      <form className="live-chat-form" onSubmit={send}>
        <input type="text" value={text} maxLength={200} placeholder={disabled ? 'Chat is closed' : 'Say something…'} disabled={disabled} onChange={(e) => setText(e.target.value)} aria-label="Chat message" />
        <button type="submit" className="btn small-btn" disabled={disabled || !text.trim()}>Send</button>
      </form>
      {err && <div className="small live-chat-err">{err}</div>}
    </div>
  );
}

/** Merges new chat lines into the list (no duplicates, newest 150 kept). */
export function mergeChats(list, more) {
  if (!more?.length) return list;
  const seen = new Set(list.map((c) => c.id));
  return [...list, ...more.filter((c) => !seen.has(c.id))].slice(-150);
}
