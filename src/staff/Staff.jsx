import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEPTS, deptName, deptNames, joinList, postButtons, reactionCount, canShare } from '../shared/data.js';
import { useStore, today, patchComplaint } from '../shared/store.js';
import { draftStaffReply } from '../shared/ai.js';
import { ReactionBar } from '../shared/reactions.jsx';
import Moderation from './Moderation.jsx';
import { Wordmark } from '../shared/Logo.jsx';
import { MapView, CityMap, googleMapsUrl, liveAlerts, alertsNear, ALERT_TYPES, STATUS_COLORS, MABLETON } from '../shared/map.jsx';

const STATUS = { New: ['var(--blue-bg)', 'var(--blue)'], 'In progress': ['var(--amber-bg)', 'var(--amber)'], Resolved: ['var(--ok-bg)', 'var(--ok)'] };
const Pill = ({ status }) => <span className="pill" style={{ background: STATUS[status][0], color: STATUS[status][1] }}>{status}</span>;
const open = (c) => c.status !== 'Resolved';
const FILTERS = { open: ['All open', open], new: ['New', (c) => c.status === 'New'], progress: ['In progress', (c) => c.status === 'In progress'], resolved: ['Resolved', (c) => c.status === 'Resolved'] };

export default function Staff() {
  const [store, update] = useStore();
  const [dept, setDept] = useState('pw');
  const [view, setView] = useState('inbox');
  const [filter, setFilter] = useState('open');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [reply, setReply] = useState('');
  const [ai, setAi] = useState({ state: 'idle', text: '', source: '' });
  const [reassignOpen, setReassignOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastT = useRef();
  const flash = (t) => { setToast(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 2600); };

  const D = DEPTS.find((d) => d.id === dept);
  const mine = store.complaints.filter((c) => c.depts.includes(dept));
  const cnt = (k) => mine.filter(FILTERS[k][1]).length;
  const ql = q.toLowerCase();
  const rows = mine.filter(FILTERS[filter][1]).filter((c) => !ql || [c.name, c.subject, c.summary, c.location, c.id].join(' ').toLowerCase().includes(ql));
  const cur = store.complaints.find((c) => c.id === sel);
  const [back, setBack] = useState('inbox');
  const [mapOpts, setMapOpts] = useState({ scope: 'all', resolved: false });
  const [post, setPost] = useState(null);
  const center = useRef(MABLETON);
  const [minute, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(t); }, []);
  const alerts = useMemo(() => liveAlerts(store.alerts), [store.alerts, minute]);
  const mapReports = useMemo(() => store.complaints.filter((c) => c.coords && (mapOpts.resolved || open(c)) && (mapOpts.scope === 'all' || c.depts.includes(dept))), [store.complaints, mapOpts, dept]);
  const unpinned = store.complaints.filter((c) => !c.coords && open(c)).length;

  useEffect(() => { setView((v) => (v === 'map' ? v : 'inbox')); setSel(null); }, [dept]);

  function postAlert() {
    const now = Date.now();
    const a = { id: 'AL-' + now, type: post.type, note: post.note.trim() || ALERT_TYPES[post.type].label, coords: { ...center.current }, radius: +post.radius, by: D.staff, posted: now, until: now + post.hours * 3600e3 };
    update((s) => ({ ...s, alerts: [a, ...(s.alerts || [])] }));
    setPost(null);
    flash(ALERT_TYPES[a.type].label + ' alert posted');
  }

  function clearAlert(id) {
    update((s) => ({ ...s, alerts: (s.alerts || []).filter((a) => a.id !== id) }));
    flash('Alert cleared');
  }

  const toReview = (store.posts || []).reduce((n, p) => n + (p.reports?.length && p.status !== 'removed' ? 1 : 0) + p.comments.filter((c) => c.reports?.length && c.status !== 'removed').length, 0);

  function setShared(on) {
    patchComplaint(update, sel, (c) => ({ ...c, shared: on, thread: [...c.thread, { event: true, text: on ? 'Shared to the community feed by ' + D.staff : 'Removed from the community feed by ' + D.staff, date: today() }] }));
    flash(on ? 'Shared to the community feed' : 'Removed from the community feed');
  }

  function openDetail(id, from = 'inbox') {
    setBack(from); setSel(id); setView('detail'); setReply(''); setAi({ state: 'idle', text: '', source: '' }); setReassignOpen(false);
    patchComplaint(update, id, (c) => ({ ...c, staffUnread: false }));
  }

  function sendReply() {
    const t = reply.trim();
    if (!t) return;
    setReply(''); setAi({ state: 'idle', text: '', source: '' });
    patchComplaint(update, sel, (c) => ({
      ...c, unread: true, status: c.status === 'New' ? 'In progress' : c.status,
      thread: [...c.thread, { from: 'staff', who: D.staff, text: t, date: today() }, ...(c.status === 'New' ? [{ event: true, text: 'Status changed to In progress', date: today() }] : [])],
    }));
    flash('Reply sent to ' + cur.name.split(' ')[0]);
  }

  function setStatus(st, text) {
    patchComplaint(update, sel, (c) => ({ ...c, status: st, unread: true, thread: [...c.thread, { event: true, text, date: today() }] }));
  }

  function reassign(to) {
    const id = sel;
    patchComplaint(update, id, (c) => ({ ...c, depts: [to, ...c.depts.filter((x) => x !== dept && x !== to)], thread: [...c.thread, { event: true, text: `Reassigned from ${D.name} to ${deptName(to)}`, date: today() }] }));
    setView('inbox'); setReassignOpen(false);
    flash(`${id} reassigned to ${deptName(to)}`);
  }

  async function getDraft() {
    setAi({ state: 'loading', text: '', source: '' });
    const r = await draftStaffReply(cur, D.staff, D.name);
    setAi({ state: 'ready', text: r.text, source: r.source });
  }

  const deptSelect = (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="eyebrow">Viewing as</span>
      <select className="input" style={{ height: 40, fontSize: 14 }} value={dept} onChange={(e) => setDept(e.target.value)}>
        {DEPTS.map((d) => <option key={d.id} value={d.id}>{d.staff}, {d.name}</option>)}
      </select>
    </label>
  );

  return (
    <div className="portal">
      <aside>
        <a href="#/" style={{ padding: '0 6px', textDecoration: 'none', color: '#fff' }} aria-label="Civi home"><Wordmark size={30} /></a>
        <span className="eyebrow" style={{ margin: '8px 0 22px 6px' }}>Mableton staff portal</span>
        {[['open', 'Inbox'], ['resolved', 'Resolved']].map(([k, l]) => (
          <button key={k} className="nav-btn" aria-current={(view === 'inbox' && filter === k) || (view === 'detail' && back === 'inbox' && k === 'open') ? 'page' : undefined} onClick={() => { setView('inbox'); setFilter(k); }}>
            {l}<span className="mono" style={{ fontSize: 12 }}>{cnt(k)}</span>
          </button>
        ))}
        <button className="nav-btn" aria-current={view === 'map' || (view === 'detail' && back === 'map') ? 'page' : undefined} onClick={() => setView('map')}>
          City map{alerts.length > 0 && <span className="mono" style={{ fontSize: 12, color: '#FFB4AB' }}>{alerts.length} alert{alerts.length > 1 ? 's' : ''}</span>}
        </button>
        <button className="nav-btn" aria-current={view === 'community' || (view === 'detail' && back === 'community') ? 'page' : undefined} onClick={() => setView('community')}>
          Community{toReview > 0 && <span className="mono" style={{ fontSize: 12, color: '#FFB4AB' }}>{toReview} to review</span>}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, color: '#9AA3B8', lineHeight: 1.5, padding: '0 6px 16px' }}>Civi sorts and drafts. Staff approve every message before a resident sees it.</div>
        {deptSelect}
      </aside>
      <main>
        <div className="portal-top">
          <a href="#/" style={{ textDecoration: 'none', color: '#fff' }} aria-label="Civi home"><Wordmark size={26} sub="Staff portal" /></a>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['inbox', 'Inbox'], ['map', 'City map'], ['community', 'Community' + (toReview ? ` (${toReview})` : '')]].filter(([k]) => k !== view).map(([k, l]) => <button key={k} className="btn ghost sm" onClick={() => setView(k)}>{l}</button>)}
          </span>
          {deptSelect}
        </div>

        {view === 'community' && <Moderation store={store} update={update} staff={D.staff} flash={flash} onOpen={(id) => openDetail(id, 'community')} />}

        {view === 'map' && (
          <div className="content">
            <div className="row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div><h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.02em' }}>City map</h1>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>Every report with a pin, and areas crews should stay clear of.</p></div>
              <div className="filters" style={{ margin: 0 }}>
                <button aria-pressed={mapOpts.scope === 'all'} onClick={() => setMapOpts((o) => ({ ...o, scope: 'all' }))}>All departments</button>
                <button aria-pressed={mapOpts.scope === 'mine'} onClick={() => setMapOpts((o) => ({ ...o, scope: 'mine' }))}>{D.name}</button>
                <button aria-pressed={mapOpts.resolved} onClick={() => setMapOpts((o) => ({ ...o, resolved: !o.resolved }))}>Show resolved</button>
              </div>
            </div>
            <div className="map-layout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                <CityMap reports={mapReports} alerts={alerts} onOpen={(id) => openDetail(id, 'map')} placing={!!post} onCenter={(c) => { center.current = c; }} />
                <div className="legend" aria-label="Map key">
                  {Object.entries(STATUS_COLORS).filter(([s]) => mapOpts.resolved || s !== 'Resolved').map(([s, col]) => <span key={s}><i style={{ background: col }} />{s} ({mapReports.filter((c) => c.status === s).length})</span>)}
                  <span><i className="zone" style={{ borderColor: 'var(--red)' }} />Staff alert area</span>
                  {unpinned > 0 && <span style={{ color: 'var(--muted)' }}>{unpinned} open report{unpinned > 1 ? 's' : ''} without a pin {unpinned > 1 ? 'are' : 'is'} not shown.</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="row-between"><span className="eyebrow">Areas of concern</span>{!post && <button className="btn sm" onClick={() => setPost({ type: 'gas', note: '', radius: 250, hours: 6 })}>Post an alert</button>}</div>
                  <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>For staff only. Residents never see these. Emergencies still go to 911 first.</span>
                  {post && (
                    <div className="ai-box" style={{ gap: 10 }}>
                      <b style={{ fontSize: 14 }}>Move the map so the pin is on the area</b>
                      <label className="field">Type<select className="input" value={post.type} onChange={(e) => setPost((p) => ({ ...p, type: e.target.value }))}>{Object.entries(ALERT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></label>
                      <label className="field">Note for crews<input className="input" maxLength={160} value={post.note} onChange={(e) => setPost((p) => ({ ...p, note: e.target.value }))} placeholder="For example: gas company on site, keep out" /></label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <label className="field" style={{ flex: 1 }}>Size<select className="input" value={post.radius} onChange={(e) => setPost((p) => ({ ...p, radius: e.target.value }))}><option value={100}>1 block</option><option value={250}>A few blocks</option><option value={500}>Neighborhood</option></select></label>
                        <label className="field" style={{ flex: 1 }}>Clears in<select className="input" value={post.hours} onChange={(e) => setPost((p) => ({ ...p, hours: +e.target.value }))}><option value={2}>2 hours</option><option value={6}>6 hours</option><option value={24}>24 hours</option></select></label>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}><button className="btn sm" onClick={postAlert}>Post alert</button><button className="btn ghost sm" onClick={() => setPost(null)}>Cancel</button></div>
                    </div>
                  )}
                  {!alerts.length && !post && <span style={{ fontSize: 14, color: 'var(--muted)' }}>No active alerts.</span>}
                  {alerts.map((a) => {
                    const t = ALERT_TYPES[a.type] || ALERT_TYPES.hazard;
                    const inside = store.complaints.filter((c) => open(c) && alertsNear(c.coords, [a]).length).length;
                    return (
                      <div key={a.id} style={{ borderLeft: `4px solid ${t.color}`, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 14 }}>
                        <b>{t.label}{a.sample && <span className="eyebrow" style={{ marginLeft: 8 }}>Sample</span>}</b>
                        <span style={{ lineHeight: 1.45 }}>{a.note}</span>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{a.by} · clears {new Date(a.until).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}{inside ? ` · ${inside} open report${inside > 1 ? 's' : ''} inside` : ''}</span>
                        <button className="link" style={{ alignSelf: 'flex-start', padding: '4px 0' }} onClick={() => clearAlert(a.id)}>Clear alert</button>
                      </div>
                    );
                  })}
                </div>
                <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                  <span className="eyebrow">Open reports by department</span>
                  {DEPTS.map((d) => {
                    const os = store.complaints.filter((c) => open(c) && c.depts.includes(d.id));
                    return <div key={d.id} className="row-between"><span>{d.name}</span><span className="mono" style={{ fontSize: 13 }}>{os.filter((c) => c.status === 'New').length} new · {os.filter((c) => c.status === 'In progress').length} in progress</span></div>;
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'inbox' && (
          <div className="content">
            <div className="row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div><h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.02em' }}>{filter === 'resolved' ? 'Resolved' : 'Inbox'}</h1>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>Complaints routed to {D.name} by residents</p></div>
              <input className="input" style={{ width: 320, maxWidth: '100%', height: 42 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, issue, address or ref" aria-label="Search" />
            </div>
            <div className="filters">
              {Object.keys(FILTERS).map((k) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{FILTERS[k][0]}<span className="mono" style={{ fontSize: 12, opacity: .85 }}>{cnt(k)}</span></button>)}
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="tbl-head eyebrow"><span /><span>Ref</span><span>Resident</span><span>Issue</span><span>Location</span><span>Received</span><span>Status</span></div>
              {rows.map((c) => {
                const bold = c.status === 'New' || c.staffUnread;
                return (
                  <button key={c.id} className="tbl-row" onClick={() => openDetail(c.id)}>
                    <span className="dot c-dot" style={{ background: bold ? 'var(--blue)' : 'transparent' }} />
                    <span className="mono c-ref" style={{ fontSize: 13, color: 'var(--ink3)' }}>{c.id.replace('MBL-', '')}</span>
                    <span className="c-name" style={{ fontWeight: bold ? 700 : 400 }}>{c.name}</span>
                    <span className="c-sub" style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontWeight: bold ? 700 : 400, fontSize: 15 }}>{c.subject}</span>
                      <span className="ellip" style={{ color: 'var(--muted)' }}>{c.summary}</span>
                    </span>
                    <span className="c-loc" style={{ color: 'var(--ink3)' }}>{c.location}</span>
                    <span className="c-date" style={{ color: 'var(--ink3)' }}>{c.date}</span>
                    <span className="c-st"><Pill status={c.status} /></span>
                    <span className="c-meta">{c.name} · {c.location} · {c.date}</span>
                  </button>
                );
              })}
              {!rows.length && <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>No complaints match.</div>}
            </div>
          </div>
        )}

        {view === 'detail' && cur && (
          <div className="content" style={{ gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button className="link" onClick={() => setView(back)}>{{ map: '← City map', community: '← Community' }[back] || '← Inbox'}</button>
              <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>{cur.id}</span>
              <Pill status={cur.status} />
            </div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{cur.subject}</h1>
            {open(cur) && alertsNear(cur.coords, alerts).map((a) => (
              <div key={a.id} className="alert red" role="status"><b>Inside a {ALERT_TYPES[a.type].label.toLowerCase()} alert area</b><span>{a.note} Check before sending a crew.</span></div>
            ))}
            <div className="detail-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--ink3)' }}>{cur.name.split(' ').map((w) => w[0]).join('')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15 }}>{cur.name}</b><span style={{ fontSize: 13, color: 'var(--muted)' }}>Submitted {cur.date}, {cur.time} · via resident app · verified resident</span></div>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--ink2)' }}>{cur.body}</div>
                  {cur.photo && <div className="photo-ph" style={{ height: 220 }}>resident photo</div>}
                </div>
                <span className="eyebrow" style={{ marginTop: 4 }}>Conversation</span>
                {cur.thread.filter((t) => !t.event || !t.text.startsWith('Sent to')).length === 0 && <span style={{ color: 'var(--muted)', fontSize: 14 }}>No replies yet.</span>}
                {cur.thread.map((t, i) => t.event
                  ? <div key={i} style={{ fontSize: 13, color: 'var(--muted)', padding: '0 4px' }}>{t.text} · {t.date}</div>
                  : <div key={i} className="card" style={{ padding: 14, background: t.from === 'staff' ? 'var(--brand-xl)' : '#fff' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>{t.from === 'staff' ? `${t.who}, ${deptNames(cur.depts)[0]}` : cur.name} · {t.date}</div>
                      <div style={{ fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{t.text}</div>
                    </div>)}

                {open(cur) && (
                  <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="row-between"><b>Reply to {cur.name.split(' ')[0]}</b>
                      <button className="btn ghost sm" onClick={getDraft} disabled={ai.state === 'loading'}>{ai.state === 'loading' ? 'Drafting…' : 'Draft with Civi'}</button></div>
                    {ai.state === 'ready' && (
                      <div className="ai-box">
                        <span className={'ai-tag' + (ai.source === 'gemini' ? '' : ' kw')}>{ai.source === 'gemini' ? 'Civi drafted this with Gemini. Review before sending.' : 'Template draft (AI unavailable). Review before sending.'}</span>
                        <div style={{ fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{ai.text}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn sm" onClick={() => { setReply(ai.text); setAi({ state: 'idle', text: '', source: '' }); }}>Use and edit</button>
                          <button className="btn ghost sm" onClick={() => setAi({ state: 'idle', text: '', source: '' })}>Discard</button>
                        </div>
                      </div>
                    )}
                    <label className="sr" htmlFor="staff-reply">Reply</label>
                    <textarea id="staff-reply" className="input" style={{ height: 'auto', padding: 12, lineHeight: 1.55, resize: 'vertical' }} rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply. The resident sees it in the app." />
                    <div className="row-between" style={{ flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{cur.status === 'New' ? 'Replying marks this In progress. The resident sees it in the app.' : 'The resident sees this in the app.'}</span>
                      <button className="btn sm" disabled={!reply.trim()} onClick={sendReply}>Send reply</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {open(cur)
                    ? <button className="btn" onClick={() => setStatus('Resolved', 'Marked resolved by ' + D.staff)}>Mark resolved</button>
                    : <button className="btn ghost" onClick={() => setStatus('In progress', 'Reopened by ' + D.staff)}>Reopen</button>}
                  <button className="btn ghost" onClick={() => setReassignOpen((x) => !x)} aria-expanded={reassignOpen}>Reassign to another department</button>
                  {reassignOpen && <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {DEPTS.filter((d) => d.id !== dept).map((d) => <button key={d.id} className="link" style={{ textAlign: 'left', padding: '10px 6px' }} onClick={() => reassign(d.id)}>{d.name}</button>)}
                  </div>}
                </div>
                <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                  <span className="eyebrow">Details</span>
                  <div><b>Location</b><br />{cur.location}</div>
                  {cur.coords && <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}><MapView key={cur.id} pin={cur.coords} height={170} label={'Map pin for ' + cur.location} /></div>}
                  <a href={googleMapsUrl(cur)} target="_blank" rel="noreferrer">Open in Google Maps</a>
                  <div><b>Routed to</b><br />{joinList(deptNames(cur.depts))}</div>
                  <div><b>Summary</b><br />{cur.summary}</div>
                  <span className={'ai-tag' + (cur.source === 'gemini' ? '' : ' kw')}>{cur.source === 'gemini' ? 'Sorted by Civi · Gemini' : 'Sorted by Civi · keyword rules'}</span>
                </div>
                <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                  <span className="eyebrow">Community feed</span>
                  {(() => {
                    const why = !canShare(cur) ? 'Code Enforcement reports are about a specific property, so they are never shared.'
                      : !cur.share?.asked ? 'The resident did not ask to share this report.' : '';
                    return <>
                      <button className="switch" role="switch" aria-checked={!!cur.shared && !why} disabled={!!why} onClick={() => setShared(!cur.shared)}>
                        <span className="track" aria-hidden="true" />Share to community feed
                      </button>
                      {why
                        ? <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{why}</span>
                        : <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Residents see the title, street, department, status and date. Never the resident's name or address. You can turn this off at any time.</span>}
                      {cur.share?.asked && canShare(cur) && <>
                        <span>Reactions the resident picked{cur.share.suggested && cur.share.suggested !== cur.share.set ? ' (changed from the suggestion)' : ''}:</span>
                        <ReactionBar c={cur} keys={postButtons(cur)} />
                        {cur.status === 'Resolved' && <span><b>{reactionCount(cur, 'thanks')}</b> {reactionCount(cur, 'thanks') === 1 ? 'resident' : 'residents'} thanked the crew.</span>}
                      </>}
                    </>;
                  })()}
                </div>
                <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                  <span className="eyebrow">Resident</span>
                  <b>{cur.name}</b><span>{cur.email}</span><span>{cur.phone}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
