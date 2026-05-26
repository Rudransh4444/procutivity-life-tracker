// Simple AI planner using GROQ fetch (MVP)
const path = require('path');
const { openDb, aiFetchByGROQ } = require('./index');

async function planDay(dbPath, dateISO) {
  const db = openDb(dbPath);
  try {
    // Fetch up to 50 todo tasks ordered by due date / priority
    const q = 'tasks[status == "todo"] | order(due_date asc) [0..49] { id, title, est_minutes, due_date, priority }';
    const rows = await aiFetchByGROQ(db, q);

    const plan_items = rows.map((r, idx) => ({
      id: `plan_${idx + 1}`,
      task_id: r.id,
      action_text: r.title,
      scheduled_time: null,
    }));

    const next_best_action_id = plan_items.length ? plan_items[0].task_id : null;

    return { date: dateISO, next_best_action_id, plan_items };
  } finally {
    if (db && typeof db.close === 'function') db.close();
  }
}

module.exports = { planDay };
