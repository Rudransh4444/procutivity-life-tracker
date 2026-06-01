import React, { useState } from 'react';
import { FiSettings, FiX, FiSave } from 'react-icons/fi';

/**
 * Settings Modal - Configure API keys and preferences
 */
export function SettingsModal({ isOpen, onClose, aiConfig, onSaveConfig }) {
  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [openaiKey, setOpenaiKey] = useState(aiConfig.openaiApiKey || '');
  const [awHost, setAwHost] = useState(aiConfig.awHost || 'http://localhost:5600');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveConfig({
      ...aiConfig,
      apiKey,
      openaiApiKey: openaiKey,
      awHost
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal settings-modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="button button-secondary button-sm" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="settings-section">
          <h3>Groq API Key</h3>
          <p className="text-secondary text-sm">
            Get your free API key at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cool)' }}>
              console.groq.com/keys
            </a>
          </p>
          <input
            type="password"
            placeholder="gsk_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="settings-input"
          />
          <p className="text-muted text-xs mt-sm">
            ⚠️ Keep your API key secret. It's stored locally in your browser only.
          </p>
        </div>

        <div className="settings-section">
          <h3>OpenAI API Key (optional)</h3>
          <p className="text-secondary text-sm">
            Use this if you want to call OpenAI directly instead of a Groq-compatible endpoint.
          </p>
          <input
            type="password"
            placeholder="sk-..."
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            className="settings-input"
          />
          <p className="text-muted text-xs mt-sm">
            ⚠️ Keep your API key secret. It's stored locally in your browser only.
          </p>
        </div>

        <div className="settings-section">
          <h3>ActivityWatch Host</h3>
          <p className="text-secondary text-sm">
            Local ActivityWatch server URL
          </p>
          <input
            type="text"
            placeholder="http://localhost:5600"
            value={awHost}
            onChange={(e) => setAwHost(e.target.value)}
            className="settings-input"
          />
        </div>

        <div className="settings-actions">
          {saved && <span className="text-green" style={{ color: 'var(--accent-green)' }}>✓ Saved</span>}
          <button className="button button-primary" onClick={handleSave}>
            <FiSave size={16} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
