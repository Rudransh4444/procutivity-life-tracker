const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function saveDayPlan(dbPath, dayPlan) {
  const dir = path.dirname(dbPath);
  const dataDir = path.join(dir, 'jsondb');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'dayplans.json');
  let arr = [];
  if (fs.existsSync(file)) arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
  const id = uuidv4();
  const wrapped = Object.assign({ id }, dayPlan);
  arr.push(wrapped);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf8');
  return wrapped;
}

function listDayPlans(dbPath) {
  const dir = path.dirname(dbPath);
  const dataDir = path.join(dir, 'jsondb');
  const file = path.join(dataDir, 'dayplans.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
}

module.exports = { saveDayPlan, listDayPlans };
