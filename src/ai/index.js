const Database = require('better-sqlite3');
const { fetchByGROQ } = require('../groq/adapter');

function openDb(dbPath) {
  return new Database(dbPath, { readonly: false });
}

async function aiFetchByGROQ(dbOrPath, query) {
  let db;
  let openedHere = false;
  if (typeof dbOrPath === 'string') {
    db = openDb(dbOrPath);
    openedHere = true;
  } else {
    db = dbOrPath; // assume better-sqlite3 Database
  }
  try {
    const rows = await fetchByGROQ(db, query);
    return rows;
  } finally {
    if (openedHere && db && typeof db.close === 'function') db.close();
  }
}

// Minimal LLM stub for MVP. Replace with real adapter later.
async function aiGenerate(prompt, options = {}) {
  // Options may include model, temperature, etc. For MVP return a canned response.
  return {
    text: `AI stub reply for prompt: ${prompt.slice(0, 200)}`,
    metadata: { stub: true },
  };
}

module.exports = { openDb, aiFetchByGROQ, aiGenerate };
