// Simple AI planner using GROQ fetch (MVP)
const path = require('path');
const { openDb, aiFetchByGROQ, aiGenerate } = require('./index');
const { dayPlannerPrompt } = require('./templates');

async function planDay(dbPath, dateISO, aiOptions = {}) {
  const db = openDb(dbPath);
  try {
    // Fetch up to 50 todo tasks ordered by due date / priority
    const q = 'tasks[status == "todo"] | order(due_date asc) [0..49] { id, title, est_minutes, due_date, priority }';
    const rows = await aiFetchByGROQ(db, q);

    const context = { date: dateISO, tasks: rows };
    const prompt = dayPlannerPrompt(context);
    const res = await aiGenerate(prompt, aiOptions);
    if (res && res.text) {
      try {
        const parsed = JSON.parse(res.text);
        const { validateDayPlan } = require('./schema');
        const ok = validateDayPlan(parsed);
        if (ok) {
          // persist
          const { saveDayPlan } = require('../db/dayplan_store');
          // dbPath points to data.sqlite path; reuse dir for jsondb
          const saved = saveDayPlan(dbPath, parsed);
          return saved;
        }
      } catch (e) {
        // fallback to simple planner
      }
    }

    const plan_items = rows.map((r, idx) => ({
      id: `plan_${idx + 1}`,
      task_id: r.id,
      action_text: r.title,
      scheduled_time: null,
    }));

    const next_best_action_id = plan_items.length ? plan_items[0].task_id : null;
    const fallback = { date: dateISO, next_best_action_id, plan_items };
    const { saveDayPlan } = require('../db/dayplan_store');
    const saved = saveDayPlan(dbPath, fallback);
    return saved;
  } finally {
    if (db && typeof db.close === 'function') db.close();
  }
}

module.exports = { planDay };
