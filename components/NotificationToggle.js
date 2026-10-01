'use client';

import { useEffect, useState } from 'react';

function keyToBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Rejects if something takes too long (e.g. no connection to the phone's push service). */
function withTimeout(promise, ms, label) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms))]);
}

async function currentSub() {
  const reg = await withTimeout(navigator.serviceWorker.ready, 6000, 'The app helper is still loading. Reload the page and try again.');
  return withTimeout(reg.pushManager.getSubscription(), 6000, "Couldn't reach your phone's notification service.");
}

/**
 * Turn notifications on/off for this device.
 * compact = the dismissible card on the Feed; otherwise the full settings box.
 */
export default function NotificationToggle({ publicKey, compact = false }) {
  const [state, setState] = useState('loading'); // loading | unsupported | ios-homescreen | denied | off | on
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    (async () => {
      const ua = navigator.userAgent || '';
      const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
      if (compact) {
        try {
          if (Number(localStorage.getItem('bfrenz.notifyPromptHidden') || 0) > Date.now()) setHidden(true);
        } catch {}
      }
      if (!publicKey) return setState('unsupported');
      if (ios && !standalone) return setState('ios-homescreen');
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setState('unsupported');
      if (Notification.permission === 'denied') return setState('denied');
      try {
        const sub = await currentSub();
        setState(sub ? 'on' : 'off');
        if (sub) {
          // Make sure the server knows about it (e.g. after logging in on a new account).
          fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) }).catch(() => {});
        }
      } catch {
        setState('off');
      }
    })();
  }, [publicKey, compact]);

  async function turnOn() {
    setBusy(true);
    setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await withTimeout(navigator.serviceWorker.ready, 6000, 'The app helper is still loading. Reload the page and try again.');
      let sub = await withTimeout(reg.pushManager.getSubscription(), 8000, "Couldn't reach your phone's notification service. Check your connection.");
      if (!sub) {
        sub = await withTimeout(
          reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }),
          15000,
          "Couldn't reach your phone's notification service. Check your connection.",
        );
      }
      const r = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Could not save');
      setState('on');
      setMsg('Notifications are on for this device.');
    } catch (err) {
      setMsg(`Couldn't turn on notifications: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMsg('');
    try {
      const sub = await currentSub();
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState('off');
      setMsg('Notifications are off for this device.');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg('');
    const r = await fetch('/api/push/test', { method: 'POST' }).catch(() => null);
    const data = r ? await r.json().catch(() => ({})) : {};
    setMsg(r?.ok && data.ok ? 'Test sent! It should pop up in a few seconds.' : data.error || "The test didn't go through. Try turning notifications off and on again.");
    setBusy(false);
  }

  function dismiss() {
    try {
      localStorage.setItem('bfrenz.notifyPromptHidden', String(Date.now() + 14 * 24 * 60 * 60 * 1000));
    } catch {}
    setHidden(true);
  }

  // ----- compact Feed card: only when there's something to do -----
  if (compact) {
    if (hidden || !['off', 'ios-homescreen'].includes(state)) return null;
    return (
      <div className="box notify-card">
        <span className="notify-bell">🔔</span>
        <div className="notify-text">
          <b>Never miss an IM</b>
          <span>
            {state === 'ios-homescreen'
              ? 'Add BFRENZ to your Home Screen to get notifications on iPhone.'
              : 'Get notified about new IMs, comments, mail and friend requests.'}
          </span>
        </div>
        {state === 'ios-homescreen' ? (
          <a href="/app" className="btn small-btn">How</a>
        ) : (
          <button type="button" className="btn small-btn" onClick={turnOn} disabled={busy}>
            {busy ? '…' : 'Turn on'}
          </button>
        )}
        <button type="button" className="app-banner-x" aria-label="Not now" onClick={dismiss}>✕</button>
      </div>
    );
  }

  // ----- full settings box -----
  return (
    <div className="notify-settings">
      {state === 'loading' && <p className="muted">Checking this device…</p>}
      {state === 'unsupported' && (
        <p className="muted">
          {publicKey
            ? "This browser doesn't support notifications. Try Chrome, Edge, Firefox or Samsung Internet, or install the BFRENZ app."
            : "Notifications aren't switched on for the site yet."}
        </p>
      )}
      {state === 'ios-homescreen' && (
        <p>
          On iPhone, notifications work once BFRENZ is on your Home Screen. <a href="/app">Here&apos;s how</a> (takes 10
          seconds), then open BFRENZ from the Home Screen and come back here.
        </p>
      )}
      {state === 'denied' && (
        <p>
          Notifications are blocked for BFRENZ in this browser. Turn them back on in your browser or phone settings
          (Site settings → Notifications → Allow), then reload this page.
        </p>
      )}
      {state === 'off' && (
        <>
          <p style={{ marginTop: 0 }}>Get a notification on this device when someone IMs you, comments on your page or posts, sends you mail or a friend request.</p>
          <button type="button" className="btn" onClick={turnOn} disabled={busy}>🔔 Turn on notifications</button>
        </>
      )}
      {state === 'on' && (
        <>
          <p style={{ marginTop: 0 }}><b>✓ Notifications are on for this device.</b></p>
          <div className="actions">
            <button type="button" className="btn small-btn" onClick={test} disabled={busy}>Send me a test</button>
            <button type="button" className="btn ghost small-btn" onClick={turnOff} disabled={busy}>Turn off on this device</button>
          </div>
        </>
      )}
      {msg && <p className="small" style={{ marginBottom: 0 }}>{msg}</p>}
    </div>
  );
}
