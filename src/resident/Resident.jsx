import React, { useEffect, useRef, useState } from 'react';
import { DEPTS, OUTSIDE, ME, PIN, deptNames, joinList } from '../shared/data.js';
import { useStore, today, nowTime, patchComplaint } from '../shared/store.js';
import { triage } from '../shared/ai.js';
import { InstallButton } from '../shared/install.jsx';

const STATUS = { Received: ['var(--blue-bg)', 'var(--blue)'], 'In progress': ['var(--amber-bg)', 'var(--amber)'], Resolved: ['var(--ok-bg)', 'var(--green-d)'] };
const residentStatus = (s) => (s === 'New' ? 'Received' : s);
const Pill = ({ status }) => { const s = residentStatus(status); const [bg, fg] = STATUS[s] || STATUS.Received; return <span className="pill" style={{ background: bg, color: fg }}>{s}</span>; };

let uid = 0;
const mk = (m) => ({ ...m, key: ++uid });
const GREET = () => [mk({ from: 'bot', text: `Hi ${ME.name.split(' ')[0]}, I'm Civi. What problem would you like to report? Describe it in your own words.` })];
const QUICK_ISSUES = [
  ["There's a pothole on my street", 'Pothole'],
  ['The streetlight on my street is out', 'Streetlight out'],
  ["There's an overgrown vacant lot on my block", 'Overgrown lot'],
  ['Someone dumped old tires by the road', 'Illegal dumping'],
];

function draftComplaint(s) {
  const n = joinList(deptNames(s.depts));
  const where = s.location.startsWith('Near') ? ' near' + s.location.slice(4) : ' at ' + s.location;
  const issue = s.issue.trim().replace(/([^.!?])$/, '$1.');
  return {
    subject: s.label + where,
    body: `Hello ${n},\n\nI'd like to report a problem. ${issue}\n\nLocation: ${s.location}, Mableton, GA 30126${s.photo ? "\nI've attached a photo." : ''}\n\nCould you let me know when someone can take a look?\n\nThank you,\n${ME.name}`,
  };
}

