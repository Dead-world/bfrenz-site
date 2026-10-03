'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCamera, publish, stopStream } from '@/lib/rtcClient';
import { LINK_SOURCES, parseStreamLink, sourceInfo, streamPageUrl } from '@/lib/liveEmbed';
import LiveChatBox, { mergeChats } from '@/components/LiveChatBox';

async function liveApi(body) {
  const r = await fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong.');
  return d;
}

/**
 * The streamer's page. Two ways to go live:
 *  - link: stream on YouTube / Twitch / TikTok and paste the link (free, any number of viewers)
 *  - browser: stream straight from this page's camera (needs Cloudflare keys)
 */
export default function LiveStudio({ me, browserOk }) {
  const [mode, setMode] = useState('link');
  const [phase, setPhase] = useState('setup'); // setup | starting | live | ended
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [viewers, setViewers] = useState(0);
  const [chats, setChats] = useState([]);
  const [stream, setStream] = useState(null); // { id, source, streamRef }
  const [seconds, setSeconds] = useState(0);
  const [endedBy, setEndedBy] = useState('');
  const video = useRef(null);
  const cam = useRef(null);
  const pub = useRef(null);
  const lastChat = useRef(null);
  const parsed = link.trim() ? parseStreamLink(link) : null;

  const stopAll = useCallback(() => {
    stopStream(cam.current);
    pub.current?.pc.close();
    cam.current = null;
    pub.current = null;
  }, []);

  // Camera preview only when streaming from the browser.
  useEffect(() => {
    if (mode !== 'browser' || phase !== 'setup' || cam.current) return undefined;
    let cancelled = false;
    getCamera()
      .then((s) => {
        if (cancelled) return stopStream(s);
        cam.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [mode, phase]);
  useEffect(() => () => stopAll(), [stopAll]);
  useEffect(() => {
    if (mode === 'link' && phase === 'setup') stopAll();
  }, [mode, phase, stopAll]);

  async function goLive() {
    setError('');
    if (mode === 'link' && (!parsed || parsed.error)) return setError(parsed?.error || 'Paste the link to your live stream.');
    if (mode === 'browser' && !cam.current) return setError('Your camera isn’t on yet.');
    setPhase('starting');
    try {
      const d = await liveApi({ action: 'start', title, link: mode === 'link' ? link.trim() : undefined });
      setStream(d);
      if (mode === 'browser') {
        pub.current = await publish(cam.current, 'live', d.id);
        await liveApi({ action: 'announce', id: d.id }).catch(() => {});
      }
      setPhase('live');
    } catch (e) {
      setError(e.message);
      setPhase('setup');
    }
  }

  async function end() {
    setPhase('ended');
    stopAll();
    if (stream?.id) liveApi({ action: 'end', id: stream.id }).catch(() => {});
  }

  // Check in every few seconds: keeps a browser stream listed, brings viewer count and chat.
  useEffect(() => {
    if (phase !== 'live' || !stream?.id) return undefined;
    let timer;
    let stop = false;
    const tick = async () => {
      try {
        const d = await liveApi({ action: 'beat', id: stream.id, after: lastChat.current });
        if (stop) return;
        if (d.status === 'ended') {
          setEndedBy(d.endedBy || '');
          setPhase('ended');
          stopAll();
          return;
        }
        setViewers(d.viewers || 0);
        if (d.chats?.length) {
          lastChat.current = d.chats[d.chats.length - 1].at;
          setChats((c) => mergeChats(c, d.chats));
        }
      } catch {}
      if (!stop) timer = setTimeout(tick, 4000);
    };
    tick();
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    // Closing the page ends a browser stream (the camera stops anyway). Link streams keep going.
    const onLeave = () => stream.source === 'browser' && navigator.sendBeacon?.('/api/live', new Blob([JSON.stringify({ action: 'end', id: stream.id })], { type: 'application/json' }));
    window.addEventListener('pagehide', onLeave);
    return () => {
      stop = true;
      clearTimeout(timer);
      clearInterval(clock);
      window.removeEventListener('pagehide', onLeave);
    };
  }, [phase, stream, stopAll]);

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const linkSource = stream && stream.source !== 'browser' ? sourceInfo(stream.source) : null;
  const showVideo = mode === 'browser' && !linkSource;

  return (
    <div className="live-layout">
      <div className="live-stage">
        {showVideo ? (
          <video ref={video} className="live-video mirror" autoPlay playsInline muted />
        ) : (
          <div className="live-link-stage">
            {phase === 'live' && linkSource ? (
              <>
                <span className="live-link-big">{linkSource.emoji}</span>
                <b>You&apos;re live on BFRENZ through {linkSource.label}</b>
                <span className="small">Keep streaming in {linkSource.label} as usual. Your frenz watch it here.</span>
                <a href={streamPageUrl(stream.source, stream.streamRef)} target="_blank" rel="noopener noreferrer" className="btn small-btn ghost">Open on {linkSource.label} ↗</a>
              </>
            ) : (
              <>
                <span className="live-link-big">📡</span>
                <b>Stream on YouTube, Twitch or TikTok</b>
                <span className="small">Start your live there (phone app or OBS), then paste the link. Free, and any number of people can watch.</span>
              </>
            )}
          </div>
        )}
        {phase === 'live' && (
          <div className="live-badges">
            <span className="live-pill">● LIVE</span>
            <span className="live-count">👀 {viewers}</span>
            <span className="live-count">{mmss}</span>
          </div>
        )}
        {phase === 'ended' && (
          <div className="live-over">
            <b>{endedBy === 'admin' ? 'Your stream was ended by a moderator.' : 'Stream ended'}</b>
            <a href="/home" className="btn small-btn">Back to the feed</a>
          </div>
        )}
      </div>

      <div className="live-side box">
        <div className="box-h">{phase === 'live' ? '🔴 You’re live' : '🔴 Go Live'}</div>
        <div className="box-b">
          {error && <div className="notice error">{error}</div>}
          {(phase === 'setup' || phase === 'starting') && (
            <>
              {browserOk && (
                <div className="live-modes" role="tablist">
                  <button type="button" role="tab" aria-selected={mode === 'link'} className={mode === 'link' ? 'on' : ''} onClick={() => { setMode('link'); setError(''); }}>📡 YouTube / Twitch / TikTok</button>
                  <button type="button" role="tab" aria-selected={mode === 'browser'} className={mode === 'browser' ? 'on' : ''} onClick={() => { setMode('browser'); setError(''); }}>🎥 This camera</button>
                </div>
              )}
              {mode === 'link' && (
                <>
                  <label className="blog-label" htmlFor="live-link">Link to your live stream</label>
                  <input id="live-link" type="url" value={link} placeholder="youtube.com/live/… · twitch.tv/you · tiktok.com/@you" onChange={(e) => setLink(e.target.value)} style={{ width: '100%' }} />
                  {parsed && !parsed.error && <div className="small live-link-ok">✓ {sourceInfo(parsed.source).emoji} {sourceInfo(parsed.source).label} stream found</div>}
                  {parsed?.error && <div className="small live-link-bad">{parsed.error}</div>}
                  <ul className="small muted live-link-help">
                    {LINK_SOURCES.map((s) => <li key={s.source}><b>{s.emoji} {s.label}:</b> {s.hint}</li>)}
                  </ul>
                </>
              )}
              <label className="blog-label" htmlFor="live-title">What&apos;s your stream about?</label>
              <input id="live-title" type="text" value={title} maxLength={80} placeholder="Making a beat from scratch 🎹" onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} />
              <p className="small muted">Your frenz and followers get a notification when you go live. Keep it friendly: streams can be reported and ended by moderators.</p>
              <button type="button" className="btn live-go" onClick={goLive} disabled={phase === 'starting' || (mode === 'link' && (!parsed || !!parsed.error))}>
                {phase === 'starting' ? 'Starting…' : '● Go Live'}
              </button>
            </>
          )}
          {phase === 'live' && (
            <>
              <div className="small" style={{ marginBottom: 8 }}>{title || 'Live now'} · <a href={`/live/${stream.id}`} target="_blank" rel="noopener">Viewer link</a></div>
              <LiveChatBox streamId={stream.id} chats={chats} onSent={(c) => setChats((l) => mergeChats(l, [c]))} />
              <button type="button" className="btn live-end" onClick={end}>End stream</button>
              {linkSource && <p className="small muted" style={{ marginBottom: 0 }}>Done streaming? Press End stream so you leave the Live list. (It ends on its own after a few hours.)</p>}
            </>
          )}
          {phase === 'ended' && <p className="small muted">Thanks for streaming, {me.name}! 🧡</p>}
        </div>
      </div>
    </div>
  );
}
