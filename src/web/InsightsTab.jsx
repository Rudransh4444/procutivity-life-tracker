import React, { useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { loadJSON, saveJSON } from './storage.js';
import aiAdapter from './aiAdapter.js';

const INSIGHTS_KEY = 'insights';

export default function InsightsTab() {
  const [insights, setInsights] = useState(() => loadJSON(INSIGHTS_KEY, []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setInsights(loadJSON(INSIGHTS_KEY, []));
  }, []);

  async function generateInsight() {
    setLoading(true);
    setError('');
    try {
      const prompt = 'Provide one short actionable insight about productivity based on recent tasks and focus patterns.';
      const resp = await aiAdapter.requestInsight(prompt, { ttl: 1000 * 60 * 60 * 24 });
      const text = resp?.text || 'No insight.';
      const item = { id: `ins-${Date.now()}`, text, at: new Date().toISOString() };
      const next = [item, ...insights];
      saveJSON(INSIGHTS_KEY, next);
      setInsights(next);
    } catch (e) {
      setError(e.message || 'Failed to generate insight');
    } finally {
      setLoading(false);
    }
  }

  function clearInsights() {
    saveJSON(INSIGHTS_KEY, []);
    setInsights([]);
  }

  return (
    <div className="page insights-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Insights</h2>
          <div>
            <button className="button button-secondary" onClick={generateInsight} disabled={loading}>
              {loading ? 'Thinking…' : (<><FiRefreshCw size={14} /> Generate</>)}
            </button>
            <button className="button button-ghost" onClick={clearInsights} style={{ marginLeft: 8 }}>Clear</button>
          </div>
        </div>
        {error && <div className="text-muted" style={{ marginTop: 8, color: 'var(--accent-red)' }}>{error}</div>}
        <div style={{ marginTop: 12 }}>
          {insights.length === 0 ? (
            <p className="text-muted">No insights yet. Generate one to get quick suggestions.</p>
          ) : (
            insights.map((ins) => (
              <div key={ins.id} className="card small-card" style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(ins.at).toLocaleString()}</div>
                <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{ins.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