export default function Resident() {
  const [store, update] = useStore();
  const [screen, setScreen] = useState('signin');
  const [auth, setAuth] = useState({ mode: 'signin', email: ME.email, pw: 'mableton1', name: ME.name, err: '' });
  const [verify, setVerify] = useState({ address: ME.home, zip: '30126', state: 'idle', err: '' });
  const [chat, setChat] = useState({ messages: GREET(), step: 'issue', busy: false, input: '', pinOpen: false });
  const [report, setReport] = useState({ issue: '', depts: [], label: '', summary: '', location: '', photo: false, source: '' });
  const [draft, setDraft] = useState({ subject: '', body: '', addOpen: false });
  const [threadId, setThreadId] = useState(null);
  const [reply, setReply] = useState('');
  const [lastRef, setLastRef] = useState('');
  const chatRef = useRef(null);
  const threadRef = useRef(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const mine = store.complaints.filter((c) => c.email === ME.email);
  const th = mine.find((c) => c.id === threadId);

  useEffect(() => { [chatRef, threadRef].forEach((r) => { if (r.current) r.current.scrollTop = r.current.scrollHeight; }); }, [chat.messages, screen, th?.thread.length]);

  const push = (msgs, patch = {}) => setChat((c) => ({ ...c, messages: [...c.messages, ...msgs.map(mk)], ...patch }));
  const typing = () => setChat((c) => ({ ...c, busy: true, messages: [...c.messages, mk({ from: 'bot', kind: 'typing' })] }));
  const botSay = (msgs, patch = {}) => setChat((c) => ({ ...c, busy: false, messages: [...c.messages.filter((m) => m.kind !== 'typing'), ...msgs.map(mk)], ...patch }));

  async function sayIssue(text) {
    push([{ from: 'user', text }], { input: '' });
    typing();
    const started = Date.now();
    const r = await triage(text);
    const wait = Math.max(0, 700 - (Date.now() - started));
    later(() => {
      if (r.type === 'emergency') { botSay([{ kind: 'emergency' }], { step: 'stopped', outcome: 'emergency' }); return; }
      if (r.type === 'oos') { botSay([{ kind: 'oos', o: OUTSIDE.find((o) => o.id === r.agency) }], { step: 'stopped', outcome: 'oos' }); return; }
      setReport((p) => ({ ...p, issue: text, depts: r.depts, label: r.label, summary: r.summary, source: r.source }));
      botSay([
        { from: 'bot', text: 'Thanks. This sounds like a job for', chips: deptNames(r.depts), source: r.source },
        { from: 'bot', text: 'Where is it? Use your address, drop a pin, or type an address.' },
      ], { step: 'location' });
    }, wait);
  }

  function pickLocation(loc, pin) {
    push([pin ? { from: 'user', kind: 'map', text: loc } : { from: 'user', text: loc }], { input: '', pinOpen: false, step: 'wait' });
    setReport((p) => ({ ...p, location: loc }));
    typing();
    later(() => botSay([{ from: 'bot', text: "Got it. Want to add a photo? It's optional, but it helps the crew find the problem." }], { step: 'photo' }), 700);
  }

  function pickPhoto(add) {
    push([add ? { from: 'user', kind: 'photo' } : { from: 'user', text: 'Skip the photo' }], { step: 'drafting' });
    typing();
    later(() => {
      botSay([{ from: 'bot', text: 'Thanks. Writing up your complaint now…' }]);
      later(() => {
        setReport((p) => { const next = { ...p, photo: add }; setDraft({ ...draftComplaint(next), addOpen: false }); return next; });
        setScreen('review');
      }, 800);
    }, 700);
  }

  function submit() {
    const t = chat.input.trim();
    if (!t || chat.busy) return;
    if (chat.step === 'issue') sayIssue(t);
    else if (chat.step === 'location') pickLocation(t, false);
  }

  function resetChat() {
    timers.current.forEach(clearTimeout);
    setChat({ messages: GREET(), step: 'issue', busy: false, input: '', pinOpen: false });
    setReport({ issue: '', depts: [], label: '', summary: '', location: '', photo: false, source: '' });
    setScreen('chat');
  }

  function setDepts(ids) {
    setReport((p) => ({ ...p, depts: ids }));
    setDraft((d) => ({ ...d, body: d.body.replace(/^Hello [^,\n]*,/, 'Hello ' + (joinList(deptNames(ids)) || 'City of Mableton') + ',') }));
  }

  function send() {
    if (!report.depts.length) return;
    let id;
    update((s) => {
      id = 'MBL-2026-' + String(s.nextRef).padStart(5, '0');
      const c = {
        id, name: ME.name, email: ME.email, phone: ME.phone, subject: draft.subject, summary: report.summary || report.issue.slice(0, 110),
        location: report.location, date: today(), time: nowTime(), status: 'New', depts: [...report.depts], photo: report.photo,
        source: report.source, body: draft.body, thread: [{ event: true, text: 'Sent to ' + joinList(deptNames(report.depts)), date: today() }],
      };
      return { ...s, nextRef: s.nextRef + 1, complaints: [c, ...s.complaints] };
    });
    setLastRef(id);
    setScreen('sent');
  }

  function openThread(id) {
    setThreadId(id); setReply(''); setScreen('thread');
    patchComplaint(update, id, (c) => ({ ...c, unread: false }));
  }

  function sendReply() {
    const t = reply.trim();
    if (!t) return;
    setReply('');
    patchComplaint(update, threadId, (c) => ({ ...c, staffUnread: true, thread: [...c.thread, { from: 'resident', who: ME.name, text: t, date: 'Just now' }] }));
  }

  const tabKey = screen === 'thread' ? 'list' : screen;
  const showTabs = ['chat', 'list', 'depts', 'thread'].includes(screen);

  return (
    <div className="phone-wrap">
      <div className="phone" role="application" aria-label="Civi resident app">
        <div className="appbar">
          <a href="#/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}><div className="diamond" /><span className="serif" style={{ fontSize: 20 }}>Civi</span></a>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><InstallButton small /><span className="eyebrow">Mableton</span></span>
        </div>

        {screen === 'signin' && <SignIn auth={auth} setAuth={setAuth} onDone={(create) => (create ? setScreen('verify') : resetChat())} />}
        {screen === 'verify' && <Verify v={verify} setV={setVerify} later={later} onDone={resetChat} />}

        {screen === 'chat' && (
          <>
            <div className="chat" ref={chatRef} aria-live="polite">
              {chat.messages.map((m) => <ChatMsg key={m.key} m={m} onRestart={resetChat} />)}
            </div>
            {!chat.busy && (
              <div className="quick">
                {chat.step === 'issue' && QUICK_ISSUES.map(([t, l]) => <button key={l} onClick={() => sayIssue(t)}>{l}</button>)}
                {chat.step === 'location' && <>
                  <button onClick={() => pickLocation(ME.home, false)}>Use my address: {ME.home}</button>
                  <button onClick={() => setChat((c) => ({ ...c, pinOpen: true }))}>Drop a pin on the map</button>
                </>}
                {chat.step === 'photo' && <><button onClick={() => pickPhoto(true)}>Add a photo</button><button onClick={() => pickPhoto(false)}>Skip</button></>}
                {chat.step === 'stopped' && <button onClick={resetChat}>Report something else</button>}
              </div>
            )}
            <div className="composer">
              <label className="sr" htmlFor="chat-in">Message</label>
              <input id="chat-in" value={chat.input} onChange={(e) => setChat((c) => ({ ...c, input: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && submit()} disabled={chat.busy || !['issue', 'location'].includes(chat.step)}
                placeholder={{ issue: 'Describe the problem…', location: 'Or type an address…', photo: 'Choose an option above', drafting: 'Drafting…', wait: '…' }[chat.step] || (chat.outcome === 'emergency' ? 'Report stopped. Call 911 if in danger.' : 'Chat ended. Nothing was sent.')} />
              <button aria-label="Send" onClick={submit} disabled={chat.busy || !chat.input.trim() || !['issue', 'location'].includes(chat.step)}>↑</button>
            </div>
            {chat.pinOpen && (
              <div className="sheet-bg" onClick={() => setChat((c) => ({ ...c, pinOpen: false }))}>
                <div className="sheet" onClick={(e) => e.stopPropagation()}>
                  <b>Drop a pin</b>
                  <div className="map-art" style={{ height: 180, borderRadius: 12 }} />
                  <span style={{ color: 'var(--muted)', fontSize: 14 }}>{PIN}, Mableton, GA 30126</span>
                  <button className="btn" onClick={() => pickLocation(PIN, true)}>Use this location</button>
                  <button className="link" onClick={() => setChat((c) => ({ ...c, pinOpen: false }))}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}

        {screen === 'review' && (
          <div className="screen"><div className="pad">
            <div><span className="eyebrow">Step 3 of 3</span><h2 style={{ margin: '6px 0 4px', fontSize: 22 }}>Review your complaint</h2>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.5 }}>We wrote this from your chat. Change anything before you send it.</p></div>
            <div className="field"><span>Send to</span>
              <div className="chips" style={{ marginTop: 0 }}>
                {report.depts.map((id) => <button key={id} className="chip" aria-label={'Remove ' + deptNames([id])[0]} onClick={() => setDepts(report.depts.filter((x) => x !== id))}>{deptNames([id])[0]} ✕</button>)}
                {report.depts.length < DEPTS.length && <button className="chip" style={{ background: '#fff', border: '1.5px dashed var(--line2)', color: 'var(--ink3)' }} onClick={() => setDraft((d) => ({ ...d, addOpen: !d.addOpen }))}>+ Add department</button>}
              </div>
              {draft.addOpen && <div className="card" style={{ padding: 6, display: 'flex', flexDirection: 'column' }}>
                {DEPTS.filter((d) => !report.depts.includes(d.id)).map((d) => <button key={d.id} className="link" style={{ textAlign: 'left', padding: 10 }} onClick={() => { setDepts([...report.depts, d.id]); setDraft((x) => ({ ...x, addOpen: false })); }}>{d.name}</button>)}
              </div>}
              {!report.depts.length && <span className="err">Pick at least one department.</span>}
              <span className={'ai-tag' + (report.source === 'gemini' ? '' : ' kw')} style={{ fontWeight: 500 }}>{report.source === 'gemini' ? 'Sorted by Gemini. You can change it.' : 'Sorted by keyword rules. You can change it.'}</span>
            </div>
            <label className="field">Subject<input value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} /></label>
            <label className="field">Message<textarea rows={10} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} /></label>
            {report.photo && <div className="photo-ph" style={{ height: 120 }}>your photo</div>}
            <button className="btn" disabled={!report.depts.length} onClick={send}>
              {report.depts.length === 1 ? 'Send to ' + deptNames(report.depts)[0] : report.depts.length ? `Send to ${report.depts.length} departments` : 'Send'}
            </button>
            <button className="link" onClick={resetChat}>Start over</button>
          </div></div>
        )}

        {screen === 'sent' && (
          <div className="screen"><div className="pad" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 60 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-l)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>✓</div>
            <h2 style={{ margin: 0 }}>Complaint sent</h2>
            <p style={{ margin: 0, color: 'var(--ink3)', lineHeight: 1.55 }}>{joinList(deptNames(report.depts))} will reply in the app. Most reports get a first reply within 2 business days.</p>
            <div className="card" style={{ padding: '12px 18px' }}><span className="eyebrow">Reference</span><div className="mono" style={{ fontSize: 18, marginTop: 4 }}>{lastRef}</div></div>
            <button className="btn" style={{ width: '100%' }} onClick={() => openThread(lastRef)}>View my complaint</button>
            <button className="btn ghost" style={{ width: '100%' }} onClick={resetChat}>Report something else</button>
          </div></div>
        )}

        {screen === 'list' && (
          <div className="screen"><div className="pad">
            <h2 style={{ margin: 0, fontSize: 22 }}>My complaints</h2>
            {mine.length === 0 && <p style={{ color: 'var(--muted)' }}>Nothing yet.</p>}
            {mine.map((c) => (
              <button key={c.id} className="list-item" onClick={() => openThread(c.id)}>
                <div className="row-between"><span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{c.id}</span><Pill status={c.status} /></div>
                <b style={{ fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>{c.unread && <span className="dot" style={{ background: 'var(--blue)' }} aria-label="New reply" />}{c.subject}</b>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>{joinList(deptNames(c.depts))} · {c.date}</span>
              </button>
            ))}
          </div></div>
        )}

        {screen === 'thread' && th && (
          <>
            <div className="screen" ref={threadRef}><div className="pad">
              <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setScreen('list')}>← My complaints</button>
              <div className="row-between"><span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{th.id}</span><Pill status={th.status} /></div>
              <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.3 }}>{th.subject}</h2>
              <div className="msg me" style={{ alignSelf: 'stretch', maxWidth: 'none' }}><small>You · {th.date}</small>{th.body}</div>
              {th.thread.map((r, i) => r.event
                ? <div key={i} className="event">{r.text} · {r.date}</div>
                : <div key={i} className={'msg ' + (r.from === 'staff' ? 'dept' : 'me')}><small>{r.from === 'staff' ? `${r.who}, ${deptNames(th.depts)[0]}` : 'You'} · {r.date}</small>{r.text}</div>)}
            </div></div>
            {th.status !== 'Resolved' && (
              <div className="composer">
                <label className="sr" htmlFor="reply-in">Reply</label>
                <input id="reply-in" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()} placeholder={'Reply to ' + deptNames(th.depts)[0] + '…'} />
                <button aria-label="Send reply" onClick={sendReply} disabled={!reply.trim()}>↑</button>
              </div>
            )}
          </>
        )}

        {screen === 'depts' && (
          <div className="screen"><div className="pad">
            <h2 style={{ margin: 0, fontSize: 22 }}>City departments</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.5 }}>You don't need to know who handles what. The app sorts it for you. Here is who is who.</p>
            {DEPTS.map((d) => <div key={d.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}><b>{d.name}</b><span style={{ lineHeight: 1.5, color: 'var(--ink3)' }}>{d.desc}</span><span style={{ fontSize: 13, color: 'var(--muted)' }}>For example: {d.ex}</span></div>)}
            <span className="eyebrow" style={{ marginTop: 8 }}>Handled outside the city</span>
            {OUTSIDE.map((o) => <div key={o.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}><b>{o.short}</b><span style={{ lineHeight: 1.5, color: 'var(--ink3)' }}>{o.agency}</span><a href={o.url} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}>Visit website</a></div>)}
            <div className="alert red"><b>Emergencies</b><span>For fire, a gas smell, a crime in progress or anyone hurt, call 911.</span></div>
          </div></div>
        )}

        {showTabs && (
          <nav className="tabs" aria-label="Main">
            {[['chat', 'Report'], ['list', 'My complaints'], ['depts', 'Departments']].map(([k, l]) => (
              <button key={k} aria-current={tabKey === k ? 'page' : undefined} onClick={() => (k === 'chat' && ['stopped', 'drafting'].includes(chat.step) ? resetChat() : setScreen(k))}>
                {l}{k === 'list' && mine.some((c) => c.unread) ? ' •' : ''}
              </button>
            ))}
          </nav>
        )}
      </div>
      <aside className="side-note">
        <span className="eyebrow">Demo tips</span>
        <span>Try typing "pothole", "overgrown lot", "my water bill is too high" (outside agency) or "I smell gas" (emergency).</span>
        <span>Open the <a href="#/staff" target="_blank" rel="noreferrer">staff portal</a> in another tab. Your report shows up there, and staff replies show up here.</span>
        <span>Residency check and sign in are placeholders until the city picks a method.</span>
      </aside>
    </div>
  );
}

