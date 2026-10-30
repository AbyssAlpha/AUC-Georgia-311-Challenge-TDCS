// Community tab. Two feeds in one place:
// City reports: reports staff approved for sharing, with the reactions the resident picked. Never a name or house number.
// Neighbor posts: residents post to each other. Anyone can report a post or comment, and city staff decide what stays up.
import React, { useMemo, useState } from 'react';
import { ME, EMERG, POST_CATS, OTHER_CAT, REPORT_REASONS, HIDE_AT, deptNames, joinList, postButtons, canShare, publicBlock, publicTitle } from '../shared/data.js';
import { useStore, today, nowTime, toggleReaction, patchPost, patchComment } from '../shared/store.js';
import { ReactionBar, Icon } from '../shared/reactions.jsx';
import { CityMap, STATUS_COLORS, blockCoords } from '../shared/map.jsx';

const ME_SHORT = ME.name.split(' ')[0] + ' ' + ME.name.split(' ')[1][0] + '.';
const STATUS = { New: ['var(--blue-bg)', 'var(--blue)', 'Received'], 'In progress': ['var(--amber-bg)', 'var(--amber)', 'In progress'], Resolved: ['var(--ok-bg)', 'var(--green-d)', 'Resolved'] };
const catOf = (p) => (p.cat === 'other' ? { ...OTHER_CAT, label: p.custom || 'Other' } : POST_CATS.find((c) => c.id === p.cat) || OTHER_CAT);
const visible = (x) => x.status === 'live' || x.email === ME.email;
const reporters = (x) => new Set((x.reports || []).map((r) => r.by)).size;
const RACE = /\b(black|white|hispanic|latino|latina|latinx|asian|arab|mexican|african|middle eastern|indian|brown[- ]skinned|dark[- ]skinned|light[- ]skinned)\b/i;

export default function Community() {
  const [feed, setFeed] = useState('reports');
  return (
    <div className="screen"><div className="pad">
      <div><h2 style={{ margin: 0, fontSize: 22 }}>Community</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', lineHeight: 1.5 }}>What neighbors in Mableton are seeing and sharing.</p></div>
      <div className="filters" role="group" aria-label="Feed">
        <button aria-pressed={feed === 'reports'} onClick={() => setFeed('reports')}>City reports</button>
        <button aria-pressed={feed === 'posts'} onClick={() => setFeed('posts')}>Neighbor posts</button>
        <button aria-pressed={feed === 'map'} onClick={() => setFeed('map')}>Map</button>
      </div>
      {feed === 'reports' ? <CityReports /> : feed === 'posts' ? <NeighborPosts /> : <ReportsMap />}
    </div></div>
  );
}

function CityReports() {
  const [store, update] = useStore();
  const shared = store.complaints.filter((c) => c.shared && c.share?.asked && canShare(c));
  return (
    <>
      <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>City staff approve every report shown here. Names and addresses are never shown.</span>
      {!shared.length && <p style={{ color: 'var(--muted)' }}>Nothing shared yet.</p>}
      {shared.map((c) => {
        const [bg, fg, label] = STATUS[c.status] || STATUS.New;
        return (
          <article key={c.id} className="post" aria-label={publicTitle(c.subject)}>
            <div className="row-between" style={{ gap: 10, alignItems: 'flex-start' }}>
              <b style={{ fontSize: 16, lineHeight: 1.35 }}>{publicTitle(c.subject)}</b>
              <span className="pill" style={{ background: bg, color: fg, flex: 'none' }}>{label}</span>
            </div>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>Near {publicBlock(c.location)} · {joinList(deptNames(c.depts))} · {c.date}</span>
            <ReactionBar c={c} keys={postButtons(c)} me={ME.email} onTap={(k) => toggleReaction(update, c.id, k, ME.email)} />
          </article>
        );
      })}
    </>
  );
}

