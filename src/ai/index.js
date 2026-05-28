let Database;
try { Database = require('better-sqlite3'); } catch (e) { Database = null; }
const { fetchByGROQ } = require('../groq/adapter');
const { callRemoteModel } = require('./remote');

function openDb(dbPath) {
  if (Database) return new Database(dbPath, { readonly: false });
  // use init to create jsondb and return json descriptor
  const init = require('../db/init').init;
  const descriptor = init(dbPath);
  return descriptor;
}

async function aiFetchByGROQ(dbOrPath, query) {
  let db;
  let openedHere = false;
  if (typeof dbOrPath === 'string') {
    db = openDb(dbOrPath);
    openedHere = true;
  } else {
    db = dbOrPath; // assume better-sqlite3 Database or json descriptor
  }
  try {
    const rows = await fetchByGROQ(db, query);
    return rows;
  } finally {
    if (openedHere && db && db.close && typeof db.close === 'function') db.close();
  }
}

// aiGenerate: uses remote model if configured via options, otherwise stub
async function aiGenerate(prompt, options = {}) {
  if (options && options.remote && options.remote.apiUrl) {
    try {
      const resp = await callRemoteModel(options.remote.apiUrl, options.remote.apiKey, prompt, options.remote);
      return { text: resp.text, metadata: resp.meta };
    } catch (e) {
      return { error: e.message };
    }
  }
  return {
    text: `AI stub reply for prompt: ${prompt.slice(0, 200)}`,
    metadata: { stub: true },
  };
}

module.exports = { openDb, aiFetchByGROQ, aiGenerate };