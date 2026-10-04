'use client';

import { useEffect, useRef, useState } from 'react';
import { stopStream, subscribeWithRetry } from '@/lib/rtcClient';
import LiveChatBox, { mergeChats } from '@/components/LiveChatBox';
import GiftButton from '@/components/GiftButton';

/**
 * Watching someone's stream: video, viewer count, chat.
 * `link` is set for YouTube/Twitch/TikTok streams: { source, label, emoji, embed, page }.
 */
export default function LiveViewer({ streamId, streamer, admin, link, coins, gifts, mine = false }) {
  const [status, setStatus] = useState('loading'); // loading | starting | live | ended
  const [viewers, setViewers] = useState(0);
  const [chats, setChats] = useState([]);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const [hasVideo, setHasVideo] = useState(false);
  const video = useRef(null);
  const sub = useRef(null);
  const subscribing = useRef(false);
  const lastChat = useRef(null);

  useEffect(() => {
    let timer;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'watch', id: streamId, after: lastChat.current }) });
        const d = await r.json().catch(() => ({}));
        if (stop) return;
        if (!r.ok) {
          setStatus('ended');
          return;
        }
        setStatus(d.status);
        setViewers(d.viewers || 0);
        if (d.chats?.length) {
          lastChat.current = d.chats[d.chats.length - 1].at;
          setChats((c) => mergeChats(c, d.chats));
        }
        if (d.status === 'ended') {
          sub.current?.pc.close();
          return;
        }
        if (!link && d.status === 'live' && d.sessionId && !sub.current && !subscribing.current) {
          subscribing.current = true;
          subscribeWithRetry(d.sessionId, 'watch', streamId, (s) => {
            if (video.current) video.current.srcObject = s;
            setHasVideo(true);
          }, { isCancelled: () => stop })
            .then((x) => { sub.current = x; })
            .catch((e) => setError(e.message))
            .finally(() => { subscribing.current = false; });
        }
      } catch {}
      if (!stop) timer = setTimeout(tick, 4000);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
      sub.current?.pc.close();
      stopStream(video.current?.srcObject);
    };
  }, [streamId, link]);

  async function endAsAdmin() {
    if (!confirm('End this stream for everyone?')) return;
    await fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'end', id: streamId }) });
    setStatus('ended');
  }

  return (
    <div className="live-layout">
      <div className={`live-stage${link ? ' is-link' : ''}`}>
        {link?.embed && status !== 'ended' && (
          <iframe
            className="live-embed"
            src={link.embed}
            title={`${streamer.name} live on ${link.label}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
        {link && !link.embed && status !== 'ended' && (
          <div className="live-link-stage">
            <span className="live-link-big">{link.emoji}</span>
            <b>{streamer.name} is live on {link.label}</b>
            <span className="small">{link.label} lives can only be watched in {link.label}. Chat with everyone here while you watch!</span>
            <a href={link.page} target="_blank" rel="noopener noreferrer" className="btn live-go-btn">▶ Watch on {link.label}</a>
          </div>
        )}
        {!link && <video ref={video} className="live-video" autoPlay playsInline muted={muted} />}
        {status === 'live' && (
          <div className="live-badges">
            <span className="live-pill">● LIVE</span>
            <span className="live-count">👀 {viewers}</span>
            {link && <a className="live-count" href={link.page} target="_blank" rel="noopener noreferrer">{link.emoji} {link.label} ↗</a>}
          </div>
        )}
        {!link && status === 'live' && hasVideo && muted && (
          <button type="button" className="live-unmute" onClick={() => { setMuted(false); video.current?.play?.(); }}>🔊 Tap for sound</button>
        )}
        {!link && (status === 'loading' || status === 'starting' || (status === 'live' && !hasVideo)) && (
          <div className="live-over"><span className="small">{error || (status === 'starting' ? `${streamer.name} is getting ready…` : 'Connecting to the stream…')}</span></div>
        )}
        {status === 'ended' && (
          <div className="live-over">
            <b>This stream has ended</b>
            <a href={`/${streamer.username}`} className="btn small-btn">Visit {streamer.name}&apos;s page</a>
          </div>
        )}
      </div>
      <div className="live-side box">
        <div className="box-h">💬 Live chat</div>
        <div className="box-b">
          <LiveChatBox streamId={streamId} chats={chats} disabled={status === 'ended'} onSent={(c) => setChats((l) => mergeChats(l, [c]))} />
          {status !== 'ended' && !mine && (
            <div className="live-gift-row">
              <GiftButton k={`l-${streamId}`} totals={gifts} coins={coins} look="live" label={`Gift ${streamer.name}`} />
            </div>
          )}
          <div className="small live-tools">
            <a href={`/report?kind=live&id=${streamId}&back=${encodeURIComponent(`/live/${streamId}`)}`} className="muted">Report stream</a>
            {admin && status !== 'ended' && <button type="button" className="linkbtn small" onClick={endAsAdmin}>🛡️ End stream (admin)</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
