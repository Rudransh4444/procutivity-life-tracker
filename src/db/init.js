const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function init(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  // run migrations if present
  const mpath = path.join(__dirname, 'migrations', '001_create_tasks.sql');
  if (fs.existsSync(mpath)) {
    const sql = fs.readFileSync(mpath, 'utf8');
    db.exec(sql);
  }
  return db;
}

module.exports = { init };
