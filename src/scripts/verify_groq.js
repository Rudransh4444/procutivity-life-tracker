const { init } = require('../db/init');
const { fetchByGROQ } = require('../groq/adapter');

(async () => {
  try {
    const db = init('C:/Users/deepa/local-ai-productivity/data/data.sqlite');
    const rows = await fetchByGROQ(db, 'tasks[status == "todo"] { id, title, est_minutes }');
    console.log('GROQ read result:\n', JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Verify GROQ error:', e.message);
  }
})();
