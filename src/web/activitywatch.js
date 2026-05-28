// activitywatch.js — helpers to import AW exports and normalize into progressEvents
// Accepts AW JSON export (array of events) or AW CSV parsed into objects
import { loadJSON, saveJSON } from './storage.js';

const PROGRESS_KEY = 'progressEvents';

export async function getProgressEvents() {
  return await loadJSON(PROGRESS_KEY, []);
}

export async function addProgressEvent(evt) {
  const arr = await getProgressEvents();
  arr.push({ id: `pe-${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: evt.timestamp || new Date().toISOString(), source: 'aw', app: evt.app || evt.domain || '', title: evt.title || '', duration_minutes: evt.duration_minutes || 0, meta: evt.meta || {} });
  await saveJSON(PROGRESS_KEY, arr);
}

export async function importAwArray(events) {
  // Expect events: [{timestamp, duration, project, host, title}] or AW shape
  for (const e of events) {
    const normalized = {
      timestamp: e.timestamp || e.start || new Date().toISOString(),
      app: e.project || e.host || e.domain || e.app || '',
      title: e.title || '',
      duration_minutes: e.duration ? Math.round(e.duration/60000) : (e.duration_minutes || 0),
      meta: e
    };
    await addProgressEvent(normalized);
  }
}

export default { getProgressEvents, addProgressEvent, importAwArray };
