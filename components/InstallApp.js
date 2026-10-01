'use client';

import { useEffect, useState } from 'react';

/**
 * Picks the right way to install BFRENZ for this device:
 *  - Android Chrome/Edge/Samsung: the one-tap install prompt
 *  - iPhone/iPad: Share → Add to Home Screen steps
 *  - Already installed: a thumbs up
 * Also offers the Android .apk download if /bfrenz.apk has been uploaded.
 */
export default function InstallApp() {
  const [prompt, setPrompt] = useState(null);
  const [platform, setPlatform] = useState('unknown'); // android | ios | desktop
  const [installed, setInstalled] = useState(false);
  const [apk, setApk] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setPlatform(ios ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop');
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => setDone(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    fetch('/bfrenz.apk', { method: 'HEAD', cache: 'no-store' })
      .then((r) => setApk(r.ok && !/text\/html/.test(r.headers.get('content-type') || '')))
      .catch(() => {});
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') setDone(true);
    setPrompt(null);
  }

  if (installed || done) {
    return (
      <div className="install-card ok">
        <div className="install-big">✓</div>
        <b>{done ? 'Installed! Look for the orange “b” on your home screen.' : 'You’re using the BFRENZ app.'}</b>
      </div>
    );
  }

  return (
    <div className="install-wrap">
      {prompt && (
        <button type="button" className="btn install-btn" onClick={install}>
          📲 Install BFRENZ
        </button>
      )}

      {platform === 'ios' && (
        <div className="install-card">
          <b>On iPhone or iPad (use Safari):</b>
          <ol className="install-steps">
            <li>Tap the <b>Share</b> button <span className="ios-share" aria-hidden="true">⬆︎</span> at the bottom of Safari.</li>
            <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
            <li>Tap <b>Add</b>. BFRENZ shows up on your home screen like any other app.</li>
          </ol>
        </div>
      )}

      {platform === 'android' && !prompt && (
        <div className="install-card">
          <b>On Android (Chrome):</b>
          <ol className="install-steps">
            <li>Tap the <b>⋮</b> menu in the top right of Chrome.</li>
            <li>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</li>
            <li>Tap <b>Install</b>. Done!</li>
          </ol>
        </div>
      )}

      {platform === 'desktop' && !prompt && (
        <div className="install-card">
          <b>On a computer:</b> in Chrome or Edge, click the <b>install icon</b> at the right end of the address bar
          (a little screen with a down arrow). Or open bfrenz.com on your phone to install it there.
        </div>
      )}

      {apk && platform !== 'ios' && (
        <div className="install-card">
          <b>Or download the Android app file:</b>
          <p className="small muted" style={{ margin: '6px 0 10px' }}>
            Android will ask you to allow installs from your browser the first time. That&apos;s normal for apps
            that don&apos;t come from the Play Store.
          </p>
          <a className="btn ghost small-btn" href="/bfrenz.apk" download="BFRENZ.apk">⬇ Download BFRENZ for Android (.apk)</a>
          <ol className="install-steps small">
            <li>Open the downloaded file (from your notifications or Downloads).</li>
            <li>If asked, tap <b>Settings</b> → turn on <b>Allow from this source</b> → go back.</li>
            <li>Tap <b>Install</b>, then <b>Open</b>.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
