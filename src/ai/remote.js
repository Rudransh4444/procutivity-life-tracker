// Remote AI adapter supporting OpenAI Chat and generic endpoints
const fetch = require('node-fetch');

async function callRemoteModel(apiUrl, apiKey, prompt, options = {}) {
  // If apiUrl is omitted but provider is openai, default to OpenAI Chat
  const provider = options.provider || (apiUrl && apiUrl.includes('openai') ? 'openai' : 'generic');

  if (provider === 'openai') {
    const url = apiUrl || 'https://api.openai.com/v1/chat/completions';
    const body = {
      model: options.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: options.system || 'You are a calm productivity assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature ?? 0.6,
      max_tokens: options.max_tokens ?? 512,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey || ''}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Model API error: ' + res.status + ' ' + (await res.text()));
    const data = await res.json();
    // Try to extract text from chat response
    const text = data.choices && data.choices[0] && (data.choices[0].message?.content || data.choices[0].text) || JSON.stringify(data);
    return { text, meta: data };
  }

  // Generic JSON POST shape
  const body = { prompt, ...options }; 
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey || ''}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Model API error: ' + res.status);
  const data = await res.json();
  return { text: data.text || data.output || JSON.stringify(data), meta: data };
}

module.exports = { callRemoteModel };