// View only. Same rules as the City reports feed, and each pin is rounded to about a block.
function ReportsMap() {
  const [store] = useStore();
  const [resolved, setResolved] = useState(false);
  const all = useMemo(() => store.complaints
    .filter((c) => c.shared && c.share?.asked && canShare(c) && c.coords)
    .map((c) => ({
      id: c.id, status: c.status, coords: blockCoords(c.coords),
      pop: { title: publicTitle(c.subject), line: `${(STATUS[c.status] || STATUS.New)[2]} · Near ${publicBlock(c.location)}`, small: `${joinList(deptNames(c.depts))} · ${c.date}` },
    })), [store.complaints]);
  const shown = useMemo(() => all.filter((c) => resolved || c.status !== 'Resolved'), [all, resolved]);
  const noPin = store.complaints.filter((c) => c.shared && c.share?.asked && canShare(c) && !c.coords).length;
  return (
    <>
      <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Shared city reports on a map. Pins show the block, not the exact spot. Tap a pin for details.</span>
      <label className="check-row" style={{ alignItems: 'center' }}>
        <input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} /><span>Show resolved</span>
      </label>
      <CityMap reports={shown} alerts={NO_ALERTS} height={380} />
      <div className="legend" aria-label="Map key">
        {Object.entries(STATUS_COLORS).filter(([s]) => resolved || s !== 'Resolved').map(([s, col]) => <span key={s}><i style={{ background: col }} />{(STATUS[s] || STATUS.New)[2]} ({shown.filter((c) => c.status === s).length})</span>)}
      </div>
      {noPin > 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{noPin} shared report{noPin > 1 ? 's have' : ' has'} no pin and only appear{noPin > 1 ? '' : 's'} in City reports.</span>}
    </>
  );
}
const NO_ALERTS = [];

