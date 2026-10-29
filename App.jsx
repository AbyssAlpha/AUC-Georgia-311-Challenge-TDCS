import React, { useEffect, useState } from 'react';
import Resident from './Resident.jsx';
import Staff from './Staff.jsx';
import { resetDemo } from './store.js';

const route = () => (window.location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];

export default function App() {
  const [r, setR] = useState(route());
  useEffect(() => {
    const f = () => setR(route());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  useEffect(() => {
    document.title = r === 'resident' ? 'Report a problem · Mableton 311' : r === 'staff' ? 'Staff portal · Mableton 311' : 'Mableton 311';
  }, [r]);
  if (r === 'resident') return <Resident />;
  if (r === 'staff') return <Staff />;
  return <Home />;
}

function Home() {
  return (
    <div className="landing">
      <div className="landing-inner">
        <div className="brand"><div className="diamond" /><span className="serif" style={{ fontSize: 19 }}>City of Mableton</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="eyebrow">Georgia 311 Challenge · Tiny Desk, Civic Style</span>
          <h1>Report a problem in two minutes. Staff get it already sorted.</h1>
          <p className="lead">
            Residents describe the issue in plain words. Gemini sorts it to the right department and writes it up.
            Staff reply from one inbox, with an AI drafted reply they always review before it is sent.
          </p>
        </div>
        <div className="choices">
          <a className="choice" href="#/resident">
            <span className="eyebrow">Resident</span>
            <h2>Report a problem</h2>
            <p>Mobile app. Chat about the issue, review the drafted complaint, and track replies from the city.</p>
          </a>
          <a className="choice" href="#/staff">
            <span className="eyebrow">City staff</span>
            <h2>Open the staff portal</h2>
            <p>Desktop inbox. See new reports by department, reply, reassign, and resolve.</p>
          </a>
        </div>
        <div className="how">
          <div><b>Sorted on arrival</b><span>Gemini routes each report to one of five departments, or to the right outside agency like Cobb County Water.</span></div>
          <div><b>Safety first</b><span>Emergency words like "I smell gas" are caught on the phone itself and send the resident to 911. No AI is involved in that check.</span></div>
          <div><b>A human approves</b><span>AI only drafts. Nothing reaches a resident until a staff member reads, edits and sends it.</span></div>
        </div>
        <div className="foot">
          <span>Prototype. Names, addresses and complaints are sample data. Free to run on the Gemini API free tier. Uses public information only.</span>
          <button className="btn ghost sm" onClick={() => { resetDemo(); alert('Demo data reset.'); }}>Reset demo data</button>
        </div>
      </div>
    </div>
  );
}
