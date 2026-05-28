/**
 * Data model: localStorage + minimal IndexedDB abstraction
 * Stores: tasks, projects, mood events, productivity metrics, AI config, ActivityWatch data
 */

const LS = {
  tasks: 'lap.tasks',
  projects: 'lap.projects',
  moodEvents: 'lap.mood_events',
  productivityMetrics: 'lap.productivity_metrics',
  aiConfig: 'lap.ai_config',
  awConfig: 'lap.aw_config',
  dailyRoutineConfig: 'lap.daily_routine_config',
  madeTimeLastMorningCheck: 'lap.made_time_last_morning_check',
  madeTimeLastEveningCheck: 'lap.made_time_last_evening_check'
};

export { LS };

// Utilities backed by storage.js (local-first)
import { loadJSON, saveJSON, ensureSeed, uid } from './storage.js';
// Re-export storage helpers so other modules (AppNew.jsx) can use them directly
export { loadJSON, saveJSON, ensureSeed, uid };

// Mood tracking
export function addMoodEvent(score, notes = '') {
  const events = loadJSON(LS.moodEvents, []);
  const today = new Date().toISOString().split('T')[0];
  const event = {
    id: uid('mood'),
    date: today,
    score: Math.max(1, Math.min(10, score)), // 1-10
    notes,
    timestamp: new Date().toISOString()
  };
  events.push(event);
  saveJSON(LS.moodEvents, events);
  return event;
}

export function getEveningCheckInDate() {
  return loadJSON(LS.madeTimeLastMorningCheck, null);
}

export function shouldShowEveningRoutine() {
  const now = new Date();
  const hour = now.getHours();
  
  // Only show after 9 PM (21:00)
  if (hour < 21) {
    return false;
  }

  const today = new Date().toISOString().split('T')[0];
  const lastEveningCheckDate = loadJSON(LS.madeTimeLastEveningCheck, null);
  
  // Show if we haven't checked in this evening yet
  if (lastEveningCheckDate !== today) {
    return true;
  }
  return false;
}

export function markEveningRoutineComplete() {
  const today = new Date().toISOString().split('T')[0];
  saveJSON(LS.madeTimeLastEveningCheck, today);
}

export function getMoodEventsForDate(date) {
  const events = loadJSON(LS.moodEvents, []);
  return events.filter(e => e.date === date);
}

export function getMoodTrend(days = 7) {
  const events = loadJSON(LS.moodEvents, []);
  const today = new Date();
  const dates = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates.map(date => {
    const dayEvents = events.filter(e => e.date === date);
    const avgScore = dayEvents.length > 0
      ? dayEvents.reduce((sum, e) => sum + e.score, 0) / dayEvents.length
      : null;
    return { date, score: avgScore, count: dayEvents.length };
  });
}

// Productivity scoring
export function calculateProductivityScore(taskData) {
  // Backwards-compatible local-first productivity score calculator.
  // Prioritize weighted task completion and consistency; mood and project progress are bonuses.
  const {
    tasksCompletedToday = 0,
    totalTasksToday = 0,
    totalTaskWeight = 0,
    completedTaskWeight = 0,
    focusTimeMinutes = 0,
    moodScore = 5,
    projectProgress = 0, // 0-100
    recentDailyScores = [] // optional array of previous daily scores for consistency
  } = taskData || {};

  // Completion component (up to 60)
  let completionRatio = 0;
  if (totalTaskWeight > 0) completionRatio = (completedTaskWeight / totalTaskWeight);
  else if (totalTasksToday > 0) completionRatio = Math.min(tasksCompletedToday / totalTasksToday, 1);
  const completionScore = Math.round(Math.min(Math.max(completionRatio, 0), 1) * 60);

  // Focus component (up to 15)
  const focusScore = Math.min(Math.floor(focusTimeMinutes / 10), 15);

  // Mood bonus (up to 10)
  const moodBonus = moodScore >= 8 ? 10 : moodScore >= 6 ? 7 : moodScore >= 4 ? 4 : 1;

  // Project progress bonus (up to 10)
  const projectBonus = Math.min(Math.floor(projectProgress / 10), 10);

  // Consistency component (up to 5) — percentage of recent days with score >= 50
  let consistencyScore = 0;
  try {
    if (Array.isArray(recentDailyScores) && recentDailyScores.length > 0) {
      const goodDays = recentDailyScores.filter(s => Number(s) >= 50).length;
      consistencyScore = Math.round((goodDays / recentDailyScores.length) * 5);
    }
  } catch (e) {
    consistencyScore = 0;
  }

  const raw = completionScore + focusScore + moodBonus + projectBonus + consistencyScore;
  return Math.min(100, Math.max(0, Math.floor(raw)));
}

export function saveProductivityMetric(date, score, metadata = {}) {
  const metrics = loadJSON(LS.productivityMetrics, []);
  const existing = metrics.findIndex(m => m.date === date);
  
  const metric = {
    date,
    score,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  if (existing >= 0) {
    metrics[existing] = metric;
  } else {
    metrics.push(metric);
  }
  
  saveJSON(LS.productivityMetrics, metrics);
  return metric;
}

export function getProductivityMetrics(days = 7) {
  const metrics = loadJSON(LS.productivityMetrics, []);
  const today = new Date();
  const dates = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates.map(date => {
    const metric = metrics.find(m => m.date === date);
    return {
      date,
      score: metric?.score || 0,
      hasData: !!metric
    };
  });
}

// Daily routine config
export function getDailyRoutineConfig() {
  return loadJSON(LS.dailyRoutineConfig, {
    enabled: true,
    morningCheckInTime: 8, // 8 AM
    eveningReviewTime: 21 // 9 PM
  });
}

export function setDailyRoutineConfig(config) {
  saveJSON(LS.dailyRoutineConfig, config);
  return config;
}

// Check if morning routine already ran today
export function shouldShowMorningRoutine() {
  const today = new Date().toISOString().split('T')[0];
  const lastMorningCheckDate = loadJSON(LS.madeTimeLastMorningCheck, null);
  
  if (lastMorningCheckDate !== today) {
    return true;
  }
  return false;
}

export function markMorningRoutineComplete() {
  const today = new Date().toISOString().split('T')[0];
  saveJSON(LS.madeTimeLastMorningCheck, today);
}
