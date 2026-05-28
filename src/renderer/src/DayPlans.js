const React = require('react');
const { useState, useEffect } = React;

function DayPlans({ electron }) {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    async function load() {
      if (electron && electron.invoke) {
        const res = await electron.invoke('list-dayplans');
        if (!res || res.error) return;
        setPlans(res.plans || []);
      }
    }
    load();
  }, []);

  return (
    React.createElement('div', {style: {marginTop: 20}},
      React.createElement('h3', null, 'Saved DayPlans'),
      React.createElement('ul', null, plans.map(p => React.createElement('li', {key: p.id}, `${p.date} — ${p.id}`)))
    )
  );
}

module.exports = DayPlans;
