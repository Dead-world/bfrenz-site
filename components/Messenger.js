'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * BFRENZ IM: a buddy list docked in the bottom-right corner with pop-up chat
 * windows next to it. Vercel can't hold live connections open, so it checks
 * for new messages every few seconds (more often while a chat is open).
 */
const LIST_POLL = 12000; // buddy list + unread counts
const CHAT_POLL = 3000; // open chat windows
const HIDDEN_POLL = 45000; // when the tab is in the background
const MAX_WINDOWS = 3;

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** The classic two-note "new IM" chime, made in the browser (no sound file needed). */
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = chime.ctx || (chime.ctx = new Ctx());
    const t = ctx.currentTime;
    [
      [880, 0],
      [1320, 0.12],
    ].forEach(([freq, delay]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(0.18, t + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(t + delay);
      o.stop(t + delay + 0.25);
    });
  } catch {}
}

function timeLabel(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function Messenger({ me }) {
  const [ready, setReady] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [buddies, setBuddies] = useState([]);
  const [unread, setUnread] = useState(0);
  const [windows, setWindows] = useState([]); // [{ id, min }]
  const [threads, setThreads] = useState({}); // id -> [messages]
  const [muted, setMuted] = useState(false);
  const [query, setQuery] = useState('');
  const [showOffline, setShowOffline] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const prevUnread = useRef({});
  const lastAt = useRef({});
  const baseTitle = useRef('');

  // Restore layout after the first render (avoids hydration mismatches).
  useEffect(() => {
    setListOpen(load('im.listOpen', false));
    setWindows(load('im.windows', []));
    setMuted(load('im.muted', false));
    setShowOffline(load('im.showOffline', true));
    const mq = window.matchMedia('(max-width: 640px)');
    const onMq = () => setNarrow(mq.matches);
    onMq();
    mq.addEventListener?.('change', onMq);
    baseTitle.current = document.title;
    setReady(true);
    return () => mq.removeEventListener?.('change', onMq);
  }, []);
  useEffect(() => ready && save('im.listOpen', listOpen), [listOpen, ready]);
  useEffect(() => ready && save('im.windows', windows), [windows, ready]);
  useEffect(() => ready && save('im.muted', muted), [muted, ready]);
  useEffect(() => ready && save('im.showOffline', showOffline), [showOffline, ready]);

  const maxWindows = narrow ? 1 : MAX_WINDOWS;

  const openChat = useCallback(
    (id, { focus = true } = {}) => {
      setWindows((ws) => {
        const existing = ws.find((w) => w.id === id);
        if (existing) return ws.map((w) => (w.id === id ? { ...w, min: focus ? false : w.min } : w));
        const next = [{ id, min: false }, ...ws];
        return next.slice(0, maxWindows);
      });
      if (narrow && focus) setListOpen(false);
    },
    [maxWindows, narrow],
  );

  const closeChat = (id) => setWindows((ws) => ws.filter((w) => w.id !== id));
  const toggleMin = (id) => setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, min: !w.min } : w)));

  // ---- buddy list polling ----
  const fetchBuddies = useCallback(async () => {
    try {
      const r = await fetch('/api/im/buddies', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      setBuddies(data.buddies || []);
      setUnread(data.unread || 0);
      // New message from someone? Chime and pop their window open.
      let fresh = false;
      for (const b of data.buddies || []) {
        const before = prevUnread.current[b.id] || 0;
        if (b.unread > before) {
          fresh = true;
          openChat(b.id, { focus: false });
        }
      }
      prevUnread.current = Object.fromEntries((data.buddies || []).map((b) => [b.id, b.unread]));
      if (fresh && !muted) chime();
    } catch {}
  }, [openChat, muted]);

  useEffect(() => {
    if (!ready) return;
    let timer;
    const tick = async () => {
      await fetchBuddies();
      timer = setTimeout(tick, document.hidden ? HIDDEN_POLL : LIST_POLL);
    };
    tick();
    const onVis = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ready, fetchBuddies]);

  // ---- open chat polling ----
  const fetchThread = useCallback(async (id) => {
    const after = lastAt.current[id];
    try {
      const r = await fetch(`/api/im/thread?with=${encodeURIComponent(id)}${after ? `&after=${encodeURIComponent(after)}` : ''}`, {
        cache: 'no-store',
      });
      if (!r.ok) return;
      const { messages = [] } = await r.json();
      if (messages.length) lastAt.current[id] = messages[messages.length - 1].at;
      setThreads((t) => {
        const cur = after ? t[id] || [] : [];
        const seen = new Set(cur.map((m) => m.id));
        const merged = [...cur.filter((m) => !m.pending), ...messages.filter((m) => !seen.has(m.id))];
        const pending = (t[id] || []).filter((m) => m.pending);
        return { ...t, [id]: [...merged, ...pending] };
      });
      if (messages.some((m) => m.from === id)) {
        setBuddies((bs) => bs.map((b) => (b.id === id ? { ...b, unread: 0 } : b)));
        prevUnread.current[id] = 0;
      }
    } catch {}
  }, []);

  const openIds = windows.filter((w) => !w.min).map((w) => w.id).join(',');
  useEffect(() => {
    if (!ready || !openIds) return;
    const ids = openIds.split(',');
    let timer;
    const tick = async () => {
      await Promise.all(ids.map(fetchThread));
      timer = setTimeout(tick, document.hidden ? HIDDEN_POLL : CHAT_POLL);
    };
    tick();
    return () => clearTimeout(timer);
  }, [ready, openIds, fetchThread]);

  // Unread count in the tab title, like the old days.
  useEffect(() => {
    if (!ready) return;
    const base = baseTitle.current.replace(/^\(\d+\)\s*/, '');
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
  }, [unread, ready]);

  async function send(id, text) {
    const body = text.trim();
    if (!body) return;
    const temp = { id: `tmp-${Date.now()}`, from: me.id, to: id, body, at: new Date().toISOString(), pending: true };
    setThreads((t) => ({ ...t, [id]: [...(t[id] || []), temp] }));
    try {
      const r = await fetch('/api/im/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: id, body }),
      });
      const data = await r.json().catch(() => ({}));
      setThreads((t) => {
        const list = (t[id] || []).filter((m) => m.id !== temp.id);
        if (!r.ok) return { ...t, [id]: [...list, { ...temp, pending: false, failed: data.error || 'Not sent' }] };
        if (list.some((m) => m.id === data.message.id)) return { ...t, [id]: list };
        return { ...t, [id]: [...list, data.message] };
      });
      if (r.ok) lastAt.current[id] = lastAt.current[id] && lastAt.current[id] > data.message.at ? lastAt.current[id] : data.message.at;
    } catch {
      setThreads((t) => ({
        ...t,
        [id]: (t[id] || []).map((m) => (m.id === temp.id ? { ...m, pending: false, failed: 'Not sent (no connection)' } : m)),
      }));
    }
  }

  if (!ready) return null;

  const byId = Object.fromEntries(buddies.map((b) => [b.id, b]));
  const q = query.trim().toLowerCase();
  const match = (b) => !q || b.name.toLowerCase().includes(q) || b.username.includes(q);
  const online = buddies.filter((b) => b.online && match(b));
  const offline = buddies.filter((b) => !b.online && match(b));
  const onlineCount = buddies.filter((b) => b.online).length;

  const row = (b) => (
    <button key={b.id} type="button" className={`im-buddy${b.online ? ' on' : ''}`} onClick={() => openChat(b.id)}>
      <span className="im-pic">
        <img src={b.pic} alt="" width={28} height={28} loading="lazy" />
        <i className="im-dot" />
      </span>
      <span className="im-name">{b.name}</span>
      {b.unread > 0 && <span className="im-badge">{b.unread}</span>}
    </button>
  );

  return (
    <div className={`im-dock${narrow ? ' narrow' : ''}`} aria-label="Instant messenger">
      {windows.map((w) => {
        const b = byId[w.id];
        if (!b) return null;
        return (
          <ChatWindow
            key={w.id}
            me={me}
            buddy={b}
            min={w.min}
            messages={threads[w.id] || []}
            onSend={(text) => send(w.id, text)}
            onClose={() => closeChat(w.id)}
            onToggle={() => toggleMin(w.id)}
          />
        );
      })}

      <div className={`im-list${listOpen ? ' open' : ''}`}>
        <button type="button" className="im-bar" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}>
          <span className="im-logo">IM</span>
          <span className="im-title">BFRENZ IM</span>
          <span className="im-online">
            <i className="im-dot live" /> {onlineCount} online
          </span>
          {unread > 0 && <span className="im-badge">{unread}</span>}
          <span className="im-caret">{listOpen ? '▾' : '▴'}</span>
        </button>
        {listOpen && (
          <div className="im-panel">
            <div className="im-me">
              <img src={me.pic} alt="" width={32} height={32} />
              <div>
                <b>{me.name}</b>
                <div className="im-status">
                  <i className="im-dot live" /> Available
                </div>
              </div>
              <button
                type="button"
                className="im-icon"
                title={muted ? 'Sounds off' : 'Sounds on'}
                aria-label={muted ? 'Turn sounds on' : 'Turn sounds off'}
                onClick={() => setMuted((m) => !m)}
              >
                {muted ? '🔇' : '🔔'}
              </button>
            </div>
            {buddies.length > 8 && (
              <input className="im-search" type="search" placeholder="Find a fren…" value={query} onChange={(e) => setQuery(e.target.value)} />
            )}
            <div className="im-buddies">
              {buddies.length === 0 ? (
                <div className="im-empty">
                  No frenz yet. <a href="/browse">Find some</a> or <a href="/invite">invite yours</a>!
                </div>
              ) : (
                <>
                  <div className="im-group">Online ({online.length})</div>
                  {online.length ? online.map(row) : <div className="im-empty small">Nobody online right now.</div>}
                  <button type="button" className="im-group im-group-btn" onClick={() => setShowOffline((s) => !s)}>
                    {showOffline ? '▾' : '▸'} Offline ({offline.length})
                  </button>
                  {showOffline && offline.map(row)}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatWindow({ me, buddy, min, messages, onSend, onClose, onToggle }) {
  const [text, setText] = useState('');
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!min && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages.length, min]);
  useEffect(() => {
    if (!min) inputRef.current?.focus({ preventScroll: true });
  }, [min]);

  function submit(e) {
    e?.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  return (
    <div className={`im-win${min ? ' min' : ''}`}>
      <div className="im-win-head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle()}>
        <span className="im-pic">
          <img src={buddy.pic} alt="" width={24} height={24} />
          <i className={`im-dot${buddy.online ? ' live' : ''}`} />
        </span>
        <span className="im-name">{buddy.name}</span>
        {min && buddy.unread > 0 && <span className="im-badge">{buddy.unread}</span>}
        <a href={`/${buddy.username}`} className="im-icon" title="View profile" onClick={(e) => e.stopPropagation()}>
          ☺
        </a>
        <button type="button" className="im-icon" aria-label="Minimize" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {min ? '▴' : '–'}
        </button>
        <button type="button" className="im-icon" aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
          ✕
        </button>
      </div>
      {!min && (
        <>
          <div className="im-msgs" ref={bodyRef}>
            {messages.length === 0 && <div className="im-empty small">Say hi to {buddy.name}! 👋</div>}
            {messages.map((m) => {
              const mine = m.from === me.id;
              return (
                <div key={m.id} className={`im-msg${mine ? ' mine' : ''}${m.pending ? ' pending' : ''}${m.failed ? ' failed' : ''}`} title={timeLabel(m.at)}>
                  <b className="im-who">{mine ? me.name : buddy.name}:</b> <span className="im-text">{m.body}</span>
                  {m.failed && <div className="im-err">{m.failed}</div>}
                </div>
              );
            })}
          </div>
          <form className="im-input" onSubmit={submit}>
            <textarea
              ref={inputRef}
              rows={2}
              maxLength={1000}
              value={text}
              placeholder={`Message ${buddy.name}…`}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button type="submit" className="btn small-btn" disabled={!text.trim()}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
