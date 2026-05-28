import React, { useMemo, useState } from 'react';
import {
  applyProjectExpansion,
  buildDayPlan,
  callAi,
  cleanJson,
  createProjectExpansionPrompt,
  fallbackProjectExpansion,
  groupTasksByProject,
  normalizeGoalText,
  selectNextBest,
  summarizeAwSites
} from './logic.js';
import { ensureSeed, saveJSON, uid } from './storage.js';
import { sampleProjects, sampleTasks } from './sampleData.js';

const LS = {
  tasks: 'lap.tasks',
  projects: 'lap.projects',
  ai: 'lap.ai',
  aw: 'lap.aw',
  progress: 'lap.progress'
};

const defaultAi = {
  apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
  apiKey: '',
  provider: 'openai',
  model: 'llama-3.1-8b-instant',
  temperature: 0.4,
  max_tokens: 400
};

const defaultAw = {
  host: 'http://localhost:5600',
  bucket: 'aw-watcher-web-default',
  analyticsJson: JSON.stringify([
    { url: 'youtube.com', duration_minutes: 35 },
    { url: 'docs.google.com', duration_minutes: 55 },
    { url: 'x.com', duration_minutes: 18 }
  ], null, 2)
};

function usePersistedState(key, fallback) {
  const [value, setValue] = useState(() => ensureSeed(key, fallback));
  React.useEffect(() => saveJSON(key, value), [key, value]);
  return [value, setValue];
}

function Button({ children, tone = 'primary', ...props }) {
  return <button className={`btn btn-${tone}`} {...props}>{children}</button>;
}