function ChatMsg({ m, onRestart }) {
  if (m.kind === 'typing') return <div className="bubble bot typing" aria-label="Typing"><i /><i /><i /></div>;
  if (m.kind === 'map') return <div className="map-msg"><div className="map-art" /><div style={{ padding: '8px 12px', fontSize: 14 }}>{m.text}</div></div>;
  if (m.kind === 'photo') return <div className="photo-ph" style={{ alignSelf: 'flex-end', width: 200, height: 130 }}>photo attached</div>;
  if (m.kind === 'emergency') return (
    <div className="alert red" role="alert">
      <b style={{ fontSize: 17 }}>This may be an emergency</b>
      <span>If anyone could be in danger, call 911 now. This app is not watched around the clock, so we have not sent anything.</span>
      <a className="btn" href="tel:911" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'var(--red)' }}>Call 911</a>
      <span style={{ fontSize: 14 }}>For a gas smell, you can also call Atlanta Gas Light at <a href="tel:18774274321">877-427-4321</a> after you are safe.</span>
      <button className="link" style={{ alignSelf: 'flex-start' }} onClick={onRestart}>It's not an emergency. Start over.</button>
    </div>
  );
  if (m.kind === 'oos') {
    const o = m.o || OUTSIDE[0];
    return (
      <div className="alert amber">
        <b>The city can't handle this one</b>
        <span>{o.what} We haven't sent anything.</span>
        <a className="btn ghost sm" href={o.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Go to {o.agency}</a>
      </div>
    );
  }
  return (
    <div className={'bubble ' + (m.from === 'user' ? 'user' : 'bot')}>
      {m.text}
      {m.chips && <div className="chips">{m.chips.map((c) => <span key={c} className="chip">{c}</span>)}</div>}
      {m.source && <div className={'ai-tag' + (m.source === 'gemini' ? '' : ' kw')} style={{ marginTop: 8 }}>{m.source === 'gemini' ? 'Sorted by Gemini' : 'Sorted by keywords'}</div>}
    </div>
  );
}

