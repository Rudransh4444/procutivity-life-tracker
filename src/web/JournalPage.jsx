import React, { useState, useEffect } from 'react';
import { loadJSON, saveJSON, uid } from './storage.js';
import { exportDailyJournal } from './obsidian-export.js';

const JOUR_KEY = 'journals';

export default function JournalPage() {
  const [entries, setEntries] = useState(() => loadJSON(JOUR_KEY, []));
  const [text, setText] = useState('');

  useEffect(() => setEntries(loadJSON(JOUR_KEY, [])), []);

  function add() {
    const t = (text || '').trim();
    if (!t) return;
    const e = { id: uid('j'), content: t, date: new Date().toISOString() };
    const arr = [e, ...entries];
    saveJSON(JOUR_KEY, arr);
    setEntries(arr);
    setText('');
  }

  return (
    <div className="page journal-page">
      <h2>Journal</h2>
      <div style={{ marginBottom: 12 }}>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Write your entry..." style={{ width: '100%', height: 120, padding:8 }} />
        <div style={{ marginTop:8 }}>
          <button className="button button-primary" onClick={add}>Add Entry</button>
          <button className="button button-secondary" style={{ marginLeft:8 }} onClick={()=>exportDailyJournal(new Date().toISOString().split('T')[0])}>Export Today (Obsidian)</button>
        </div>
      </div>

      <div>
        {entries.length === 0 ? <p className="text-muted">No journal entries yet.</p> : entries.map(en => (
          <div key={en.id} className="card small-card" style={{ marginBottom:8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(en.date).toLocaleString()}</div>
            <div style={{ marginTop:6, whiteSpace:'pre-wrap' }}>{en.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
