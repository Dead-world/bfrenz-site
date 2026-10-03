/**
 * Cloudflare Realtime (the video service behind calls and Go Live).
 * The app secret never leaves the server: browsers talk to /api/rtc, which checks
 * who they are and what they're allowed to see, then forwards to Cloudflare.
 *
 * Video calls are direct (phone to phone) and only need these for the backup relay.
 *
 * Vercel environment variables (all optional):
 *   REALTIME_APP_ID, REALTIME_APP_SECRET          Go Live straight from the browser (Realtime > SFU > create app)
 *   REALTIME_TURN_KEY_ID, REALTIME_TURN_KEY_TOKEN backup relay for calls on strict networks (Realtime > TURN)
 */
const BASE = 'https://rtc.live.cloudflare.com/v1';

export function rtcConfigured() {
  return !!(process.env.REALTIME_APP_ID && process.env.REALTIME_APP_SECRET);
}

async function cf(path, method = 'POST', body) {
  const res = await fetch(`${BASE}/apps/${process.env.REALTIME_APP_ID}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.REALTIME_APP_SECRET}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.errorCode) {
    const err = new Error(data.errorDescription || data.errorCode || `Cloudflare error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const newCfSession = () => cf('/sessions/new', 'POST');

/** Send this browser's camera/mic (an SDP offer with the tracks' mids) to Cloudflare. */
export function pushTracks(sessionId, sdp, tracks) {
  return cf(`/sessions/${sessionId}/tracks/new`, 'POST', {
    sessionDescription: { type: 'offer', sdp },
    tracks: tracks.map((t) => ({ location: 'local', mid: String(t.mid), trackName: t.trackName })),
  });
}

/** Ask Cloudflare to send another session's tracks to this browser. Cloudflare answers with an offer. */
export function pullTracks(sessionId, remoteSessionId, trackNames) {
  return cf(`/sessions/${sessionId}/tracks/new`, 'POST', {
    tracks: trackNames.map((trackName) => ({ location: 'remote', sessionId: remoteSessionId, trackName })),
  });
}

export function renegotiate(sessionId, sdp) {
  return cf(`/sessions/${sessionId}/renegotiate`, 'PUT', { sessionDescription: { type: 'answer', sdp } });
}

/** STUN always; TURN relay servers too when TURN keys are set. */
export async function iceServers() {
  const fallback = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
  const id = process.env.REALTIME_TURN_KEY_ID;
  const token = process.env.REALTIME_TURN_KEY_TOKEN;
  if (!id || !token) return fallback;
  try {
    const res = await fetch(`${BASE}/turn/keys/${id}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 6 * 60 * 60 }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
    return list.length ? [...fallback, ...list] : fallback;
  } catch {
    return fallback;
  }
}

export const TRACK_NAMES = ['audio', 'video'];
