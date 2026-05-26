const assert = require('assert');
const { translateGROQ } = require('./adapter');

function runTests() {
  // Test 1: basic tasks query with order and range
  const q1 = 'tasks[priority >= 3 && status == "todo"] | order(due_date asc) [0..1] { id, title }';
  const r1 = translateGROQ(q1);
  assert(r1.sql.includes('FROM tasks'), 'should target tasks table');
  assert(r1.sql.includes('ORDER BY due_date ASC'), 'should include order clause');
  assert(r1.sql.includes('LIMIT 2 OFFSET 0'), 'should include correct limit/offset for [0..1]');

  // Test 2: star query with _type
  const q2 = '*[_type == "task" && est_minutes > 30] { id, est_minutes }';
  const r2 = translateGROQ(q2);
  assert(r2.sql.includes('FROM tasks'), 'star query should map _type=="task" to tasks');

  // Test 3: simple filter
  const q3 = 'tasks[status == "done"] { id }';
  const r3 = translateGROQ(q3);
  assert(r3.sql.includes("WHERE status = ?"), 'should translate equality to parameterized SQL');

  console.log('All GROQ translator tests passed');
}

try {
  runTests();
  process.exit(0);
} catch (err) {
  console.error('Test failed:', err.message);
  process.exit(2);
}
