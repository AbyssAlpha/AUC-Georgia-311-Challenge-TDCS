// "Install Civi" button. Android and desktop Chrome get the real install prompt.
// iPhone has no prompt, so we show the two taps instead.
import React, { useEffect, useState } from 'react';

let deferred = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f()); });
}

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function InstallButton({ small }) {
  const [, tick] = useState(0);
  const [help, setHelp] = useState(false);
  useEffect(() => { const f = () => tick((n) => n + 1); listeners.add(f); return () => listeners.delete(f); }, []);
  if (standalone()) return null;
  if (!deferred && !isIOS()) return null;

  async function go() {
    if (deferred) { deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; tick((n) => n + 1); }
    else setHelp((h) => !h);
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button className={'btn ghost ' + (small ? 'sm' : '')} style={small ? { height: 32, fontSize: 13, padding: '0 12px' } : undefined} onClick={go}>
        Install Civi
      </button>
      {help && (
        <span role="dialog" aria-label="How to install" className="card" style={{ position: 'absolute', right: 0, top: '110%', width: 240, padding: 14, fontSize: 14, lineHeight: 1.5, zIndex: 10, boxShadow: '0 8px 24px rgba(29,36,33,.14)' }}>
          Tap the <b>Share</b> button in Safari, then <b>Add to Home Screen</b>. Civi will open like an app.
        </span>
      )}
    </span>
  );
}
