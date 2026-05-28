const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let init;
let fetchByGROQ;
let nbat;
let useMock = false;
try {
  init = require('./db/init').init;
} catch (e) {
  console.warn('DB init not available:', e.message);
  init = (dbPath) => ({ close: () => {} });
  useMock = true;
}
try {
  fetchByGROQ = require('./groq/adapter').fetchByGROQ;
} catch (e) {
  console.warn('GROQ adapter not available:', e.message);
  fetchByGROQ = async () => [];
}
try {
  nbat = require('./nbat/engine');
} catch (e) {
  console.warn('NBAT engine not available:', e.message);
  nbat = { selectNextBest: () => null };
}

// If DB missing, use mock sample tasks for demo
if (useMock) {
  const sample = require('./mock/sample_tasks');
  fetchByGROQ = async () => sample.tasks;
}

let ai;
try {
  ai = require('./ai/index');
} catch (e) {
  console.warn('AI adapter not available:', e.message);
  ai = { aiGenerate: async (prompt, options) => ({ text: 'AI adapter not available (stub).', metadata: {} }) };
}

ipcMain.handle('ai-chat', async (event, prompt, options) => {
  try {
    const res = await ai.aiGenerate(prompt || '', options || {});
    return res;
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('plan-day', async (event, dateISO) => {
  try {
    const planner = require('./ai/planner');
    const dbPath = path.join(app.getPath('userData'), 'data.sqlite');
    // load AI config from settings
    let aiCfg = {};
    try { aiCfg = require('./settings/ai').getConfig() } catch (e) { aiCfg = {}; }
    const res = await planner.planDay(dbPath, dateISO, { remote: aiCfg });
    return res;
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('list-dayplans', async () => {
  try {
    const { listDayPlans } = require('./db/dayplan_store');
    const dbPath = path.join(app.getPath('userData'), 'data.sqlite');
    const plans = listDayPlans(dbPath);
    return { plans };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('get-ai-config', async () => {
  try {
    const cfg = require('./settings/ai').getConfig();
    return { cfg };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('set-ai-config', async (event, cfg) => {
  try {
    const ok = require('./settings/ai').setConfig(cfg || {});
    return { ok };
  } catch (e) { return { error: e.message }; }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-next-best', async () => {
  const dbPath = path.join(app.getPath('userData'), 'data.sqlite');
  const db = init(dbPath);
  try {
    const q = 'tasks[status == "todo"] | order(due_date asc) [0..49] { id, title, est_minutes, due_date, priority, status }';
    const rows = await fetchByGROQ(db, q);
    const next = nbat.selectNextBest(rows);
    return next || { task_id: null, action_text: 'No tasks found', est_minutes: 0, reason: 'empty' };
  } catch (err) {
    return { error: err.message };
  } finally {
    if (db && typeof db.close === 'function') db.close();
  }
});

ipcMain.handle('get-blocked', async () => {
  try {
    const settings = require('./settings/blocked');
    const list = settings.getBlocked();
    return { blocked: list };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('set-blocked', async (event, blockedList) => {
  try {
    const settings = require('./settings/blocked');
    const ok = settings.setBlocked(blockedList || []);
    return { ok };
  } catch (e) {
    return { error: e.message };
  }
});
