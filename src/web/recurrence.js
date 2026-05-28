// recurrence.js — simple rule-based recurring task generator
// Rule format example:
// { id, titleTemplate, projectId, rule: { freq: 'daily'|'weekly'|'monthly', interval: 1, weekdays: [1,2,3], timeOfDay: '09:00', startDate, endDate } }

import dataModel from './dataModelAsync.js';
import { uid } from './storage.js';

const RULES_KEY = 'recurrence_rules';

export async function getRules() {
  return await dataModel.loadJSON ? await dataModel.loadJSON(RULES_KEY, []) : await (await import('./storage.js')).loadJSON(RULES_KEY, []);
}

export async function saveRules(rules) {
  return await (await import('./storage.js')).saveJSON(RULES_KEY, rules);
}

export async function addRule(rule) {
  const rules = await getRules();
  const r = { id: rule.id || uid('rule'), ...rule };
  rules.push(r);
  await saveRules(rules);
  return r;
}

function dateToYMD(d) {
  return d.toISOString().split('T')[0];
}

function parseTimeOfDay(timestr) {
  if (!timestr) return null;
  const [h,m] = timestr.split(':').map(Number);
  return { h, m };
}

export async function generateForDate(date) {
  // date: Date object
  const rules = await getRules();
  const created = [];
  const ymd = dateToYMD(date);

  for (const r of rules) {
    const rule = r.rule || {};
    // check start/end
    if (rule.startDate && ymd < rule.startDate) continue;
    if (rule.endDate && ymd > rule.endDate) continue;

    let match = false;
    if (rule.freq === 'daily') match = true;
    else if (rule.freq === 'weekly') {
      if (!rule.weekdays || rule.weekdays.length === 0) match = true;
      else {
        const dow = date.getDay(); // 0-6
        match = rule.weekdays.includes(dow);
      }
    } else if (rule.freq === 'monthly') {
      match = (date.getDate() === (rule.monthDay || date.getDate()));
    }

    if (!match) continue;

    // create a task instance unless one exists for that date
    const tasks = await dataModel.getTasks();
    const existing = tasks.find(t => t.recurringRuleId === r.id && t.recurringDate === ymd);
    if (existing) continue;

    const time = parseTimeOfDay(rule.timeOfDay);
    const due = rule.timeOfDay ? `${ymd}T${String(time.h).padStart(2,'0')}:${String(time.m).padStart(2,'0')}:00` : ymd;

    const task = await dataModel.addTask({
      title: r.titleTemplate.replace('{date}', ymd),
      project_id: r.projectId || null,
      priority: r.priority || 3,
      due_date: due,
      recurring: true,
      recurringRuleId: r.id,
      recurringDate: ymd,
      notes: r.notes || ''
    });
    created.push(task);
  }

  return created;
}

export default { getRules, addRule, saveRules, generateForDate };
