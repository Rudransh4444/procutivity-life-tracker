// aiAdapter.js — lightweight on-demand AI adapter that respects caching and minimal payload rules
import insightsCache from './insightsCache.js';
import { loadJSON } from './storage.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

function hashInput(str) {
  // simple hash
  let h = 0; for (let i=0;i<str.length;i++) h = (h<<5)-h + str.charCodeAt(i); return String(h >>> 0);
}

export async function requestInsight(prompt, options = {}) {
  // options: model, ttl
  const settings = await loadJSON('settings', {});
  const apiKey = settings.groqApiKey || process.env.GROQ_API_KEY;
  const payload = JSON.stringify({ prompt, options: { model: options.model || 'llama-3.1-8b-instant' } });
  const h = hashInput(payload);
  const cached = await insightsCache.getCached(h);
  if (cached) return { fromCache: true, text: cached };

  if (!apiKey) {
    // Do not call AI without explicit key — return placeholder suggestion
    const fallback = `No API key configured. To get real insights, set your GROQ API key in Settings.`;
    await insightsCache.setCached(h, fallback, options.ttl || 1000*60*60*24);
    return { fromCache: false, text: fallback };
  }

  // call GROQ (one-off call)
  try {
    const resp = await fetch(GROQ_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: options.model || 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: options.max_tokens || 512 })
    });
    const json = await resp.json();
    const text = json?.choices?.[0]?.message?.content || json?.text || JSON.stringify(json);
    await insightsCache.setCached(h, text, options.ttl || 1000*60*60*24*7);
    return { fromCache: false, text, raw: json };
  } catch (e) {
    const err = `AI call failed: ${e.message}`;
    await insightsCache.setCached(h, err, options.ttl || 1000*60*60*24);
    return { fromCache: false, text: err };
  }
}

export default { requestInsight };
