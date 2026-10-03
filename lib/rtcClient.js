'use client';

/**
 * Browser side of calls and live streams. Video goes through Cloudflare; every request
 * goes via /api/rtc so the site can check permissions first.
 */
export async function rtcApi(action, body = {}) {
  const r = await fetch('/api/rtc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(d.error || 'Video connection failed.');
    err.status = r.status;
    throw err;
  }
  return d;
}

let iceCache = null;
export async function getIceServers() {
  if (!iceCache) iceCache = rtcApi('config').then((d) => d.iceServers).catch(() => [{ urls: 'stun:stun.cloudflare.com:3478' }]);
  return iceCache;
}

/** Camera + mic, with friendly errors. */
export async function getCamera() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser can’t use your camera. Try Chrome, Safari or Firefox.');
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (e) {
    if (e?.name === 'NotAllowedError') throw new Error('Allow camera and microphone access to continue (check the lock icon next to the address bar).');
    if (e?.name === 'NotFoundError') throw new Error('No camera or microphone was found.');
    throw new Error('Couldn’t start your camera. Is another app using it?');
  }
}

/** Send my camera/mic to Cloudflare. Returns { pc, sessionId }. */
export async function publish(stream, purpose, refId) {
  const pc = new RTCPeerConnection({ iceServers: await getIceServers(), bundlePolicy: 'max-bundle' });
  try {
    const { sessionId } = await rtcApi('session', { purpose, refId });
    const sent = stream.getTracks().map((track) => ({ t: pc.addTransceiver(track, { direction: 'sendonly' }), name: track.kind }));
    await pc.setLocalDescription(await pc.createOffer());
    const res = await rtcApi('push', {
      sessionId,
      sdp: pc.localDescription.sdp,
      tracks: sent.map(({ t, name }) => ({ mid: t.mid, trackName: name })),
    });
    await pc.setRemoteDescription({ type: 'answer', sdp: res.sdp });
    return { pc, sessionId };
  } catch (e) {
    pc.close();
    throw e;
  }
}

/** Receive someone's camera/mic from Cloudflare. onStream gets a MediaStream as tracks arrive. */
export async function subscribe(remote, purpose, refId, onStream) {
  const pc = new RTCPeerConnection({ iceServers: await getIceServers(), bundlePolicy: 'max-bundle' });
  const media = new MediaStream();
  pc.ontrack = (e) => {
    media.addTrack(e.track);
    onStream(media);
  };
  try {
    const { sessionId } = await rtcApi('session', { purpose, refId });
    const res = await rtcApi('pull', { sessionId, remote });
    if (res.renegotiate && res.sdp) {
      await pc.setRemoteDescription({ type: 'offer', sdp: res.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await rtcApi('renegotiate', { sessionId, sdp: pc.localDescription.sdp });
    }
    return { pc, sessionId };
  } catch (e) {
    pc.close();
    throw e;
  }
}

/** Keep trying to receive (the other side may still be connecting). */
export async function subscribeWithRetry(remote, purpose, refId, onStream, { tries = 8, isCancelled = () => false } = {}) {
  let last;
  for (let i = 0; i < tries && !isCancelled(); i++) {
    try {
      return await subscribe(remote, purpose, refId, onStream);
    } catch (e) {
      last = e;
      if (e.status === 403 || e.status === 410 || e.status === 503) break;
      await new Promise((r) => setTimeout(r, 1500 + i * 500));
    }
  }
  throw last || new Error('Couldn’t connect the video.');
}

export function stopStream(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** A short, simple ring sound made in the browser (no files needed). */
export function makeRinger() {
  let ctx = null;
  let timer = null;
  const beep = (f, at, len) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    o.type = 'sine';
    g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + len);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + at);
    o.stop(ctx.currentTime + at + len + 0.05);
  };
  return {
    start(kind = 'incoming') {
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume?.();
        const play = () => {
          if (kind === 'incoming') {
            beep(784, 0, 0.18); beep(988, 0.2, 0.18); beep(784, 0.45, 0.18); beep(988, 0.65, 0.25);
          } else {
            beep(440, 0, 0.9); beep(480, 0, 0.9);
          }
        };
        play();
        clearInterval(timer);
        timer = setInterval(play, kind === 'incoming' ? 2200 : 3000);
      } catch {}
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
  };
}

/** Wait until the browser has found its connection routes (or give up after `ms`), so one message carries everything. */
export function waitForIce(pc, ms = 3000) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => {
      clearTimeout(t);
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    const t = setTimeout(done, ms);
    pc.addEventListener('icegatheringstatechange', check);
  });
}

/**
 * A direct (phone-to-phone) connection for a call. The video never goes through a server,
 * unless both sides are on strict networks and a TURN relay is set up.
 */
export async function directPeer(stream, onRemote, onState) {
  const pc = new RTCPeerConnection({ iceServers: await getIceServers() });
  const remote = new MediaStream();
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  pc.ontrack = (e) => {
    if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
    onRemote(remote);
  };
  pc.onconnectionstatechange = () => onState?.(pc.connectionState);
  return pc;
}
