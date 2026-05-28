const React = require('react');
const ReactDOM = require('react-dom');
const App = require('./App');
const DayPlans = require('./DayPlans');

function Root() {
  return React.createElement('div', null, React.createElement(App), React.createElement(DayPlans, { electron: window.electron }));
}

ReactDOM.render(React.createElement(Root), document.getElementById('root'));
