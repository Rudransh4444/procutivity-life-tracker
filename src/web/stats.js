// stats.js — local-first stats aggregation helpers
// Exports: getDailyStats, getWeeklyStats, getMonthlyStats, getTrend

import { loadJSON } from './storage.js';
import { getMoodTrend } from './dataModel.js';

function dateToYMD(d) {
  return (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];
}

export async function getDailyStats(date) {
  const day = dateToYMD(date);
  const tasks = await loadJSON('tasks', []);
  const moods = await loadJSON('moods', []);
  const workouts = await loadJSON('workouts', []);

  const todays = tasks.filter(t => (t.date || t.due_date || '').startsWith(day) && !t.archived);
  const completed = todays.filter(t => t.status === 'done').length;
  const total = todays.length;
  const completedWeight = todays.filter(t => t.status === 'done').reduce((s,t)=>s+(Number(t.weight)||1),0);
  const totalWeight = todays.reduce((s,t)=>s+(Number(t.weight)||1),0);

  const moodDay = moods.filter(m => (m.date||'').startsWith(day));
  const mood = moodDay.length ? Math.round(moodDay.reduce((s,m)=>s+(Number(m.score)||0),0)/moodDay.length) : null;

  const focusMinutes = await computeFocusMinutesForDay(day);

  const productivity = {
    date: day,
    tasksCompleted: completed,
    tasksTotal: total,
    completedWeight,
    totalWeight,
    mood,
    focusMinutes
  };

  return productivity;
}

async function computeFocusMinutesForDay(day) {
  // Prefer progressEvents stored by activitywatch.js
  const pe = await loadJSON('progressEvents', []);
  if (Array.isArray(pe) && pe.length) {
    // classify domains into productive vs distraction using simple lists
    const productive = ['github.com', 'gitlab.com', 'stackoverflow.com', 'docs.google.com', 'figma.com', 'notion.so'];
    const distraction = ['youtube.com', 'x.com', 'reddit.com', 'instagram.com', 'facebook.com', 'tiktok.com'];
    // sum productive minutes for the day
    let focus = 0;
    for (const e of pe) {
      const ts = (e.timestamp || '').split('T')[0];
      if (ts !== day) continue;
      const domain = String(e.app || e.title || e.meta?.domain || '').toLowerCase();
      const minutes = Number(e.duration_minutes || e.duration || 0) || 0;
      if (productive.some(p => domain.includes(p))) focus += minutes;
      else if (distraction.some(d => domain.includes(d))) {
        // ignore
      } else {
        // neutral — count half as focus
        focus += Math.round(minutes * 0.5);
      }
    }
    return focus;
  }
  // fallback: estimate from tasks' estimatedMinutes
  const tasks = await loadJSON('tasks', []);
  const todays = tasks.filter(t => (t.date || t.due_date || '').startsWith(day) && t.status === 'done');
  return todays.reduce((s,t)=> s + (Number(t.estimatedMinutes)||Number(t.estimated_minutes)||0),0);
}

export async function getWeeklyStats(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  // build 7 days ending on date
  const days = [];
  for (let i=6;i>=0;i--) {
    const dd = new Date(d);
    dd.setDate(d.getDate()-i);
    days.push(dateToYMD(dd));
  }
  const daily = [];
  for(const day of days) {
    daily.push(await getDailyStats(day));
  }
  // aggregate
  const totalTasks = daily.reduce((s,d)=>s+(d.tasksTotal||0),0);
  const completedTasks = daily.reduce((s,d)=>s+(d.tasksCompleted||0),0);
  const focus = daily.reduce((s,d)=>s+(d.focusMinutes||0),0);
  return {
    start: days[0],
    end: days[days.length-1],
    totalTasks,
    completedTasks,
    focus,
    daily
  };
}

export async function getMonthlyStats(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const end = new Date(year, month+1, 0);
  const start = new Date(year, month, 1);
  const days = [];
  for (let dt = new Date(start); dt<=end; dt.setDate(dt.getDate()+1)) {
    days.push(dateToYMD(new Date(dt)));
  }
  const daily = [];
  for (const day of days) daily.push(await getDailyStats(day));
  const totalTasks = daily.reduce((s,d)=>s+(d.tasksTotal||0),0);
  const completedTasks = daily.reduce((s,d)=>s+(d.tasksCompleted||0),0);
  const focus = daily.reduce((s,d)=>s+(d.focusMinutes||0),0);
  return { start: dateToYMD(start), end: dateToYMD(end), totalTasks, completedTasks, focus, daily };
}

export async function getTrend(metric='productivity', days=14) {
  const arr = [];
  for (let i=days-1;i>=0;i--) {
    const d = new Date();
    d.setDate(d.getDate()-i);
    const day = dateToYMD(d);
    const s = await getDailyStats(day);
    if (metric === 'productivity') {
      const score = calculateLocalProductivityFromDaily(s);
      arr.push({ date: day, value: score });
    } else if (metric === 'focus') {
      arr.push({ date: day, value: s.focusMinutes || 0 });
    }
  }
  return arr;
}

function calculateLocalProductivityFromDaily(s) {
  const completionRatio = (s.totalWeight && s.totalWeight>0) ? (s.completedWeight||s.completedWeight||0)/(s.totalWeight||1) : ((s.tasksTotal>0) ? (s.tasksCompleted/s.tasksTotal) : 0);
  const completion = Math.round(Math.min(Math.max(completionRatio,0),1)*70);
  const focus = Math.min(Math.floor((s.focusMinutes||0)/10),20);
  const mood = s.mood ? (s.mood>=8?10: s.mood>=6?7: s.mood>=4?4:1) : 5;
  const raw = completion + focus + mood;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export async function getWorkoutSummary(period='weekly') {
  const workouts = await loadJSON('workouts', []);
  if (!Array.isArray(workouts) || workouts.length === 0) return { totalSessions: 0, totalVolume: 0, byExercise: {} };
  const now = new Date();
  let since = new Date();
  if (period === 'weekly') since.setDate(now.getDate()-7);
  else if (period === 'monthly') since.setMonth(now.getMonth()-1);
  else since = new Date(0);

  const filtered = workouts.filter(w => new Date(w.date) >= since);
  const byExercise = {};
  let totalVolume = 0;
  for (const w of filtered) {
    const sets = Array.isArray(w.sets) ? w.sets : [w.sets];
    for (const s of sets) {
      const reps = Number(s.reps || 0);
      const weight = Number(s.weight || 0);
      const vol = reps * weight;
      totalVolume += vol;
      const ex = w.exercise || 'unknown';
      byExercise[ex] = (byExercise[ex] || 0) + vol;
    }
  }
  return { totalSessions: filtered.length, totalVolume, byExercise };
}

export default { getDailyStats, getWeeklyStats, getMonthlyStats, getTrend, getWorkoutSummary };