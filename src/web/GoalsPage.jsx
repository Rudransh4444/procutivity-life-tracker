import React, { useState, useEffect } from 'react';
import { loadJSON, saveJSON, uid } from './storage.js';
import { LS } from './dataModel.js';

export default function GoalsPage({ projects, onAddProject }) {
  const [localProjects, setLocalProjects] = useState(() => loadJSON(LS.projects, projects || []));
  const [name, setName] = useState('');

  useEffect(() => {
    setLocalProjects(loadJSON(LS.projects, projects || []));
  }, [projects]);

  function add() {
    const n = (name || '').trim();
    if (!n) return;
    const p = { id: uid('goal'), name: n, milestones: [], createdAt: new Date().toISOString(), completed: false };
    const arr = [p, ...localProjects];
    setLocalProjects(arr);
    saveJSON(LS.projects, arr);
    setName('');
    onAddProject?.(p.name, null);
  }

  return (
    <div className="page goals-page">
      <h2>Goals</h2>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="New goal name" value={name} onChange={e => setName(e.target.value)} style={{ padding: 8, width: '70%' }} />
        <button className="button button-primary" onClick={add} style={{ marginLeft: 8 }}>Add Goal</button>
      </div>

      <div>
        {localProjects.length === 0 ? (
          <p className="text-muted">No goals yet.</p>
        ) : (
          localProjects.map(p => (
            <div key={p.id} className="card small-card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{p.name}</div>
                <div>{p.completed ? 'Done' : ''}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
