'use client';

import { useEffect, useRef, useState } from 'react';
import { SUPER_TIERS, tierFor } from '@/lib/supers';

/** Live chat under a stream. `chats` comes from the page's check-in; sending goes straight to the server. */
export default function LiveChatBox({ streamId, chats, onSent, disabled, coins: startCoins, canSuper = false }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [tier, setTier] = useState(0);
  const [coins, setCoins] = useState(startCoins ?? 0);
  const [, tick] = useState(0);
  // Re-check every few seconds so pinned Super Chats drop off when their time is up.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);
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
    const r = await fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat', id: streamId, body, super: tier || undefined }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(d.error || 'Not sent');
      setText(body);
    } else {
      onSent?.(d.chat);
      if (typeof d.coins === 'number') setCoins(d.coins);
      setTier(0);
    }
  }

  // The newest Super Chat that's still within its pinned time shows above the chat.
  const now = Date.now();
  const pinned = [...chats].reverse().find((c) => {
    const t = c.superCoins ? tierFor(c.superCoins) : null;
    return t && now - new Date(c.at).getTime() < t.liveSecs * 1000;
  });
  const pt = pinned ? tierFor(pinned.superCoins) : null;
  const chosen = SUPER_TIERS.find((x) => x.tier === tier);

  return (
    <div className="live-chat">
      {pinned && (
        <div className="live-super-pin" style={{ background: pt.color }}>
          <img src={pinned.user.pic} alt="" width={26} height={26} />
          <span><b>{pt.emoji} {pinned.user.name}</b> · 🪙 {pinned.superCoins}<br />{pinned.body}</span>
        </div>
      )}
      <div className="live-chat-list" ref={list}>
        {chats.length === 0 && <div className="small muted live-chat-empty">Say hi in the chat 👋</div>}
        {chats.map((c) => (
          <div key={c.id} className={`live-chat-msg${c.superCoins ? ' is-super' : ''}`} style={c.superCoins ? { '--super': tierFor(c.superCoins)?.color } : undefined}>
            <img src={c.user.pic} alt="" width={22} height={22} />
            <span>{c.superCoins > 0 && <b className="super-tag">{tierFor(c.superCoins)?.emoji} 🪙{c.superCoins}</b>} <a href={`/${c.user.username}`} target="_blank" rel="noopener"><b>{c.user.name}</b></a> {c.body}</span>
          </div>
        ))}
      </div>
      <form className="live-chat-form" onSubmit={send}>
        <input type="text" value={text} maxLength={200} placeholder={disabled ? 'Chat is closed' : 'Say something…'} disabled={disabled} onChange={(e) => setText(e.target.value)} aria-label="Chat message" />
        <button type="submit" className="btn small-btn" disabled={disabled || !text.trim()} style={chosen ? { background: chosen.color, color: '#fff' } : undefined}>
          {chosen ? `${chosen.emoji} Send` : 'Send'}
        </button>
      </form>
      {canSuper && !disabled && (
        <div className="live-super-row">
          <span className="small muted">Super Chat (pinned on top):</span>
          {SUPER_TIERS.map((x) => (
            <button
              key={x.tier}
              type="button"
              className={`super-chip${tier === x.tier ? ' on' : ''}`}
              style={{ borderColor: x.color, ...(tier === x.tier ? { background: x.color } : {}) }}
              disabled={coins < x.coins}
              onClick={() => setTier(tier === x.tier ? 0 : x.tier)}
              title={`${x.name}: pinned ${x.liveSecs / 60} min`}
            >
              {x.emoji} {x.coins}
            </button>
          ))}
          <span className="small muted">🪙 {coins}</span>
          {coins < SUPER_TIERS[0].coins && <a href="/coins" className="small">Get coins</a>}
        </div>
      )}
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
