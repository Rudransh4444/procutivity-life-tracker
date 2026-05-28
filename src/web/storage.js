// storage.js — IndexedDB-backed KV store with localStorage fallback
// Exports: loadJSON, saveJSON, ensureSeed, uid

const DB_NAME = 'ai-life-db';
const DB_VERSION = 1;
const STORE_KV = 'kv';

function openDB() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV, { keyPath: 'k' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null); // fallback on error
  });
}

async function getKV(key) {
  try {
    const db = await openDB();
    if (!db) return localStorage.getItem(key);
    return await new Promise((res) => {
      const tx = db.transaction(STORE_KV, 'readonly');
      const store = tx.objectStore(STORE_KV);
      const r = store.get(key);
      r.onsuccess = () => {
        const v = r.result ? r.result.v : null;
        res(v == null ? null : v);
      };
      r.onerror = () => res(null);
    });
  } catch {
    return localStorage.getItem(key);
  }
}

async function setKV(key, value) {
  try {
    const db = await openDB();
    if (!db) {
      localStorage.setItem(key, value);
      return;
    }
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE_KV, 'readwrite');
      const store = tx.objectStore(STORE_KV);
      const r = store.put({ k: key, v: value });
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  } catch {
    localStorage.setItem(key, value);
  }
}

export async function loadJSON(key, fallback) {
  try {
    const raw = await getKV(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function saveJSON(key, value) {
  try {
    await setKV(key, JSON.stringify(value));
  } catch (e) {
    // best-effort fallback
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export async function ensureSeed(key, fallback) {
  const current = await loadJSON(key, null);
  if (current == null) await saveJSON(key, fallback);
  return await loadJSON(key, fallback);
}

export function uid(prefix = 'id') {
  const suffix = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${suffix}`;
}
