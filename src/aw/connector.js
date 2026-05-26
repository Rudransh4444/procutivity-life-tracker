// ActivityWatch connector (MVP)
// This module connects to a running ActivityWatch server and subscribes to bucket events.
// For MVP it polls the AW HTTP API for events and normalizes them into ProgressEvent records.

const fetch = require('node-fetch');

async function fetchBuckets(awHost = 'http://localhost:5600') {
  const res = await fetch(`${awHost}/api/0/buckets/`);
  const data = await res.json();
  return data;
}

async function fetchBucketEvents(bucketId, awHost = 'http://localhost:5600') {
  const res = await fetch(`${awHost}/api/0/buckets/${bucketId}/events/`);
  const data = await res.json();
  return data;
}

async function pollAW(awHost, onEvent) {
  try {
    const buckets = await fetchBuckets(awHost);
    for (const b of buckets) {
      const events = await fetchBucketEvents(b.id, awHost);
      for (const e of events) {
        // normalize minimal structure
        const progress = {
          timestamp: e.timestamp || e.start || Date.now(),
          source: b.id,
          data: e,
        };
        onEvent(progress);
      }
    }
  } catch (err) {
    console.error('AW poll error:', err.message);
  }
}

module.exports = { fetchBuckets, fetchBucketEvents, pollAW };