function SignIn({ auth, setAuth, onDone }) {
  const set = (k) => (e) => setAuth((a) => ({ ...a, [k]: e.target.value }));
  const create = auth.mode === 'create';
  function go(e) {
    e.preventDefault();
    if (create) {
      if (!auth.name.trim() || !/@/.test(auth.email) || auth.pw.length < 8) return setAuth((a) => ({ ...a, err: 'Enter your name, an email, and a password of at least 8 characters.' }));
    } else if (!/@/.test(auth.email) || !auth.pw) return setAuth((a) => ({ ...a, err: 'Enter your email and password.' }));
    setAuth((a) => ({ ...a, err: '' }));
    onDone(create);
  }
  return (
    <form className="screen" onSubmit={go}><div className="pad" style={{ paddingTop: 36 }}>
      <div><h1 className="serif" style={{ margin: 0, fontSize: 28 }}>{create ? 'Create your account' : 'Report a problem to the city'}</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--ink3)', lineHeight: 1.55 }}>{create ? 'For Mableton residents. We check your address once.' : 'Potholes, streetlights, overgrown lots and more. We send it to the right department.'}</p></div>
      {create && <label className="field">Full name<input value={auth.name} onChange={set('name')} autoComplete="name" /></label>}
      <label className="field">Email<input type="email" value={auth.email} onChange={set('email')} autoComplete="email" /></label>
      <label className="field">Password<input type="password" value={auth.pw} onChange={set('pw')} autoComplete={create ? 'new-password' : 'current-password'} /></label>
      {auth.err && <span className="err" role="alert">{auth.err}</span>}
      <button className="btn" type="submit">{create ? 'Continue' : 'Sign in'}</button>
      <button className="link" type="button" onClick={() => setAuth((a) => ({ ...a, mode: create ? 'signin' : 'create', err: '' }))}>{create ? 'I already have an account' : 'New here? Create an account'}</button>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>Demo account is filled in. Sign in is a placeholder for the prototype.</p>
    </div></form>
  );
}