function NeighborPosts() {
  const [store, update] = useStore();
  const [cat, setCat] = useState('all');
  const [tag, setTag] = useState('');
  const [composing, setComposing] = useState(false);
  const posts = (store.posts || []).filter(visible)
    .filter((p) => cat === 'all' || p.cat === cat || (cat === 'other' && p.cat === 'other'))
    .filter((p) => !tag || p.tags.includes(tag));

  if (composing) return <Compose onDone={(p) => { if (p) update((s) => ({ ...s, posts: [p, ...(s.posts || [])] })); setComposing(false); }} />;
  return (
    <>
      <button className="btn" onClick={() => setComposing(true)}>New post</button>
      <div className="filters hscroll" role="group" aria-label="Category">
        <button aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
        {[...POST_CATS, OTHER_CAT].map((c) => <button key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>)}
      </div>
      {tag && <div><button className="chip" onClick={() => setTag('')} aria-label={'Clear tag ' + tag}>#{tag} ✕</button></div>}
      {!posts.length && <p style={{ color: 'var(--muted)' }}>No posts here yet.</p>}
      {posts.map((p) => <Post key={p.id} p={p} update={update} onTag={setTag} />)}
    </>
  );
}

function ReportForm({ onSend, onCancel, what }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="ai-box" style={{ gap: 6 }}>
      <b style={{ fontSize: 14 }}>Why are you reporting this {what}?</b>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>City staff review every report and decide what to do.</span>
      {REPORT_REASONS.map((r) => (
        <label key={r} className="check-row" style={{ alignItems: 'center', minHeight: 40 }}>
          <input type="radio" name={'why-' + what} checked={reason === r} onChange={() => setReason(r)} /><span>{r}</span>
        </label>
      ))}
      <label className="field" style={{ fontWeight: 400 }}><span className="sr">Anything staff should know</span>
        <input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything staff should know (optional)" /></label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn sm" disabled={!reason} onClick={() => onSend({ by: ME.email, reason, note: note.trim(), date: today() })}>Send to staff</button>
        <button className="btn ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// Adds a report. Enough reports from different neighbors hide it until staff review it.
const withReport = (x, r) => {
  const reports = [...(x.reports || []).filter((y) => y.by !== r.by), r];
  const hide = x.status === 'live' && !x.kept && new Set(reports.map((y) => y.by)).size >= HIDE_AT;
  return { ...x, reports, status: hide ? 'hidden' : x.status };
};

function Post({ p, update, onTag }) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [comment, setComment] = useState('');
  const [reportingC, setReportingC] = useState('');
  const [thanks, setThanks] = useState('');
  const cat = catOf(p);
  const mine = p.email === ME.email;
  const reported = (p.reports || []).some((r) => r.by === ME.email);
  const comments = p.comments.filter((c) => c.status !== 'hidden' || c.email === ME.email);

  function addComment() {
    const t = comment.trim();
    if (!t) return;
    setComment('');
    patchPost(update, p.id, (x) => ({ ...x, comments: [...x.comments, { id: 'C-' + Date.now(), by: ME_SHORT, email: ME.email, text: t.slice(0, 400), date: today(), reports: [], status: 'live' }] }));
  }

  return (
    <article className="post" aria-label={cat.label + ' post by ' + p.by}>
      {p.status === 'removed' && mine && <div className="alert red"><b>Removed by city staff</b><span>Reason: {p.removed?.reason}. Only you can see this post now.</span></div>}
      {p.status === 'hidden' && mine && <div className="alert amber"><b>Hidden while staff review it</b><span>Neighbors reported this post. City staff will decide if it goes back up.</span></div>}
      <div className="row-between" style={{ gap: 8 }}>
        <span className="cat" style={{ background: cat.color }}>{cat.label}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.date}, {p.time}</span>
      </div>
      <span style={{ fontSize: 14, color: 'var(--muted)' }}><b style={{ color: 'var(--ink2)' }}>{p.by}</b>{p.area ? ' · ' + p.area : ''}</span>
      <div style={{ fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.text}</div>
      {p.tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{p.tags.map((t) => <button key={t} className="tag" onClick={() => onTag(t)}>#{t}</button>)}</div>}
      <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--line)', paddingTop: 4, flexWrap: 'wrap' }}>
        <button className="icon-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Icon name="comment" />{comments.length} comment{comments.length === 1 ? '' : 's'}</button>
        {!mine && p.status === 'live' && (reported
          ? <span className="icon-btn" style={{ color: 'var(--muted)' }}>Reported to staff</span>
          : <button className="icon-btn" aria-expanded={reporting} onClick={() => setReporting((r) => !r)}><Icon name="flag" />Report</button>)}
      </div>
      {reporting && <ReportForm what="post" onCancel={() => setReporting(false)} onSend={(r) => { patchPost(update, p.id, (x) => withReport(x, r)); setReporting(false); setThanks('Thanks. City staff will review this post.'); }} />}
      {thanks && <span role="status" style={{ fontSize: 14, color: 'var(--green-d)' }}>{thanks}</span>}
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ background: 'var(--row)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {c.status === 'removed'
                ? <span style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>This comment was removed by city staff.</span>
                : <>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}><b style={{ color: 'var(--ink2)' }}>{c.by}</b> · {c.date}{c.status === 'hidden' ? ' · hidden while staff review it' : ''}</span>
                    <span style={{ fontSize: 15, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{c.text}</span>
                    {c.email !== ME.email && c.status === 'live' && ((c.reports || []).some((r) => r.by === ME.email)
                      ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>Reported to staff</span>
                      : <button className="link" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '6px 0' }} onClick={() => setReportingC(reportingC === c.id ? '' : c.id)}>Report comment</button>)}
                    {reportingC === c.id && <ReportForm what="comment" onCancel={() => setReportingC('')} onSend={(r) => { patchComment(update, p.id, c.id, (x) => withReport(x, r)); setReportingC(''); setThanks('Thanks. City staff will review that comment.'); }} />}
                  </>}
            </div>
          ))}
          {p.status === 'live' && (
            <div className="composer" style={{ padding: 0, background: 'none', border: 'none' }}>
              <label className="sr" htmlFor={'cm-' + p.id}>Write a comment</label>
              <input id={'cm-' + p.id} value={comment} maxLength={400} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="Write a comment…" />
              <button aria-label="Post comment" onClick={addComment} disabled={!comment.trim()}>↑</button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Compose({ onDone }) {
  const [f, setF] = useState({ cat: '', custom: '', area: '', text: '', tags: '', ok911: false });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const tags = [...new Set(f.tags.split(/[\s,]+/).map((t) => t.replace(/^#/, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)).filter(Boolean))].slice(0, 5);
  const emergency = EMERG.test(f.text);
  const ready = f.cat && (f.cat !== 'other' || f.custom.trim()) && f.text.trim().length >= 10 && (!emergency || f.ok911);

  function post() {
    if (!ready) return;
    onDone({
      id: 'P-' + Date.now(), by: ME_SHORT, email: ME.email, area: f.area.trim() ? publicBlock(f.area.trim()).slice(0, 40) : '',
      cat: f.cat, custom: f.cat === 'other' ? f.custom.trim().slice(0, 30) : undefined,
      date: today(), time: nowTime(), text: f.text.trim().slice(0, 600), tags, reports: [], status: 'live', comments: [],
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <b style={{ fontSize: 18 }}>New post</b>
      <label className="field">Category
        <select className="input" value={f.cat} onChange={set('cat')}>
          <option value="">Choose a category</option>
          {POST_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          <option value="other">Other (name your own)</option>
        </select>
      </label>
      {f.cat === 'other' && <label className="field">Your category<input maxLength={30} value={f.custom} onChange={set('custom')} placeholder="For example: Garden club" /></label>}
      {f.cat === 'missing-person' && <div className="alert red"><b>Call 911 first</b><span>Police can start searching right away. A post helps neighbors keep watch.</span><a href="tel:911">Call 911</a></div>}
      {f.cat === 'suspicious' && <div className="alert amber"><b>Describe what the person did</b><span>Say what you saw them do, where, and when. Clothing can help. Race or appearance alone does not, and can cause harm. If a crime is happening now, call 911.</span></div>}
      <label className="field">What's happening?<textarea rows={5} maxLength={600} value={f.text} onChange={set('text')} /></label>
      {f.cat === 'suspicious' && RACE.test(f.text) && <span className="err" role="status">Your post mentions race or ethnicity. Please focus on what the person did instead.</span>}
      {emergency && (
        <div className="alert red" role="alert">
          <b>This may be an emergency</b>
          <span>If anyone could be in danger now, call 911 before posting. Neighbors and city staff do not watch this feed around the clock.</span>
          <a className="btn" href="tel:911" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'var(--red)' }}>Call 911</a>
          <label className="check-row"><input type="checkbox" checked={f.ok911} onChange={(e) => setF((x) => ({ ...x, ok911: e.target.checked }))} /><span>I already called, or it is not an emergency</span></label>
        </div>
      )}
      <label className="field">Street or area (optional)<input maxLength={40} value={f.area} onChange={set('area')} placeholder="For example: Floyd Rd. No house numbers." /></label>
      <label className="field">Tags (optional)<input value={f.tags} onChange={set('tags')} placeholder="For example: dog, floydrd" /></label>
      {tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{tags.map((t) => <span key={t} className="tag" style={{ display: 'inline-flex', alignItems: 'center' }}>#{t}</span>)}</div>}
      <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Neighbors see your first name and last initial. Be kind. City staff can take down posts that break the rules.</span>
      <button className="btn" disabled={!ready} onClick={post}>Post</button>
      <button className="link" onClick={() => onDone(null)}>Cancel</button>
    </div>
  );
}
