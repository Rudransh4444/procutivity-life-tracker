// Simple Next-Best-Action engine (MVP)
// Input: array of tasks with fields: id, title, due_date (ISO), priority (int), est_minutes, status

function parseISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function selectNextBest(tasks) {
  const now = new Date();
  // annotate tasks
  const annotated = tasks.map(t => {
    const due = parseISO(t.due_date);
    const overdue = due && due < now;
    return Object.assign({}, t, { due, overdue });
  });

  // scoring
  annotated.forEach(t => {
    let score = 0;
    if (t.overdue) score += 1000;
    if (t.due) {
      // closer deadlines get higher score
      const diffHrs = (t.due - now) / (1000 * 60 * 60);
      score += Math.max(0, Math.floor(500 - diffHrs));
    }
    // priority: lower number = higher priority? We used 1-5 earlier; assume 1 highest
    const priorityScore = (6 - (t.priority || 3)) * 10; // range roughly 30..10
    score += priorityScore;
    // prefer shorter tasks slightly
    const lenBonus = t.est_minutes ? Math.max(0, 50 - t.est_minutes) : 0;
    score += lenBonus;
    t._score = score;
  });

  annotated.sort((a, b) => b._score - a._score);
  const winner = annotated.find(t => t.status === 'todo' || t.status === 'in_progress') || annotated[0] || null;
  if (!winner) return null;
  return {
    task_id: winner.id,
    action_text: `Work on: ${winner.title}`,
    est_minutes: winner.est_minutes || 30,
    reason: `score:${winner._score}`,
  };
}

module.exports = { selectNextBest };
