import React, { useState, useEffect } from 'react';
import { loadJSON } from './storage.js';
import { LS } from './dataModel.js';
import { calculateGoalProgress, getTasks, updateTask, addTask } from './dataModelAsync.js';

export default function GoalsPage({ projects = [], onAddProject, onUpdateProject }) {
  const [localProjects, setLocalProjects] = useState(projects || []);
  const [name, setName] = useState('');
  const [milestoneInputs, setMilestoneInputs] = useState({});
  const [progressMap, setProgressMap] = useState({});
  const [allTasks, setAllTasks] = useState([]);
  const [linkSelection, setLinkSelection] = useState({});

  useEffect(() => {
    setLocalProjects(projects || []);
  }, [projects]);

  useEffect(() => {
    // refresh tasks and progress for visible projects
    (async () => {
      try {
        const tasks = await getTasks();
        setAllTasks(tasks || []);
      } catch (e) {
        setAllTasks([]);
      }

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
    // parent will pass updated projects via props
  }

  async function addMilestone(projectId) {
    const text = (milestoneInputs[projectId] || '').trim();
    if (!text) return;
    const updated = (localProjects || []).map(p => {
      if (p.id !== projectId) return p;
      const ms = Array.isArray(p.milestones) ? [...p.milestones, { id: `m-${Date.now()}`, title: text, done: false }] : [{ id: `m-${Date.now()}`, title: text, done: false }];
      return { ...p, milestones: ms };
    });
    const proj = updated.find(p => p.id === projectId);
    await onUpdateProject?.(proj);
    setMilestoneInputs(prev => ({ ...prev, [projectId]: '' }));
    setLocalProjects(updated);
  }

  // Quick-create a task linked to this goal
  async function quickCreateTask(projectId) {
    const key = `quick-${projectId}`;
    const title = (milestoneInputs[key] || '').trim();
    if (!title) return;
    try {
      const t = await addTask({ title, goalId: projectId, date: new Date().toISOString().split('T')[0], status: 'todo', weight: 1 });
      const tasks = await getTasks();
      setAllTasks(tasks || []);
      // refresh progress
      const { progress } = await calculateGoalProgress(projectId);
      setProgressMap(prev => ({ ...prev, [projectId]: progress }));
      setMilestoneInputs(prev => ({ ...prev, [key]: '' }));
    } catch (e) {
      console.error('quickCreateTask failed', e);
    }
  }

  function setMilestoneInput(projectId, val) {
    setMilestoneInputs(prev => ({ ...prev, [projectId]: val }));
  }

  async function toggleMilestoneDone(projectId, milestoneId) {
    const p = localProjects.find(x => x.id === projectId);
    if (!p) return;
    const ms = (p.milestones || []).map(m => m.id === milestoneId ? { ...m, done: !m.done } : m);
    const updated = { ...p, milestones: ms };
    await onUpdateProject?.(updated);
    setLocalProjects(prev => prev.map(pp => pp.id === projectId ? updated : pp));
  }

  function linkedTasksFor(goalId) {
    return (allTasks || []).filter(t => t.goalId === goalId);
  }

  function availableTasksFor(goalId) {
    // tasks without a goal or already linked to this goal
    return (allTasks || []).filter(t => !t.goalId || t.goalId === goalId);
  }

  async function linkTask(projectId, taskId) {
    try {
      await updateTask(taskId, { goalId: projectId });
      const tasks = await getTasks();
      setAllTasks(tasks || []);
      const { progress } = await calculateGoalProgress(projectId);
      setProgressMap(prev => ({ ...prev, [projectId]: progress }));
    } catch (e) {
      console.error('linkTask failed', e);
    }
  }

  async function unlinkTask(projectId, taskId) {
    try {
      await updateTask(taskId, { goalId: null });
      const tasks = await getTasks();
      setAllTasks(tasks || []);
      const { progress } = await calculateGoalProgress(projectId);
      setProgressMap(prev => ({ ...prev, [projectId]: progress }));
    } catch (e) {
      console.error('unlinkTask failed', e);
    }
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
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <button className="button button-sm" onClick={() => toggleMilestoneDone(p.id, m.id)}>{m.done ? 'Undo' : 'Done'}</button>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', marginTop: 8 }}>
                  <input placeholder="Add milestone" value={milestoneInputs[p.id] || ''} onChange={e => setMilestoneInput(p.id, e.target.value)} style={{ flex: 1, padding: 6 }} />
                  <button className="button button-sm button-primary" onClick={() => addMilestone(p.id)} style={{ marginLeft: 8 }}>Add</button>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>Linked Tasks</div>
                  {linkedTasksFor(p.id).length === 0 ? <div className="text-muted">No tasks linked</div> : linkedTasksFor(p.id).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      <div><button className="button button-sm" onClick={() => unlinkTask(p.id, t.id)}>Unlink</button></div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', marginTop: 8 }}>
                    <select value={linkSelection[p.id] || ''} onChange={e => setLinkSelection(prev => ({ ...prev, [p.id]: e.target.value }))} style={{ flex: 1, padding: 6 }}>
                      <option value="">-- Link a task --</option>
                      {availableTasksFor(p.id).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    <button className="button button-sm button-primary" onClick={() => { if (linkSelection[p.id]) linkTask(p.id, linkSelection[p.id]); }} style={{ marginLeft: 8 }}>Link</button>
                  </div>

                  <div style={{ display: 'flex', marginTop: 8 }}>
                    <input placeholder="Quick create task for this goal" value={milestoneInputs[`quick-${p.id}`] || ''} onChange={e => setMilestoneInput(`quick-${p.id}`, e.target.value)} style={{ flex: 1, padding: 6 }} />
                    <button className="button button-sm button-primary" onClick={() => quickCreateTask(p.id)} style={{ marginLeft: 8 }}>Create Task</button>
                  </div>

                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
