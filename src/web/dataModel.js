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
  const {
    tasksCompletedToday = 0,
    focusTimeMinutes = 0,
    moodScore = 5,
    projectProgress = 0 // 0-100
  } = taskData;

  let score = 0;
  score += Math.min(tasksCompletedToday * 10, 50); // Up to 50 points
  score += Math.min(Math.floor(focusTimeMinutes / 10), 20); // Up to 20 points
  score += (moodScore >= 7 ? 15 : moodScore >= 4 ? 10 : 5); // Mood bonus
  score += Math.floor(projectProgress / 10); // Up to 10 points from project progress

  return Math.min(Math.floor(score), 100);
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
