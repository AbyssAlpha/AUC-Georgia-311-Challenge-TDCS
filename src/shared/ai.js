// Client side AI helpers. The Gemini key never reaches the browser:
// these call our own /api routes, which hold the key on the server.
import { EMERG, keywordTriage, OUTSIDE, DEPTS, CIVIC, REACTIONS, keywordReactions } from './data.js';

async function post(path, body, ms = 7000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function triage(text) {
  // Safety first: emergencies are caught on the device and never wait on AI.
  if (EMERG.test(text)) return { type: 'emergency', source: 'keywords' };
  try {
    const r = await post('/api/triage', { text });
    if (r.type === 'emergency') return { type: 'emergency', source: 'gemini' };
    if (r.type === 'oos' && OUTSIDE.some((o) => o.id === r.agency)) return { ...r, source: 'gemini' };
    const depts = (r.depts || []).filter((d) => DEPTS.some((x) => x.id === d)).slice(0, 2);
    if (r.type === 'ok' && depts.length) return { type: 'ok', depts, label: r.label || 'Issue report', summary: r.summary || text.slice(0, 110), source: 'gemini' };
  } catch (e) { /* fall through to keywords */ }
  return keywordTriage(text);
}

export async function draftStaffReply(complaint, staffName, deptLabel) {
  try {
    const r = await post('/api/draft-reply', {
      subject: complaint.subject, body: complaint.body, location: complaint.location, status: complaint.status,
      resident: complaint.name.split(' ')[0], staff: staffName, dept: deptLabel,
      thread: complaint.thread.filter((x) => !x.event).slice(-4).map((x) => ({ from: x.from, text: x.text })),
    });
    if (r.reply) return { text: r.reply, source: 'gemini' };
  } catch (e) { /* fall through */ }
  const first = complaint.name.split(' ')[0];
  return {
    text: `Thanks for reporting this, ${first}. ${deptLabel} has received your report about "${complaint.subject.toLowerCase()}" and a staff member will take a look. We'll post an update here as soon as we know more.`,
    source: 'template',
  };
}

// Suggests which reaction set fits a report. The resident can always pick another.
export async function suggestReactions({ issue, label, depts }) {
  try {
    const r = await post('/api/suggest-reactions', { issue, label, depts }, 6000);
    const civic = (r.civicButtons || []).map((b) => CIVIC.find((k) => REACTIONS[k].label === b)).filter(Boolean);
    const reason = String(r.reason || '').replace(/\s*[\u2013\u2014]\s*/g, ', ').trim();
    const ok = ['metoo', 'stillbroken', 'civic'].includes(r.set) && reason && reason.split(/\s+/).length <= 25 && (r.set !== 'civic' || civic.length >= 2);
    if (ok) return { set: r.set, civic: r.set === 'civic' ? [...new Set(civic)].slice(0, 3) : [], reason, source: 'gemini' };
  } catch (e) { /* fall through to keywords */ }
  return keywordReactions({ issue, label });
}
