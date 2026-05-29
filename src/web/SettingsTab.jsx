import React, { useState } from 'react';
import { FiSave, FiExternalLink } from 'react-icons/fi';

/**
 * Settings Tab - Configure API keys and preferences
 */
export function SettingsTab({ aiConfig, onSaveConfig }) {
  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [awHost, setAwHost] = useState(aiConfig.awHost || 'http://localhost:5600');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveConfig({
      ...aiConfig,
      apiKey,
      awHost
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-tab">
      <div className="settings-container">
        <div className="settings-section">
          <h2>API & Services</h2>
          
          <div className="settings-field">
            <label htmlFor="api-key">Groq API Key</label>
            <p className="text-secondary text-sm">
              Get your free API key at{' '}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="link-primary"
              >
                console.groq.com/keys <FiExternalLink size={12} style={{ display: 'inline' }} />
              </a>
            </p>
            <input
              id="api-key"
              type="password"
              placeholder="gsk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-glass"
            />
            <p className="text-muted text-xs mt-sm">
              ⚠️ Keep your API key secret. It's stored locally in your browser only.
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="aw-host">ActivityWatch Host</label>
            <p className="text-secondary text-sm">
              Local ActivityWatch server URL for tracking app usage
            </p>
            <input
              id="aw-host"
              type="text"
              placeholder="http://localhost:5600"
              value={awHost}
              onChange={(e) => setAwHost(e.target.value)}
              className="input-glass"
            />
          </div>
        </div>

        <div className="settings-actions">
          <button
            className="button button-primary"
            onClick={handleSave}
          >
            <FiSave size={16} /> Save Settings
          </button>
          {saved && (
            <span className="text-green" style={{ color: 'var(--accent-green)', marginLeft: '12px' }}>
              ✓ Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
