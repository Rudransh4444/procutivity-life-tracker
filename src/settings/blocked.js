const fs = require('fs');
const path = require('path');

function dataPath() {
  // store in project data folder
  return path.join(__dirname, '..', 'data', 'blocked.json');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getBlocked() {
  const p = dataPath();
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.warn('getBlocked error', e.message);
    return [];
  }
}

function setBlocked(list) {
  const p = dataPath();
  try {
    ensureDir(p);
    fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('setBlocked error', e.message);
    return false;
  }
}

module.exports = { getBlocked, setBlocked, dataPath };
