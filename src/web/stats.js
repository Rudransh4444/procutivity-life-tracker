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
  // Try to use ActivityWatch data if present
  const aw = await loadJSON('aw_events', []);
  if (Array.isArray(aw) && aw.length) {
    // entries assumed to have date and duration_minutes
    return aw.filter(e=> (e.date||'').startsWith(day)).reduce((s,e)=>s + (Number(e.duration_minutes)||Number(e.duration)||0),0);
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

export default { getDailyStats, getWeeklyStats, getMonthlyStats, getTrend };