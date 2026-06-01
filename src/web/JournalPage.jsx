import React, { useState, useEffect } from 'react';
import { loadJSON, saveJSON, uid } from './storage.js';
import { LS } from './dataModel.js';
import { syncDailyJournalToGitHub } from './obsidian-export.js';

const JOUR_KEY = 'journals';

export default function JournalPage() {
  const [entries, setEntries] = useState(() => loadJSON(JOUR_KEY, []));
  const [text, setText] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

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

  async function syncToday() {
    setSyncing(true);
    setSyncStatus('');
    try {
      const config = loadJSON(LS.aiConfig, {});
      const dateStr = new Date().toISOString().split('T')[0];
      const result = await syncDailyJournalToGitHub(dateStr, config);
      setSyncStatus(result.url ? `Synced to GitHub: ${result.url}` : `Synced ${result.path}`);
    } catch (error) {
      setSyncStatus(error.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="page journal-page">
      <h2>Journal</h2>
      <div className="card journal-card">
        <textarea
          className="journal-input input-glass"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your entry..."
        />
        <div className="journal-toolbar">
          <button className="button button-primary" onClick={add}>Add Entry</button>
          <button className="button button-secondary" onClick={syncToday} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync to GitHub / Obsidian'}
          </button>
        </div>
        {syncStatus && <div className="journal-status text-sm text-secondary">{syncStatus}</div>}
        <p className="text-muted text-xs journal-hint">
          Notes sync straight to your GitHub-backed Obsidian vault. No file download is shown.
        </p>
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
