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

export default { initDefaults, getTasks, addTask, updateTask, deleteTask, getProjects, upsertProject, getGoals, upsertGoal, addMood, addJournal, addWorkout, getInsights, addInsight, getSettings, updateSettings };
