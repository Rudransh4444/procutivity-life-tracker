import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './web/AppNew.jsx';
import './web/theme.css';
import './web/dashboard.css';

// Ensure a safe global stats fallback for older bundles that reference an undeclared `stats` variable
try {
  if (typeof window !== 'undefined') {
    if (typeof window.stats === 'undefined') window.stats = null;
  }
} catch (e) {
  // ignore
}

// Also define an undeclared 'stats' variable in the module scope if not present (defensive)
try {
  if (typeof stats === 'undefined') {
    // eslint-disable-next-line no-var
    var stats = window && window.stats ? window.stats : null; // fall back to window.stats
  }
} catch (e) {
  // ignore
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
