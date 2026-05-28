// Minimal GROQ -> SQLite adapter (MVP subset)
// Supports patterns like:
//  - tasks[priority >= 3 && status == "todo"] | order(due_date asc) [0..9] { id, title, due_date }
//  - *[_type == "task" && priority > 2]

const fs = require('fs');
const path = require('path');

function parseRange(rangeStr) {
  const m = rangeStr && rangeStr.match(/\[(\d+)\.\.(\d+)\]/);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = parseInt(m[2], 10);
  if (end < start) return null;
  return { offset: start, limit: end - start + 1 };
}

function parseOrder(query) {
  const m = query.match(/order\((\w+)\s+(asc|desc)\)/i);
  if (!m) return null;
  return { field: m[1], dir: m[2].toUpperCase() };
}

function parseFields(fieldsStr) {
  if (!fieldsStr) return ['*'];
  return fieldsStr
    .replace(/[{}]/g, '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function translateFilterToSql(filter, params) {
  // split on && and || (supporting only && for MVP)
  const clauses = filter.split('&&').map(s => s.trim()).filter(Boolean);
  const sqlClauses = [];
  clauses.forEach((cl, idx) => {
    // operators: ==, !=, >=, <=, >, <
    const opMatch = cl.match(/(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)/);
    if (!opMatch) throw new Error('Unsupported filter: ' + cl);
    let [, field, op, rawVal] = opMatch;
    rawVal = rawVal.trim();
    let paramName = '?';
    let value = rawVal.replace(/^"|"$/g, '');
    if (/^\d+$/.test(value)) value = Number(value);
    // Map operator
    const sqlOp = op === '==' ? '=' : op;
    sqlClauses.push(`${field} ${sqlOp} ${paramName}`);
    params.push(value);
  });
  return sqlClauses.join(' AND ');
}

function translateGROQ(query) {
  // naive parsing for MVP
  // extract fields selection {...}
  const fieldMatch = query.match(/\{([^}]*)\}\s*$/);
  const fields = fieldMatch ? parseFields(fieldMatch[0]) : ['*'];
  const withoutFields = fieldMatch ? query.replace(fieldMatch[0], '') : query;

  // extract range [a..b]
  const rangeMatch = withoutFields.match(/\[\d+\.\.\d+\]/);
  const range = parseRange(rangeMatch ? rangeMatch[0] : null);
  const withoutRange = rangeMatch ? withoutFields.replace(rangeMatch[0], '') : withoutFields;

  // order
  const order = parseOrder(withoutRange);
  const withoutOrder = order ? withoutRange.replace(/order\([^)]*\)/i, '') : withoutRange;

  // type and filter: e.g. tasks[...], or *[_type == "task" && ...]
  let type = null;
  let filter = null;
  const typeArrayMatch = withoutOrder.match(/^\s*(\w+)\s*\[([^\]]*)\]/);
  if (typeArrayMatch) {
    type = typeArrayMatch[1];
    filter = typeArrayMatch[2].trim();
  } else {
    const starMatch = withoutOrder.match(/\*\s*\[([^\]]*)\]/);
    if (starMatch) {
      filter = starMatch[1].trim();
      const tMatch = filter.match(/_type\s*==\s*"(\w+)"/);
      if (tMatch) type = tMatch[1] + 's'; // map singular type -> table name (tasks)
    }
  }

  if (!type) throw new Error('Could not determine target type/table from GROQ query');

  const params = [];
  const where = filter ? translateFilterToSql(filter, params) : '1=1';
  const columns = fields.join(', ');
  let sql = `SELECT ${columns} FROM ${type} WHERE ${where}`;
  if (order) sql += ` ORDER BY ${order.field} ${order.dir}`;
  if (range) sql += ` LIMIT ${range.limit} OFFSET ${range.offset}`;
  return { sql, params, fields, order, range, filter, type };
}

function translateFilterToFunc(filter) {
  if (!filter) return null;
  const clauses = filter.split('&&').map(s => s.trim()).filter(Boolean);
  const ops = clauses.map(cl => {
    const m = cl.match(/(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)/);
    if (!m) return null;
    let [, field, op, rawVal] = m;
    rawVal = rawVal.trim();
    let val = rawVal.replace(/^"|"$/g, '');
    if (/^\d+$/.test(val)) val = Number(val);
    return { field, op, val };
  }).filter(Boolean);
  return (row) => {
    return ops.every(o => {
      const rv = row[o.field];
      const v = o.val;
      switch (o.op) {
        case '==': return String(rv) === String(v);
        case '!=': return String(rv) !== String(v);
        case '>': return Number(rv) > Number(v);
        case '<': return Number(rv) < Number(v);
        case '>=': return Number(rv) >= Number(v);
        case '<=': return Number(rv) <= Number(v);
        default: return false;
      }
    });
  };
}

async function fetchByGROQ(db, query) {
  const t = translateGROQ(query);
  // JSON fallback
  if (db && db.type === 'json') {
    const file = path.join(db.dataDir, `${t.type}.json`);
    if (!fs.existsSync(file)) return [];
    let raw = fs.readFileSync(file, 'utf8');
        // strip BOM if present
        raw = raw.replace(/^\uFEFF/, '');
        let rows = JSON.parse(raw || '[]');
    // apply filter
    if (t.filter) {
      const fn = translateFilterToFunc(t.filter);
      if (fn) rows = rows.filter(fn);
    }
    // apply order
    if (t.order && t.order.field) {
      rows = rows.sort((a, b) => {
        const av = a[t.order.field];
        const bv = b[t.order.field];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (t.order.dir === 'ASC') return av < bv ? -1 : av > bv ? 1 : 0;
        return av > bv ? -1 : av < bv ? 1 : 0;
      });
    }
    // apply range
    if (t.range) rows = rows.slice(t.range.offset, t.range.offset + t.range.limit);
    // project fields
    if (t.fields && !(t.fields.length === 1 && t.fields[0] === '*')) {
      rows = rows.map(r => {
        const o = {};
        for (const f of t.fields) o[f] = r[f];
        return o;
      });
    }
    return rows;
  }

  // SQLite path
  const { sql, params } = t;
  // eslint-disable-next-line no-console
  console.log('[groq] SQL:', sql, 'params:', params);
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  return rows;
}

module.exports = { translateGROQ, fetchByGROQ };
