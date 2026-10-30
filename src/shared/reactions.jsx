// Reaction buttons for shared city reports, with Tabler style line icons.
import React from 'react';
import { REACTIONS, reactionCount } from './data.js';

const PATHS = {
  eye: ['M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0', 'M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6'],
  alert: ['M12 9v4', 'M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z', 'M12 16h.01'],
  check: ['M5 12l5 5l10 -10'],
  shield: ['M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3', 'M12 11v2', 'M12 16v.01'],
  child: ['M12 4.5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', 'M8 21v-6l-2 -3l6 -2l6 2l-2 3v6', 'M10 21v-4h4v4'],
  walk: ['M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M7 21l3 -4', 'M16 21l-2 -4l-3 -3l1 -6', 'M6 12l2 -3l4 -1l3 3l3 1'],
  store: ['M3 21l18 0', 'M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4', 'M5 21l0 -10.15', 'M19 21l0 -10.15', 'M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4'],
  car: ['M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', 'M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', 'M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5'],
  heart: ['M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572'],
  comment: ['M8 9h8', 'M8 13h6', 'M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z'],
  flag: ['M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9z', 'M5 21v-7'],
};

export function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {(PATHS[name] || []).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

// keys: which buttons. With onTap they are real toggle buttons; without, a still preview.
export function ReactionBar({ c, keys, me, onTap }) {
  return (
    <div className="reacts">
      {keys.map((k) => {
        const r = REACTIONS[k];
        const n = c ? reactionCount(c, k) : 0;
        const on = !!(c && me && c.taps?.[k]?.includes(me));
        const inner = <><Icon name={r.icon} /><span>{r.label}</span>{c && <span className="mono react-n">{n}</span>}</>;
        if (!onTap) return <span key={k} className={'react' + (k === 'thanks' ? ' thanks' : '')}>{inner}</span>;
        return (
          <button key={k} type="button" className={'react' + (k === 'thanks' ? ' thanks' : '')} aria-pressed={on} onClick={() => onTap(k)}
            aria-label={`${r.label}, ${n} so far`}>{inner}</button>
        );
      })}
    </div>
  );
}
