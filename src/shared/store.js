// Shared demo store. Lives in the browser, so the resident app and staff portal
// stay in sync across tabs on the same device. No database and no private data.
import { useEffect, useState, useCallback } from 'react';
import { SEED, SEED_POSTS, seedAlerts } from './data.js';

const KEY = 'civi.mableton.v3';
const fresh = () => ({ complaints: JSON.parse(JSON.stringify(SEED)), nextRef: 4817, alerts: seedAlerts(Date.now()), posts: JSON.parse(JSON.stringify(SEED_POSTS)) });

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
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

// One tap per person per button. Tapping again takes it back.
export function toggleReaction(update, id, key, email) {
  patchComplaint(update, id, (c) => {
    const list = c.taps?.[key] || [];
    return { ...c, taps: { ...c.taps, [key]: list.includes(email) ? list.filter((e) => e !== email) : [...list, email] } };
  });
}

export function patchPost(update, id, fn) {
  update((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? fn(p) : p)) }));
}

export function patchComment(update, postId, commentId, fn) {
  patchPost(update, postId, (p) => ({ ...p, comments: p.comments.map((c) => (c.id === commentId ? fn(c) : c)) }));
}
