const fs = require('fs');
const path = require('path');
let Database;
try { Database = require('better-sqlite3'); } catch (e) { Database = null; }

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

function init(dbPath) {
  const dir = path.dirname(dbPath);
  ensureDir(dir);
  if (Database) {
    const db = new Database(dbPath);
    // run migrations if present
    const mpath = path.join(__dirname, 'migrations');
    if (fs.existsSync(mpath)) {
      const files = fs.readdirSync(mpath).filter(f => f.endsWith('.sql')).sort();
      for (const f of files) {
        const sql = fs.readFileSync(path.join(mpath, f), 'utf8');
        db.exec(sql);
      }
    }
    return db;
  } else {
    // JSON fallback: create simple JSON-backed storage under data/jsondb
    const dataDir = path.join(dir, 'jsondb');
    ensureDir(dataDir);
    const tasksFile = path.join(dataDir, 'tasks.json');
    const projectsFile = path.join(dataDir, 'projects.json');
    const progressFile = path.join(dataDir, 'progress_events.json');
    if (!fs.existsSync(tasksFile)) fs.writeFileSync(tasksFile, '[]', 'utf8');
    if (!fs.existsSync(projectsFile)) fs.writeFileSync(projectsFile, '[]', 'utf8');
    if (!fs.existsSync(progressFile)) fs.writeFileSync(progressFile, '[]', 'utf8');
    return { type: 'json', dataDir };
  }
}

module.exports = { init };
