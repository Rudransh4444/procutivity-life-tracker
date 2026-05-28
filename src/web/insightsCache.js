// insightsCache.js — small cache layer for AI outputs
import { loadJSON, saveJSON } from './storage.js';
import { uid } from './storage.js';

const CACHE_KEY = 'ai_insights_cache';

export async function getCache() {
  return await loadJSON(CACHE_KEY, {});
}

export async function getCached(hash) {
  const c = await getCache();
  const entry = c[hash];
  if (!entry) return null;
  // TTL check (default 7 days)
  const age = Date.now() - new Date(entry.createdAt).getTime();
  if (entry.ttl && age > entry.ttl) return null;
  return entry.value;
}

export async function setCached(hash, value, ttl = 1000 * 60 * 60 * 24 * 7) {
  const c = await getCache();
  c[hash] = { id: uid('cache'), createdAt: new Date().toISOString(), ttl, value };
  await saveJSON(CACHE_KEY, c);
}

export default { getCached, setCached };
