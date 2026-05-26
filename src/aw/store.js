// Map ActivityWatch progress into local DB progress_events table
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

function saveProgressEvent(dbPath, progress) {
  const db = new Database(dbPath);
  const insert = db.prepare('INSERT INTO progress_events (id, timestamp, task_id, action, duration_minutes, data) VALUES (?, ?, ?, ?, ?, ?)');
  const id = uuidv4();
  const timestamp = progress.timestamp || new Date().toISOString();
  const task_id = progress.task_id || null;
  const action = progress.action || null;
  const duration = progress.duration_minutes || null;
  const data = JSON.stringify(progress.data || {});
  insert.run(id, timestamp, task_id, action, duration, data);
  db.close();
  return id;
}

module.exports = { saveProgressEvent };
