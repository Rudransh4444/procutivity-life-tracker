const { pollAW } = require('./connector');
const { saveProgressEvent } = require('./store');
const path = require('path');

async function runPolling(dbPath, awHost = 'http://localhost:5600', intervalMs = 30_000) {
  async function handler(progress) {
    try {
      saveProgressEvent(dbPath, progress);
    } catch (err) {
      console.error('Failed to save progress event:', err.message);
    }
  }

  // Simple loop
  while (true) {
    await pollAW(awHost, handler);
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

module.exports = { runPolling };
