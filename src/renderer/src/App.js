const React = require('react');
const { useState, useEffect } = React;

function App() {
  const [nba, setNba] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    if (window.electron && window.electron.invoke) {
      window.electron.invoke('get-next-best').then(res => setNba(res)).catch(err => setNba({ error: err.message }));
      window.electron.invoke('get-blocked').then(res => { if (!res.error) setBlocked(res.blocked || []); });
    }
  }, []);

  function addDomain() {
    const d = (newDomain || '').trim();
    if (!d) return;
    if (!blocked.includes(d)) setBlocked([...blocked, d]);
    setNewDomain('');
  }

  function removeDomain(d) {
    setBlocked(blocked.filter(x => x !== d));
  }

  function saveBlocked() {
    if (window.electron && window.electron.invoke) {
      window.electron.invoke('set-blocked', blocked).then(res => {
        if (res && res.ok) alert('Blocked domains saved');
        else alert('Save failed: ' + (res.error || 'unknown'));
      });
    }
  }

  return (
    React.createElement('div', {style: {background: '#081028', color: '#dbeafe', height: '100vh', padding: 24}},
      React.createElement('h1', {style: {marginTop: 20}}, 'Local AI Productivity (MVP)'),
      React.createElement('h2', {style: {marginTop: 20}}, 'Next Best Action'),
      React.createElement('div', {style: {marginTop: 10}},
        React.createElement('div', {style: {marginTop: 10, padding: 16, borderRadius: 12, background: '#062038'}},
          nba ? (
            nba.error ? React.createElement('div', null, 'Error: ' + nba.error) :
            React.createElement('div', null,
              React.createElement('div', {style: {fontSize: 18, fontWeight: 600}}, nba.action_text),
              React.createElement('div', {style: {marginTop: 8, color: '#9ad'}}, 'Est: ' + nba.est_minutes + ' min'),
              React.createElement('div', {style: {marginTop: 8, color: '#9ad'}}, 'Reason: ' + (nba.reason || ''))
            )
          ) : React.createElement('div', null, 'Loading...')
        )
      ),

      React.createElement('h2', {style: {marginTop: 28}}, 'Blocked Domains'),
      React.createElement('div', {style: {marginTop: 10, padding: 16, borderRadius: 12, background: '#062038', maxWidth: 640}},
        React.createElement('div', {style: {display: 'flex', gap: 8}},
          React.createElement('input', {
            value: newDomain,
            onChange: (e) => setNewDomain(e.target.value),
            placeholder: 'example.com',
            style: {flex: 1, padding: 8, borderRadius: 8, border: 'none'}
          }),
          React.createElement('button', {onClick: addDomain, style: {padding: '8px 12px', borderRadius: 8, background: '#0ea5a1', border: 'none', cursor: 'pointer'}}, 'Add')
        ),
        React.createElement('ul', {style: {marginTop: 12}},
          blocked.map(d => React.createElement('li', {key: d, style: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0'}},
            React.createElement('span', null, d),
            React.createElement('button', {onClick: () => removeDomain(d), style: {padding: '4px 8px', borderRadius: 6, background: '#ffb020', border: 'none', cursor: 'pointer'}}, 'Remove')
          ))
        ),
        React.createElement('div', {style: {marginTop: 12, display: 'flex', gap: 8}},
          React.createElement('button', {onClick: saveBlocked, style: {padding: '8px 12px', borderRadius: 8, background: '#0ea5a1', border: 'none', cursor: 'pointer'}}, 'Save'),
          React.createElement('button', {onClick: () => { setBlocked([]); saveBlocked(); }, style: {padding: '8px 12px', borderRadius: 8, background: '#334155', border: 'none', cursor: 'pointer'}}, 'Clear')
        )
      ),

      React.createElement('h2', {style: {marginTop: 28}}, 'Plan my day'),
      React.createElement('div', {style: {marginTop: 10}},
        React.createElement('button', {onClick: async () => {
          if (window.electron && window.electron.invoke) {
            setPlanLoading(true);
            const res = await window.electron.invoke('plan-day', new Date().toISOString());
            setPlanLoading(false);
            setPlan(res);
          }
        }, style: {padding: '8px 12px', borderRadius: 8, background: '#0ea5a1', border: 'none', cursor: 'pointer'}}, planLoading ? 'Planning…' : 'Plan my day')
      ),
      plan ? React.createElement('div', {style: {marginTop: 12, padding: 16, borderRadius: 12, background: '#041226', maxWidth: 720}},
        React.createElement('div', {style: {fontWeight: 600, marginBottom: 8}}, 'Next Best Action: ' + (plan.next_best_action_id || 'None')),
        React.createElement('ul', null, (plan.plan_items || []).map(item => React.createElement('li', {key: item.id, style: {marginBottom: 6}}, item.action_text + (item.scheduled_time ? (' @ ' + item.scheduled_time) : '')))
      ) : null,

      React.createElement('h2', {style: {marginTop: 28}}, 'Chat (AI)'),
      React.createElement('div', {style: {marginTop: 10, padding: 16, borderRadius: 12, background: '#062038', maxWidth: 640}},
        React.createElement('div', {style: {minHeight: 120, maxHeight: 300, overflowY: 'auto', padding: 8, background: '#041226', borderRadius: 8}},
          React.createElement('div', null, /* messages */),
        ),
        React.createElement('div', {style: {display: 'flex', gap: 8, marginTop: 8}},
          React.createElement('input', {
            id: 'chat-input',
            placeholder: 'Ask the planner or breakdown a task...',
            style: {flex: 1, padding: 8, borderRadius: 8, border: 'none'},
            onKeyDown: (e) => {
              if (e.key === 'Enter') {
                const val = e.target.value.trim(); if (!val) return; e.target.value = '';
                if (window.electron && window.electron.invoke) {
                  window.electron.invoke('ai-chat', val).then(res => {
                    alert(res && res.text ? res.text : 'No response');
                  });
                }
              }
            }
          }),
          React.createElement('button', {onClick: () => { const el = document.getElementById('chat-input'); if (!el) return; const val = el.value.trim(); if (!val) return; el.value = ''; if (window.electron && window.electron.invoke) { window.electron.invoke('ai-chat', val).then(res => { alert(res && res.text ? res.text : 'No response'); }); } }, style: {padding: '8px 12px', borderRadius: 8, background: '#0ea5a1', border: 'none', cursor: 'pointer'}}, 'Send')
        )
      ),
+      React.createElement('h3', {style: {marginTop: 16}}, 'AI settings'),
+      React.createElement('div', {style: {marginTop: 8, padding: 12, borderRadius: 8, background: '#041226', maxWidth: 640}},
+        React.createElement('input', {id: 'ai-api-url', placeholder: 'API URL (optional, openai default)', style: {width: '100%', padding: 8, borderRadius: 6, border: 'none', marginBottom: 8}}),
+        React.createElement('input', {id: 'ai-api-key', placeholder: 'API Key (will be stored locally)', style: {width: '100%', padding: 8, borderRadius: 6, border: 'none', marginBottom: 8}}),
+        React.createElement('div', {style: {display: 'flex', gap: 8}},
+          React.createElement('button', {onClick: async () => {
+            const url = document.getElementById('ai-api-url').value.trim();
+            const key = document.getElementById('ai-api-key').value.trim();
+            if (window.electron && window.electron.invoke) {
+              const res = await window.electron.invoke('set-ai-config', { apiUrl: url, apiKey: key, provider: url.includes('openai') ? 'openai' : 'generic' });
+              if (res && res.ok) alert('AI config saved'); else alert('Save failed');
+            }
+          }, style: {padding: '8px 12px', borderRadius: 8, background: '#0ea5a1', border: 'none', cursor: 'pointer'}}, 'Save AI config'),
+          React.createElement('button', {onClick: async () => {
+            if (window.electron && window.electron.invoke) {
+              const res = await window.electron.invoke('get-ai-config');
+              if (!res || res.error) { alert('Read failed'); return; }
+              const cfg = res.cfg || {};
+              document.getElementById('ai-api-url').value = cfg.apiUrl || '';
+              document.getElementById('ai-api-key').value = cfg.apiKey || '';
+            }
+          }, style: {padding: '8px 12px', borderRadius: 8, background: '#334155', border: 'none', cursor: 'pointer'}}, 'Load AI config')
+        )
+      ),
        React.createElement('div', {style: {display: 'flex', gap: 8, marginTop: 8}},
          React.createElement('input', {
            id: 'chat-input',
            placeholder: 'Ask the planner or breakdown a task...',
            style: {flex: 1, padding: 8, borderRadius: 8, border: 'none'},
            onKeyDown: (e) => {
              if (e.key === 'Enter') {
                const val = e.target.value.trim(); if (!val) return; e.target.value = '';
                if (window.electron && window.electron.invoke) {
                  window.electron.invoke('ai-chat', val).then(res => {
                    alert(res && res.text ? res.text : 'No response');
                  });
                }
              }
            }
          }),
          React.createElement('button', {onClick: () => { const el = document.getElementById('chat-input'); if (!el) return; const val = el.value.trim(); if (!val) return; el.value = ''; if (window.electron && window.electron.invoke) { window.electron.invoke('ai-chat', val).then(res => { alert(res && res.text ? res.text : 'No response'); }); } }, style: {padding: '8px 12px', borderRadius: 8, background: '#0ea5a1', border: 'none', cursor: 'pointer'}}, 'Send')
        )
      )
    )
  );
}

module.exports = App;
