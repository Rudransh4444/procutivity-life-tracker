const React = require('react');
const { useState, useEffect } = React;

function App() {
  const [nba, setNba] = useState(null);
  useEffect(() => {
    if (window.electron && window.electron.invoke) {
      window.electron.invoke('get-next-best').then(res => setNba(res)).catch(err => setNba({ error: err.message }));
    }
  }, []);

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
      )
    )
  );
}

module.exports = App;
