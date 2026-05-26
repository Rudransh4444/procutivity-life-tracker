-- Migration: create progress_events table
CREATE TABLE IF NOT EXISTS progress_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  task_id TEXT,
  action TEXT,
  duration_minutes INTEGER,
  data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
