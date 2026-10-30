// Shared demo store. Lives in the browser, so the resident app and staff portal
// stay in sync across tabs on the same device. No database and no private data.
import { useEffect, useState, useCallback } from 'react';
import { SEED } from './data.js';

const KEY = 'civi.mableton.v1';
const fresh = () => ({ complaints: JSON.parse(JSON.stringify(SEED)), nextRef: 4817 });

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage blocked */ }
  return fresh();
}

let state = load();
const subs = new Set();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  subs.forEach((f) => f(state));
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { state = load(); subs.forEach((f) => f(state)); }
  });
}

export function useStore() {
  const [s, set] = useState(state);
  useEffect(() => { subs.add(set); return () => subs.delete(set); }, []);
  const update = useCallback((fn) => { state = fn(state); save(); }, []);
  return [s, update];
}

export function resetDemo() { state = fresh(); save(); }

export const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function patchComplaint(update, id, fn) {
  update((s) => ({ ...s, complaints: s.complaints.map((c) => (c.id === id ? fn(c) : c)) }));
}
