// Staff view of the Community tab. Staff decide what stays up: AI never removes or approves anything here.
import React, { useState } from 'react';
import { POST_CATS, OTHER_CAT, REPORT_REASONS, REACTIONS, postButtons, reactionCount, publicTitle } from '../shared/data.js';
import { today, patchPost, patchComment } from '../shared/store.js';

const catLabel = (p) => (p.cat === 'other' ? p.custom || 'Other' : (POST_CATS.find((c) => c.id === p.cat) || OTHER_CAT).label);
const pending = (x) => (x.reports || []).length > 0 && x.status !== 'removed';

function Reports({ x }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
      {x.reports.map((r, i) => <span key={i} style={{ color: 'var(--ink3)' }}><b>{r.reason}</b>{r.note ? `: "${r.note}"` : ''} · {r.date}</span>)}
    </div>
  );
}

function Decide({ x, onKeep, onRemove, onRestore, what }) {
  const [why, setWhy] = useState('');
  const [asking, setAsking] = useState(false);
  if (x.status === 'removed') return <button className="btn ghost sm" onClick={onRestore}>Put {what} back up</button>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {pending(x) && <button className="btn ghost sm" onClick={onKeep}>Keep {what} up</button>}
        <button className="btn sm" style={{ background: 'var(--red)' }} onClick={() => setAsking((a) => !a)} aria-expanded={asking}>Take {what} down</button>
      </div>
      {asking && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: 1, minWidth: 200 }}>Reason the poster will see
            <select className="input" value={why} onChange={(e) => setWhy(e.target.value)}>
              <option value="">Choose a reason</option>
              {REPORT_REASONS.map((r) => <option key={r}>{r === 'Something else' ? 'Breaks the community rules' : r}</option>)}
            </select>
          </label>
          <button className="btn sm" style={{ background: 'var(--red)' }} disabled={!why} onClick={() => onRemove(why)}>Confirm take down</button>
        </div>
      )}
    </div>
  );
}

export default function Moderation({ store, update, staff, flash, onOpen }) {
  const [tab, setTab] = useState('review');
  const posts = store.posts || [];
  const queue = [
    ...posts.filter(pending).map((p) => ({ kind: 'post', p, x: p })),
    ...posts.flatMap((p) => p.comments.filter(pending).map((c) => ({ kind: 'comment', p, x: c }))),
  ];
  const shared = store.complaints.filter((c) => c.shared);

  const keep = (p, c) => {
    const fn = (x) => ({ ...x, reports: [], status: 'live', kept: { by: staff, date: today() } });
    c ? patchComment(update, p.id, c.id, fn) : patchPost(update, p.id, fn);
    flash('Kept up. Reports cleared.');
  };
  const remove = (p, c, reason) => {
    const fn = (x) => ({ ...x, reports: [], status: 'removed', removed: { by: staff, reason, date: today() } });
    c ? patchComment(update, p.id, c.id, fn) : patchPost(update, p.id, fn);
    flash((c ? 'Comment' : 'Post') + ' taken down');
  };
  const restore = (p, c) => {
    const fn = (x) => ({ ...x, status: 'live', removed: undefined, kept: { by: staff, date: today() } });
    c ? patchComment(update, p.id, c.id, fn) : patchPost(update, p.id, fn);
    flash('Back up');
  };

  return (
    <div className="content">
      <div><h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.02em' }}>Community</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>Resident posts, reports about them, and city reports shared to the feed.</p></div>
      <div className="filters">
        <button aria-pressed={tab === 'review'} onClick={() => setTab('review')}>Needs review<span className="mono" style={{ fontSize: 12 }}>{queue.length}</span></button>
        <button aria-pressed={tab === 'posts'} onClick={() => setTab('posts')}>All resident posts<span className="mono" style={{ fontSize: 12 }}>{posts.length}</span></button>
        <button aria-pressed={tab === 'shared'} onClick={() => setTab('shared')}>Shared city reports<span className="mono" style={{ fontSize: 12 }}>{shared.length}</span></button>
      </div>

      {tab === 'review' && (
        <>
          {!queue.length && <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Nothing to review. Reported posts and comments show up here.</div>}
          {queue.map(({ kind, p, x }) => (
            <div key={x.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="eyebrow">{kind === 'post' ? 'Post' : 'Comment on a post'} · {catLabel(p)}</span>
                <span className="pill" style={{ background: x.status === 'hidden' ? 'var(--amber-bg)' : 'var(--red-bg)', color: x.status === 'hidden' ? 'var(--amber)' : 'var(--red)' }}>
                  {x.reports.length} report{x.reports.length > 1 ? 's' : ''}{x.status === 'hidden' ? ' · hidden' : ''}
                </span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}><b style={{ color: 'var(--ink2)' }}>{x.by}</b> · {x.date}</span>
              <div style={{ fontSize: 15, lineHeight: 1.55, background: 'var(--row)', borderRadius: 10, padding: 12, overflowWrap: 'anywhere' }}>{x.text}</div>
              <Reports x={x} />
              <Decide x={x} what={kind} onKeep={() => keep(p, kind === 'comment' && x)} onRemove={(r) => remove(p, kind === 'comment' && x, r)} onRestore={() => restore(p, kind === 'comment' && x)} />
            </div>
          ))}
        </>
      )}

      {tab === 'posts' && posts.map((p) => (
        <div key={p.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, opacity: p.status === 'removed' ? 0.7 : 1 }}>
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span className="eyebrow">{catLabel(p)} · {p.by} · {p.area || 'No area'} · {p.date}</span>
            {p.status !== 'live' && <span className="pill" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>{p.status === 'removed' ? 'Taken down: ' + p.removed?.reason : 'Hidden for review'}</span>}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.55, overflowWrap: 'anywhere' }}>{p.text}</div>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{p.tags.map((t) => '#' + t).join(' ')}{p.tags.length ? ' · ' : ''}{p.comments.length} comment{p.comments.length === 1 ? '' : 's'}</span>
          <Decide x={p} what="post" onKeep={() => keep(p)} onRemove={(r) => remove(p, null, r)} onRestore={() => restore(p)} />
        </div>
      ))}

      {tab === 'shared' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {!shared.length && <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>No city reports are shared yet.</div>}
          {shared.map((c) => (
            <button key={c.id} className="list-item" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--line)' }} onClick={() => onOpen(c.id)}>
              <div className="row-between" style={{ width: '100%', gap: 8 }}><b>{publicTitle(c.subject)}</b><span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{c.id} · {c.status}</span></div>
              <span style={{ fontSize: 14, color: 'var(--ink3)' }}>{postButtons(c).map((k) => `${REACTIONS[k].label} ${reactionCount(c, k)}`).join(' · ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
