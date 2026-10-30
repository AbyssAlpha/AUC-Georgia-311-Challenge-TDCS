// Civi "Chat C" mark: the C is a speech bubble, the gold dot is Civi listening.
import React from 'react';

export function Logo({ size = 28, round = false, title = 'Civi' }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title}>
      <rect width="100" height="100" rx={round ? 50 : 24} fill="#1D6FE8" />
      <path d="M67 33 A23 23 0 1 0 67 67" stroke="#fff" strokeWidth={round ? 13 : 12} fill="none" strokeLinecap="round" />
      {!round && <path d="M31 63 L23 81 L43 71 Z" fill="#fff" />}
      <circle cx="72" cy="50" r={round ? 8 : 7} fill="#F2C46D" />
    </svg>
  );
}

export function Wordmark({ size = 28, sub }) {
  return (
    <span className="brand" style={{ gap: 9 }}>
      <Logo size={size} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ font: `700 ${Math.round(size * 0.72)}px var(--sans)`, letterSpacing: '-0.02em' }}>Civi</span>
        {sub && <span className="eyebrow" style={{ marginTop: 4 }}>{sub}</span>}
      </span>
    </span>
  );
}

const I = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  locate: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  skip: 'M5 12h12M13 6l6 6-6 6',
  refresh: 'M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0 0 12 3M19 9A7 7 0 0 0 7 6',
};

export function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={I[name]} />
    </svg>
  );
}
