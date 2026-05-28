// dataModelAsync.js — async data helpers using storage.js (IndexedDB)
import { loadJSON, saveJSON, ensureSeed, uid } from './storage.js';

const DEFAULTS = {
  projects: [],
  tasks: [],
  goals: [],
  moods: [],
  journals: [],
  workouts: [],
  stats: { productivity: [], focus: [] },
  insights: [],
  settings: {}
};

export async function initDefaults() {
  for (const k of Object.keys(DEFAULTS)) {
    await ensureSeed(k, DEFAULTS[k]);
  }
}

export async function getTasks() { return await loadJSON('tasks', []); }
export async function addTask(task) {
  const tasks = await getTasks();
  const t = { id: task.id || uid('task'), status: task.status || 'todo', priority: task.priority || 2, tags: task.tags || [], weight: task.weight || 1, ...task };
  tasks.push(t);
  await saveJSON('tasks', tasks);
  return t;
}
export async function updateTask(id, patch) {
  const tasks = await getTasks();
  const idx = tasks.findIndex(t => t.id === id); if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...patch }; await saveJSON('tasks', tasks); return tasks[idx];
}
export async function deleteTask(id) { let tasks = await getTasks(); tasks = tasks.filter(t => t.id !== id); await saveJSON('tasks', tasks); return true; }

export async function getProjects() { return await loadJSON('projects', []); }
export async function upsertProject(proj) { const projects = await getProjects(); const idx = projects.findIndex(p => p.id === proj.id); if (idx === -1) projects.push(proj); else projects[idx] = { ...projects[idx], ...proj }; await saveJSON('projects', projects); return proj; }

export async function getGoals() { return await loadJSON('goals', []); }
export async function upsertGoal(goal) { const goals = await getGoals(); const idx = goals.findIndex(g => g.id === goal.id); if (idx === -1) goals.push(goal); else goals[idx] = { ...goals[idx], ...goal }; await saveJSON('goals', goals); return goal; }

export async function addMood(entry) { const moods = await loadJSON('moods', []); const e = { id: uid('mood'), date: new Date().toISOString(), ...entry }; moods.push(e); await saveJSON('moods', moods); return e; }
export async function addJournal(journal) { const journals = await loadJSON('journals', []); const j = { id: uid('journal'), date: new Date().toISOString(), ...journal }; journals.push(j); await saveJSON('journals', journals); return j; }
export async function addWorkout(w) { const workouts = await loadJSON('workouts', []); const x = { id: uid('workout'), date: new Date().toISOString(), ...w }; workouts.push(x); await saveJSON('workouts', workouts); return x; }

export async function getInsights() { return await loadJSON('insights', []); }
export async function addInsight(insight) { const insights = await getInsights(); const i = { id: uid('insight'), date: new Date().toISOString(), ...insight }; insights.push(i); await saveJSON('insights', insights); return i; }

export async function getSettings() { return await loadJSON('settings', {}); }
export async function updateSettings(patch) { const s = await getSettings(); const merged = { ...s, ...patch }; await saveJSON('settings', merged); return merged; }

// Search and filtering helpers
export async function getTasksByFilter(filter = {}) {
  const tasks = await getTasks();
  return tasks.filter((t) => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.tags && filter.tags.length) {
      const intersection = (t.tags || []).filter(tag => filter.tags.includes(tag));
      if (intersection.length === 0) return false;
    }
    if (filter.goalId && t.goalId !== filter.goalId) return false;
    if (filter.minPriority != null && Number(t.priority) < Number(filter.minPriority)) return false;
    if (filter.maxPriority != null && Number(t.priority) > Number(filter.maxPriority)) return false;
    if (filter.date) {
      const td = (t.date || t.due_date || '').split('T')[0];
      if (td !== filter.date) return false;
    }
    if (filter.archived === false && t.archived) return false;
    return true;
  });
}

export async function searchTasks(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return await getTasks();
  const tasks = await getTasks();
  return tasks.filter((t) => {
    return (String(t.title || '').toLowerCase().includes(q)) || (String(t.notes || '').toLowerCase().includes(q)) || (String(t.id || '').toLowerCase() === q);
  });
}

export async function archiveTask(id) {
  const tasks = await getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return false;
  tasks[idx].archived = true;
  tasks[idx].status = 'archived';
  await saveJSON('tasks', tasks);
  return true;
}

// Goal progress & risk detection
export async function calculateGoalProgress(goalId) {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return { progress: 0, completed: false };
  const tasks = await getTasks();
  const goalTasks = tasks.filter(t => t.goalId === goalId && !t.archived);
  const totalWeight = goalTasks.reduce((s, t) => s + (Number(t.weight) || 1), 0);
  const completedWeight = goalTasks.filter(t => t.status === 'done').reduce((s, t) => s + (Number(t.weight) || 1), 0);
  const progress = totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);
  return { progress, completed: progress >= 100 };
}

export async function detectGoalRisk(goalId) {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return { risk: 'unknown' };
  const { progress } = await calculateGoalProgress(goalId);
  if (!goal.deadline) return { risk: 'no-deadline' };
  const now = new Date();
  const start = goal.startDate ? new Date(goal.startDate) : new Date(goal.createdAt || now);
  const end = new Date(goal.deadline);
  const totalMs = end - start;
  const elapsedMs = now - start;
  const timeRatio = totalMs > 0 ? Math.min(Math.max(elapsedMs / totalMs, 0), 1) : 1;
  // If progress is significantly below elapsed time => at risk
  if (progress + 5 < Math.round(timeRatio * 100) - 20) return { risk: 'off_track', progress };
  if (progress + 5 < Math.round(timeRatio * 100) - 10) return { risk: 'at_risk', progress };
  return { risk: 'on_track', progress };
}

export default { initDefaults, getTasks, addTask, updateTask, deleteTask, getProjects, upsertProject, getGoals, upsertGoal, getGoals, upsertGoal, addMood, addJournal, addWorkout, getInsights, addInsight, getSettings, updateSettings, getTasksByFilter, searchTasks, archiveTask, calculateGoalProgress, detectGoalRisk };
