const init = require('../db/init').init;
const { fetchByGROQ } = require('../groq/adapter');
const nbat = require('../nbat/engine');

(async () => {
  try {
    const db = init('C:/Users/deepa/local-ai-productivity/data/data.sqlite');
    const rows = await fetchByGROQ(db, 'tasks[status == "todo"] { id, title, est_minutes, priority }');
    console.log('tasks count:', rows.length);
    const next = nbat.selectNextBest(rows);
    console.log('NBAT next:', JSON.stringify(next, null, 2));
  } catch (e) {
    console.error('Verify NBAT error:', e.message);
  }
})();
