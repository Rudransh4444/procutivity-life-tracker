// reminders.js — simple local reminder scheduler using IndexedDB and Notification API
import { loadJSON, saveJSON } from './storage.js';

const REMINDERS_KEY = 'reminders';
let timers = {};

export async function getReminders() {
  return await loadJSON(REMINDERS_KEY, []);
}

export async function addReminder(reminder) {
  const rs = await getReminders();
  const r = { id: reminder.id || `rem-${Date.now()}`, date: reminder.date, label: reminder.label || 'Reminder', meta: reminder.meta || {} };
  rs.push(r);
  await saveJSON(REMINDERS_KEY, rs);
  scheduleReminder(r);
  return r;
}

export async function removeReminder(id) {
  let rs = await getReminders();
  rs = rs.filter(r => r.id !== id);
  await saveJSON(REMINDERS_KEY, rs);
  if (timers[id]) { clearTimeout(timers[id]); delete timers[id]; }
}

function toMs(iso) {
  const t = Date.parse(iso);
  return isNaN(t) ? null : t - Date.now();
}

export function scheduleReminder(r) {
  try {
    const ms = toMs(r.date);
    if (ms == null || ms <= 0) return;
    if (timers[r.id]) clearTimeout(timers[r.id]);
    timers[r.id] = setTimeout(() => {
      notify(r.label, r.meta || {});
      // remove one-time reminders
      removeReminder(r.id);
    }, ms);
  } catch (e) {
    console.warn('scheduleReminder error', e);
  }
}

export async function scheduleAll() {
  const rs = await getReminders();
  for (const r of rs) scheduleReminder(r);
}

export function notify(title, body = {}) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body: body.text || '' });
  } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { if (p === 'granted') new Notification(title, { body: body.text || '' }); });
  } else {
    // fallback: alert
    try { alert(`${title}\n${body.text || ''}`); } catch {}
  }
}

export default { getReminders, addReminder, removeReminder, scheduleAll };
