import React, { useState, useEffect } from 'react';
import { loadJSON } from './storage.js';
import { LS } from './dataModel.js';
import { calculateGoalProgress } from './dataModelAsync.js';

export default function GoalsPage({ projects = [], onAddProject, onUpdateProject }) {
  const [localProjects, setLocalProjects] = useState(projects || []);
  const [name, setName] = useState('');
  const [milestoneInputs, setMilestoneInputs] = useState({});
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    setLocalProjects(projects || []);
  }, [projects]);

  useEffect(() => {
    // refresh progress for visible projects
    (async () => {
      const map = {};
      for (const p of localProjects) {
        try {
          const { progress } = await calculateGoalProgress(p.id);
          map[p.id] = progress;
        } catch (e) {
          map[p.id] = 0;
        }
      }
      setProgressMap(map);
    })();
  }, [localProjects]);

  async function add() {
    const n = (name || '').trim();
    if (!n) return;
    await onAddProject?.(n, null);
    setName('');
    // reload projects from prop on next render
  }

  async function addMilestone(projectId) {
    const text = (milestoneInputs[projectId] || '').trim();
    if (!text) return;
    const updated = (localProjects || []).map(p => {
      if (p.id !== projectId) return p;
      const ms = Array.isArray(p.milestones) ? [...p.milestones, { id: `m-${Date.now()}`, title: text, done: false }] : [{ id: `m-${Date.now()}`, title: text, done: false }];
      return { ...p, milestones: ms };
    });
    // call back to parent to persist
    const proj = updated.find(p => p.id === projectId);
    await onUpdateProject?.(proj);
    setMilestoneInputs(prev => ({ ...prev, [projectId]: '' }));
    setLocalProjects(updated);
  }

  function setMilestoneInput(projectId, val) {
    setMilestoneInputs(prev => ({ ...prev, [projectId]: val }));
  }

  return (
    <div className="page goals-page">
      <h2>Goals</h2>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="New goal name" value={name} onChange={e => setName(e.target.value)} style={{ padding: 8, width: '70%' }} />
        <button className="button button-primary" onClick={add} style={{ marginLeft: 8 }}>Add Goal</button>
      </div>

      <div>
        {(!localProjects || localProjects.length) === 0 ? (
          <p className="text-muted">No goals yet.</p>
        ) : (
          localProjects.map(p => (
            <div key={p.id} className="card small-card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Progress: {progressMap[p.id] ?? 0}%</div>
                </div>
                <div>{p.completed ? 'Done' : ''}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Milestones</div>
                {(p.milestones || []).map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.done ? 'Done' : ''}</div>
                  </div>
                ))}

                <div style={{ display: 'flex', marginTop: 8 }}>
                  <input placeholder="Add milestone" value={milestoneInputs[p.id] || ''} onChange={e => setMilestoneInput(p.id, e.target.value)} style={{ flex: 1, padding: 6 }} />
                  <button className="button button-sm button-primary" onClick={() => addMilestone(p.id)} style={{ marginLeft: 8 }}>Add</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