function Verify({ v, setV, later, onDone }) {
  function go(e) {
    e.preventDefault();
    if (!v.address.trim() || !/^\d{5}$/.test(v.zip)) return setV((x) => ({ ...x, err: 'Enter your street address and 5 digit ZIP code.' }));
    setV((x) => ({ ...x, err: '', state: 'checking' }));
    later(() => setV((x) => ({ ...x, state: 'done' })), 1100);
  }
  return (
    <form className="screen" onSubmit={go}><div className="pad" style={{ paddingTop: 36 }}>
      <div><h1 className="serif" style={{ margin: 0, fontSize: 26 }}>Verify your address</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--ink3)', lineHeight: 1.55 }}>This helps the city know reports come from residents. Placeholder until the city chooses a method.</p></div>
      <label className="field">Street address<input value={v.address} onChange={(e) => setV((x) => ({ ...x, address: e.target.value }))} autoComplete="street-address" /></label>
      <label className="field">ZIP code<input inputMode="numeric" value={v.zip} onChange={(e) => setV((x) => ({ ...x, zip: e.target.value.replace(/\D/g, '').slice(0, 5) }))} autoComplete="postal-code" /></label>
      {v.err && <span className="err" role="alert">{v.err}</span>}
      {v.state === 'done'
        ? <><div className="alert" style={{ background: 'var(--ok-bg)' }}><b>You're verified</b><span>{v.address}, Mableton, GA {v.zip}</span></div><button className="btn" type="button" onClick={onDone}>Start a report</button></>
        : <button className="btn" type="submit" disabled={v.state === 'checking'}>{v.state === 'checking' ? 'Checking…' : 'Verify address'}</button>}
    </div></form>
  );
}