function Panel({ title, sub, right, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {sub ? <p className="muted">{sub}</p> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function App() {
  const [projects, setProjects] = usePersistedState(LS.projects, sampleProjects);
  const [tasks, setTasks] = usePersistedState(LS.tasks, sampleTasks);
  const [aiConfig, setAiConfig] = usePersistedState(LS.ai, defaultAi);
  const [awConfig, setAwConfig] = usePersistedState(LS.aw, defaultAw);
  const [progress, setProgress] = usePersistedState(LS.progress, [
    { id: uid('p'), text: 'Ready', at: new Date().toISOString() }
  ]);

  const [selectedProject, setSelectedProject] = useState('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState(projects[0]?.id || '');
  const [newTaskPriority, setNewTaskPriority] = useState(2);
  const [newTaskMinutes, setNewTaskMinutes] = useState(30);
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [status, setStatus] = useState('Ready.');
  const [planPreview, setPlanPreview] = useState(null);
  const [aiDraft, setAiDraft] = useState(aiConfig);
  const [awDraft, setAwDraft] = useState(awConfig);
  const [projectDraft, setProjectDraft] = useState('');
  const [awInput, setAwInput] = useState(defaultAw.analyticsJson);
  const [awAnalytics, setAwAnalytics] = useState(summarizeAwSites(JSON.parse(defaultAw.analyticsJson)));
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === (selectedProject === 'all' ? newTaskProject : selectedProject)) || projects[0],
    [projects, selectedProject, newTaskProject]
  );

  React.useEffect(() => {
    if (activeProject) setProjectDraft(activeProject.goal || activeProject.description || '');
  }, [activeProject?.id]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => selectedProject === 'all' || task.project_id === selectedProject),
    [tasks, selectedProject]
  );

  const nextBest = useMemo(() => selectNextBest(visibleTasks), [visibleTasks]);
  const grouped = useMemo(() => groupTasksByProject(tasks, projects), [tasks, projects]);

  function pushProgress(text) {
    setProgress([{ id: uid('p'), text, at: new Date().toISOString() }, ...progress].slice(0, 10));
  }

  function saveTasks(next) {
    setTasks(next);
    setStatus('Saved locally.');
  }

  function addTask(e) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    if (editingTaskId) {
      saveTasks(tasks.map((task) => (
        task.id === editingTaskId
          ? {
              ...task,
              title,
              project_id: newTaskProject || task.project_id,
              priority: Number(newTaskPriority) || task.priority,
              est_minutes: Number(newTaskMinutes) || task.est_minutes,
              notes: newTaskNotes.trim()
            }
          : task
      )));
      pushProgress(`Updated task: ${title}`);
      setEditingTaskId(null);
      setNewTaskTitle('');
      setNewTaskNotes('');
      return;
    }
    const task = {
      id: uid('task'),
      title,
      project_id: newTaskProject || projects[0]?.id || '',
      priority: Number(newTaskPriority) || 2,
      est_minutes: Number(newTaskMinutes) || 30,
      due_date: '',
      status: 'todo',
      notes: newTaskNotes.trim()
    };
    saveTasks([task, ...tasks]);
    pushProgress(`Added task: ${task.title}`);
    setNewTaskTitle('');
    setNewTaskNotes('');
  }

  function updateTask(id, patch) {
    saveTasks(tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  function deleteTask(id) {
    const target = tasks.find((task) => task.id === id);
    saveTasks(tasks.filter((task) => task.id !== id));
    if (target) pushProgress(`Removed task: ${target.title}`);
  }

  function toggleDone(id) {
    const target = tasks.find((task) => task.id === id);
    const next = tasks.map((task) => (task.id === id ? { ...task, status: task.status === 'done' ? 'todo' : 'done' } : task));
    saveTasks(next);
    if (target) pushProgress(`${target.status === 'done' ? 'Reopened' : 'Completed'}: ${target.title}`);
  }

  function addProject(e) {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    const project = {
      id: uid('proj'),
      name,
      goal: newProjectGoal.trim(),
      color: ['#60a5fa', '#2dd4bf', '#fbbf24', '#fb7185'][projects.length % 4]
    };
    setProjects([project, ...projects]);
    setNewProjectName('');
    setNewProjectGoal('');
    setNewTaskProject(project.id);
    pushProgress(`Created project: ${project.name}`);
  }

  function saveAi(e) {
    e.preventDefault();
    setAiConfig(aiDraft);
    setStatus('AI settings saved.');
    pushProgress('Updated AI settings');
  }

  function saveAw(e) {
    e.preventDefault();
    const next = { ...awDraft, analyticsJson: awInput };
    setAwDraft(next);
    setAwConfig(next);
    setStatus('ActivityWatch settings saved.');
    pushProgress('Updated ActivityWatch settings');
  }

  function loadAwAnalytics(e) {
    e.preventDefault();
    try {
      const parsed = JSON.parse(awInput || awDraft.analyticsJson || '[]');
      const summary = summarizeAwSites(parsed);
      setAwAnalytics(summary);
      setStatus('Loaded ActivityWatch analytics.');
      pushProgress('Imported ActivityWatch site analytics');
    } catch {
      setStatus('Could not read ActivityWatch JSON.');
    }
  }

  async function expandProject() {
    const project = activeProject || projects[0];
    if (!project) return;
    setAiLoading(true);
    setStatus(`Expanding ${project.name} into todos...`);
    try {
      const prompt = createProjectExpansionPrompt(project, tasks, projects);
      const response = await callAi(prompt, aiConfig);
      const parsed = response.text ? cleanJson(response.text) : null;
      const expansion = parsed && (parsed.add || parsed.update || parsed.remove)
        ? parsed
        : fallbackProjectExpansion(project, tasks);
      const nextTasks = applyProjectExpansion(project.id, tasks, expansion);
      saveTasks(nextTasks);
      setAiSuggestion(expansion);
      setPlanPreview(buildDayPlan(nextTasks));
      pushProgress(`Expanded project: ${project.name}`);
      setStatus('Project expanded into todos.');
    } catch {
      const expansion = fallbackProjectExpansion(project, tasks);
      const nextTasks = applyProjectExpansion(project.id, tasks, expansion);
      saveTasks(nextTasks);
      setAiSuggestion(expansion);
      setPlanPreview(buildDayPlan(nextTasks));
      setStatus('Project expanded with fallback logic.');
    } finally {
      setAiLoading(false);
    }
  }

  function resetDemo() {
    setProjects(sampleProjects);
    setTasks(sampleTasks);
    setAiConfig(defaultAi);
    setAwConfig(defaultAw);
    setAiDraft(defaultAi);
    setAwDraft(defaultAw);
    setAwAnalytics(summarizeAwSites(JSON.parse(defaultAw.analyticsJson)));
    setAiSuggestion(null);
    setPlanPreview(null);
    setStatus('Demo data restored.');
    pushProgress('Reset demo data');
  }

  function applySuggestion() {
    if (!aiSuggestion) return;
    const project = projects.find((p) => p.id === (aiSuggestion.project_id || activeProject?.id)) || activeProject;
    if (!project) return;
    const nextTasks = applyProjectExpansion(project.id, tasks, aiSuggestion);
    saveTasks(nextTasks);
    setPlanPreview(buildDayPlan(nextTasks));
    setStatus('Applied AI suggestion.');
    pushProgress(`Applied AI suggestion for ${project.name}`);
  }

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const todoCount = tasks.length - doneCount;

  return (
    <div className="app-shell">
      <header className="hero compact">
        <div>
          <p className="eyebrow">Todo-first productivity</p>
          <h1>One list. One next step. Calm AI help.</h1>
          <p className="lede">
            Add tasks fast, group them by project, and let AI turn long-term goals into next actions.
          </p>
        </div>
        <div className="hero-actions">
          <span className="badge">{todoCount} open</span>
          <span className="badge muted">{doneCount} done</span>
          <span className="badge warning">{awAnalytics.length} tracked sites</span>
        </div>
      </header>

      <div className="toolbar">
        <div className="status-line">{status}</div>
        <div className="toolbar-actions">
          <Button onClick={expandProject}>Expand project</Button>
          <Button tone="ghost" onClick={resetDemo}>Reset demo</Button>
        </div>
      </div>

      <main className="simple-grid">
        <section className="main-column">
          <Panel
            title="Todo list"
            sub="Main feature — add and manage tasks here."
            right={nextBest ? <span className="badge success">Next: {nextBest.action_text}</span> : <span className="badge warning">No tasks</span>}
          >
            <form className="stack" onSubmit={addTask}>
              <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add a todo task" />
              <div className="row">
                <select value={newTaskProject} onChange={(e) => setNewTaskProject(e.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <input type="number" min="1" max="5" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} placeholder="Priority" />
                <input type="number" min="5" value={newTaskMinutes} onChange={(e) => setNewTaskMinutes(e.target.value)} placeholder="Minutes" />
              </div>
              <input value={newTaskNotes} onChange={(e) => setNewTaskNotes(e.target.value)} placeholder="Short note" />
              <Button type="submit">Add task</Button>
            </form>

            <div className="task-list">
              {visibleTasks.map((task) => {
                const project = projects.find((p) => p.id === task.project_id);
                return (
                  <article className={`task-row ${task.status === 'done' ? 'done' : ''}`} key={task.id}>
                    <div className="task-row-left">
                      <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleDone(task.id)} />
                      <div>
                        <div className="task-title">{task.title}</div>
                        <div className="task-meta">
                          <span>{project ? project.name : 'No project'}</span>
                          <span>{task.est_minutes}m</span>
                          <span>P{task.priority}</span>
                        </div>
                        {task.notes ? <div className="task-notes">{task.notes}</div> : null}
                      </div>
                    </div>
                    <div className="task-actions">
                      <Button tone="ghost" onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}>{task.status === 'done' ? 'Reopen' : 'Done'}</Button>
                      <Button tone="ghost" onClick={() => {
                        setSelectedProject(task.project_id || 'all');
                        setNewTaskTitle(task.title);
                        setNewTaskProject(task.project_id);
                        setNewTaskPriority(task.priority);
                        setNewTaskMinutes(task.est_minutes);
                        setNewTaskNotes(task.notes || '');
                        setEditingTaskId(task.id);
                        setStatus('Editing task…');
                      }}>Edit</Button>
                      <Button tone="danger" onClick={() => deleteTask(task.id)}>Delete</Button>
                    </div>
                  </article>
                );
              })}
              {!visibleTasks.length ? <p className="muted">No tasks in this view yet.</p> : null}
            </div>

            {editingTaskId ? (
              <div className="edit-hint">
                Editing task is on. Save by changing the todo above or delete/reset to leave edit mode.
              </div>
            ) : null}
          </Panel>

          <Panel title="Projects" sub="Long-term goals that AI can break into todo tasks.">
            <div className="chips">
              <button className={`chip ${selectedProject === 'all' ? 'active' : ''}`} onClick={() => setSelectedProject('all')}>All</button>
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={`chip ${selectedProject === project.id ? 'active' : ''}`}
                  style={{ borderColor: project.color }}
                  onClick={() => setSelectedProject(project.id)}
                >
                  {project.name}
                </button>
              ))}
            </div>

            <form className="stack spaced" onSubmit={addProject}>
              <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="New project name" />
              <input value={newProjectGoal} onChange={(e) => setNewProjectGoal(e.target.value)} placeholder="Long-term project goal" />
              <Button type="submit" tone="ghost">Add project</Button>
            </form>

            <div className="project-list">
              {projects.map((project) => (
                <article key={project.id} className="project-card">
                  <div className="project-head">
                    <strong>{project.name}</strong>
                    <span className="badge muted">{grouped.get(project.id)?.length || 0} todos</span>
                  </div>
                  <input
                    value={project.goal || ''}
                    onChange={(e) => {
                      const next = projects.map((item) => (item.id === project.id ? { ...item, goal: normalizeGoalText(e.target.value) } : item));
                      setProjects(next);
                      pushProgress(`Updated goal for ${project.name}`);
                    }}
                    placeholder="Project goal"
                  />
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <aside className="side-column">
          <Panel title="AI project assistant" sub="Give AI context from projects + todos to edit your list.">
            <div className="stack">
              <select value={activeProject?.id || ''} onChange={(e) => setNewTaskProject(e.target.value)}>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <textarea
                rows="5"
                value={projectDraft}
                onChange={(e) => setProjectDraft(e.target.value)}
                placeholder="Describe what you want this project to achieve."
              />
              <div className="row">
                <Button onClick={async () => {
                  const project = projects.find((item) => item.id === (selectedProject === 'all' ? newTaskProject : selectedProject)) || projects[0];
                  if (!project) return;
                  setAiLoading(true);
                  try {
                    const prompt = createProjectExpansionPrompt(
                      { ...project, goal: normalizeGoalText(projectDraft || project.goal || project.description || '') },
                      tasks,
                      projects
                    );
                    const response = await callAi(prompt, aiConfig);
                    const parsed = response.text ? cleanJson(response.text) : null;
                      const suggestion = parsed && (parsed.add || parsed.update || parsed.remove)
                        ? { ...parsed, project_id: project.id, project_goal: normalizeGoalText(projectDraft || project.goal || project.description || '') }
                        : fallbackProjectExpansion(project, tasks);
                      setAiSuggestion(suggestion);
                      setStatus('AI suggestion ready.');
                    } catch {
                      setAiSuggestion(fallbackProjectExpansion(project, tasks));
                      setStatus('Using fallback AI suggestion.');
                    } finally {
                      setAiLoading(false);
                    }
                  }}>
                  {aiLoading ? 'Thinking…' : 'Generate edits'}
                </Button>
                <Button type="button" tone="ghost" onClick={applySuggestion} disabled={!aiSuggestion}>Apply</Button>
              </div>
              {aiSuggestion ? (
                <pre className="json-box">{JSON.stringify(aiSuggestion, null, 2)}</pre>
              ) : (
                <p className="muted">No AI suggestion yet.</p>
              )}
            </div>
          </Panel>

          <Panel title="ActivityWatch site tracking" sub="Paste AW site export or analytics JSON to see top sites.">
            <form className="stack" onSubmit={saveAw}>
              <input value={awDraft.host} onChange={(e) => setAwDraft({ ...awDraft, host: e.target.value })} placeholder="AW host" />
              <input value={awDraft.bucket} onChange={(e) => setAwDraft({ ...awDraft, bucket: e.target.value })} placeholder="Bucket name" />
              <textarea
                rows="6"
                value={awInput || awDraft.analyticsJson}
                onChange={(e) => setAwInput(e.target.value)}
                placeholder="Paste ActivityWatch site tracking JSON here"
              />
              <div className="row">
                <Button type="submit" tone="ghost">Save settings</Button>
                <Button tone="ghost" onClick={loadAwAnalytics}>Analyze sites</Button>
              </div>
            </form>
            <div className="site-list">
              {awAnalytics.slice(0, 6).map((site) => (
                <div className="site-row" key={site.domain}>
                  <span>{site.domain}</span>
                  <strong>{site.minutes}m</strong>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="AI settings" sub="Groq-compatible OpenAI endpoint works here.">
            <form className="stack" onSubmit={saveAi}>
              <input value={aiDraft.apiUrl} onChange={(e) => setAiDraft({ ...aiDraft, apiUrl: e.target.value })} placeholder="API URL" />
              <input value={aiDraft.apiKey} onChange={(e) => setAiDraft({ ...aiDraft, apiKey: e.target.value })} placeholder="API key" type="password" />
              <select value={aiDraft.provider} onChange={(e) => setAiDraft({ ...aiDraft, provider: e.target.value })}>
                <option value="openai">OpenAI-compatible</option>
                <option value="generic">Generic</option>
              </select>
              <input value={aiDraft.model} onChange={(e) => setAiDraft({ ...aiDraft, model: e.target.value })} placeholder="Model" />
              <Button type="submit" tone="ghost">Save AI settings</Button>
            </form>
          </Panel>
        </aside>

        <section className="full-width">
          <Panel title="Focus log" sub="Light progress feed.">
            <div className="log-list">
              {progress.map((item) => (
                <div key={item.id} className="log-row">
                  <span className="muted">{new Date(item.at).toLocaleTimeString()}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            {planPreview ? (
              <div className="plan-preview">
                <strong>Latest plan</strong>
                <div className="muted">{planPreview.plan_items?.length || 0} items · next best: {planPreview.next_best_action_id || 'none'}</div>
              </div>
            ) : null}
          </Panel>
        </section>
      </main>
    </div>
  );
}

export default App;
