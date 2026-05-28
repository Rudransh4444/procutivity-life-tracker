// storage.js — simple synchronous localStorage-backed KV store (local-first)
// Exports: loadJSON, saveJSON, ensureSeed, uid

// This implementation is intentionally synchronous to keep the UI predictable
// and to honor the "local-first" design. It uses localStorage only.

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // best-effort no-op on quota errors
    console.warn('saveJSON failed for', key, e?.message);
  }
}

export function ensureSeed(key, fallback) {
  try {
    const cur = loadJSON(key, null);
    if (cur == null) saveJSON(key, fallback);
    return loadJSON(key, fallback);
  } catch (e) {
    saveJSON(key, fallback);
    return fallback;
  }
}

export function uid(prefix = 'id') {
  const suffix = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${suffix}`;
}
