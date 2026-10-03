'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { directPeer, getCamera, makeRinger, stopStream, waitForIce } from '@/lib/rtcClient';

const INCOMING_POLL = 4000;
const INCOMING_POLL_HIDDEN = 15000;
const CALL_POLL = 1500;

async function callApi(body) {
  const r = await fetch('/api/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong.');
  return d.call;
}

const ENDED_TEXT = { declined: 'Call declined', missed: 'No answer', ended: 'Call ended' };

/**
 * Video calls between frenz, connected directly phone to phone. Listens for incoming calls,
 * starts calls when the IM window's 📹 button fires a "bfrenz-call" event, and shows the call.
 * The site only passes the two sides' connection details ("offer" and "answer") between them.
 */
export default function CallLayer({ me }) {
  const [call, setCall] = useState(null); // callView from the server
  const [phase, setPhase] = useState('idle'); // idle | incoming | calling | live | ended
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [hasRemote, setHasRemote] = useState(false);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const media = useRef({ stream: null, pc: null, answered: false });
  const ringer = useRef(null);
  const phaseRef = useRef('idle');
  phaseRef.current = phase;

  const cleanup = useCallback(() => {
    ringer.current?.stop();
    const m = media.current;
    stopStream(m.stream);
    m.pc?.close();
    media.current = { stream: null, pc: null, answered: false };
    setHasRemote(false);
    setMicOn(true);
    setCamOn(true);
    setElapsed(0);
  }, []);

  const finish = useCallback(
    (text) => {
      cleanup();
      setNote(text || 'Call ended');
      setPhase('ended');
      setTimeout(() => {
        if (phaseRef.current === 'ended') {
          setPhase('idle');
          setCall(null);
          setNote('');
          setError('');
        }
      }, 2500);
    },
    [cleanup],
  );

  useEffect(() => {
    ringer.current = makeRinger();
    return () => cleanup();
  }, [cleanup]);

  // My camera, plus a direct connection that shows the other person's video when it arrives.
  const startPeer = useCallback(async () => {
    const stream = await getCamera();
    media.current.stream = stream;
    if (localRef.current) localRef.current.srcObject = stream;
    const pc = await directPeer(
      stream,
      (remote) => {
        if (remoteRef.current && remoteRef.current.srcObject !== remote) remoteRef.current.srcObject = remote;
        setHasRemote(true);
      },
      (state) => {
        if (state === 'failed') setError('Couldn’t connect the video. One of you may be on a network that blocks calls (try mobile data).');
        if (state === 'connected') setError('');
      },
    );
    media.current.pc = pc;
    return pc;
  }, []);

  // Caller: make the offer and hand it to the site for the other person.
  const goOnCamera = useCallback(
    async (c) => {
      const pc = await startPeer();
      await pc.setLocalDescription(await pc.createOffer());
      await waitForIce(pc);
      await callApi({ action: 'offer', id: c.id, sdp: pc.localDescription.sdp });
    },
    [startPeer],
  );

  // ---- incoming calls ----
  useEffect(() => {
    if (phase !== 'idle') return undefined;
    let timer;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/call?incoming=1', { cache: 'no-store' });
        const d = r.ok ? await r.json() : {};
        if (!stop && d.call && phaseRef.current === 'idle') {
          setCall(d.call);
          setPhase('incoming');
          ringer.current?.start('incoming');
          return;
        }
      } catch {}
      if (!stop) timer = setTimeout(tick, document.hidden ? INCOMING_POLL_HIDDEN : INCOMING_POLL);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [phase]);

  // ---- outgoing calls (from the IM window) ----
  useEffect(() => {
    const onCall = async (e) => {
      if (phaseRef.current !== 'idle') return;
      setError('');
      setCall({ id: null, status: 'ringing', role: 'caller', other: { name: e.detail.name, pic: e.detail.pic } });
      setPhase('calling');
      let started = null;
      try {
        started = await callApi({ action: 'start', to: e.detail.to });
        setCall(started);
        ringer.current?.start('outgoing');
        await goOnCamera(started);
      } catch (err) {
        // If they already declined (or it timed out) while we were connecting, say so plainly.
        let text = err.message;
        if (started?.id) {
          const r = await fetch(`/api/call?id=${encodeURIComponent(started.id)}`, { cache: 'no-store' }).catch(() => null);
          const st = r?.ok ? (await r.json()).call?.status : null;
          if (ENDED_TEXT[st]) text = ENDED_TEXT[st];
          else callApi({ action: 'end', id: started.id }).catch(() => {});
        }
        finish(text);
      }
    };
    window.addEventListener('bfrenz-call', onCall);
    return () => window.removeEventListener('bfrenz-call', onCall);
  }, [goOnCamera, finish]);

  // ---- while ringing / on a call: watch the call's state ----
  const callId = call?.id;
  useEffect(() => {
    if (!callId || !['incoming', 'calling', 'live'].includes(phase)) return undefined;
    let timer;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/call?id=${encodeURIComponent(callId)}`, { cache: 'no-store' });
        const d = r.ok ? await r.json() : null;
        const c = d?.call;
        if (stop || !c) return;
        setCall((old) => ({ ...old, ...c }));
        if (['ended', 'declined', 'missed'].includes(c.status)) {
          finish(phaseRef.current === 'incoming' ? 'Missed call' : ENDED_TEXT[c.status]);
          return;
        }
        if (c.status === 'active' && phaseRef.current === 'calling') {
          ringer.current?.stop();
          setPhase('live');
        }
        // Caller: the answer arrived, so connect.
        const m = media.current;
        if (c.role === 'caller' && c.answer && m.pc && !m.answered) {
          m.answered = true;
          m.pc.setRemoteDescription({ type: 'answer', sdp: c.answer }).catch(() => setError('Couldn’t connect the video.'));
        }
      } catch {}
      if (!stop) timer = setTimeout(tick, CALL_POLL);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [callId, phase, finish]);

  // call timer
  useEffect(() => {
    if (phase !== 'live' || !call?.startedAt) return undefined;
    const t = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [phase, call?.startedAt]);

  // Hang up if the page is closed mid-call.
  useEffect(() => {
    if (!callId || !['calling', 'live'].includes(phase)) return undefined;
    const onLeave = () => navigator.sendBeacon?.('/api/call', new Blob([JSON.stringify({ action: 'end', id: callId })], { type: 'application/json' }));
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, [callId, phase]);

  async function accept() {
    ringer.current?.stop();
    setPhase('live');
    try {
      // The caller's details can take a second to arrive; wait briefly if needed.
      let offer = call.offer;
      for (let i = 0; !offer && i < 12; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const r = await fetch(`/api/call?id=${encodeURIComponent(call.id)}`, { cache: 'no-store' });
        offer = r.ok ? (await r.json()).call?.offer : null;
      }
      if (!offer) throw new Error('The call didn’t connect. Ask them to call again.');
      const pc = await startPeer();
      await pc.setRemoteDescription({ type: 'offer', sdp: offer });
      await pc.setLocalDescription(await pc.createAnswer());
      await waitForIce(pc);
      const c = await callApi({ action: 'answer', id: call.id, sdp: pc.localDescription.sdp });
      setCall(c);
    } catch (err) {
      setError(err.message);
      finish(err.message);
      callApi({ action: 'end', id: call.id }).catch(() => {});
    }
  }
  async function decline() {
    ringer.current?.stop();
    callApi({ action: 'decline', id: call.id }).catch(() => {});
    setPhase('idle');
    setCall(null);
  }
  async function hangUp() {
    const id = call?.id;
    finish('Call ended');
    if (id) callApi({ action: 'end', id }).catch(() => {});
  }
  function toggleMic() {
    const t = media.current.stream?.getAudioTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setMicOn(t.enabled);
    }
  }
  function toggleCam() {
    const t = media.current.stream?.getVideoTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setCamOn(t.enabled);
    }
  }

  if (phase === 'idle' || !call) return null;
  const other = call.other || {};
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  if (phase === 'incoming') {
    return (
      <div className="call-ring" role="alertdialog" aria-label={`${other.name} is video calling you`}>
        <img src={other.pic} alt="" width={64} height={64} className="call-ring-pic" />
        <div className="call-ring-text">
          <b>{other.name}</b>
          <span>📹 is video calling you…</span>
        </div>
        <div className="call-ring-btns">
          <button type="button" className="call-btn decline" onClick={decline} aria-label="Decline">✕</button>
          <button type="button" className="call-btn accept" onClick={accept} aria-label="Answer">📹</button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-screen" role="dialog" aria-label={`Video call with ${other.name}`}>
      <video ref={remoteRef} className={`call-remote${hasRemote ? ' on' : ''}`} autoPlay playsInline />
      {!hasRemote && (
        <div className="call-wait">
          <img src={other.pic} alt="" width={120} height={120} />
          <b>{other.name}</b>
          <span>{phase === 'ended' ? note : error || (phase === 'calling' ? 'Ringing…' : 'Connecting video…')}</span>
        </div>
      )}
      <video ref={localRef} className={`call-local${camOn ? '' : ' off'}`} autoPlay playsInline muted />
      <div className="call-top">
        <b>{other.name}</b>
        <span>{phase === 'live' && hasRemote ? mmss : phase === 'calling' ? 'Ringing…' : phase === 'ended' ? note : 'Connecting…'}</span>
      </div>
      {phase !== 'ended' && (
        <div className="call-controls">
          <button type="button" className={`call-btn${micOn ? '' : ' off'}`} onClick={toggleMic} aria-label={micOn ? 'Mute' : 'Unmute'}>{micOn ? '🎙️' : '🔇'}</button>
          <button type="button" className={`call-btn${camOn ? '' : ' off'}`} onClick={toggleCam} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}>{camOn ? '📷' : '🚫'}</button>
          <button type="button" className="call-btn decline" onClick={hangUp} aria-label="Hang up">✆</button>
        </div>
      )}
    </div>
  );
}
