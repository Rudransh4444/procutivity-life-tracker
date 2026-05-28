const fs = require('fs');
const path = require('path');

function dataPath() {
  return path.join(__dirname, '..', 'data', 'ai_config.json');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getConfig() {
  const p = dataPath();
  try {
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.warn('getConfig error', e.message);
    return {};
  }
}

function setConfig(cfg) {
  const p = dataPath();
  try {
    ensureDir(p);
    fs.writeFileSync(p, JSON.stringify(cfg || {}, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('setConfig error', e.message);
    return false;
  }
}

module.exports = { getConfig, setConfig, dataPath };
