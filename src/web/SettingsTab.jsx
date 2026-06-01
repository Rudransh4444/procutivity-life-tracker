import React, { useState } from 'react';
import { FiSave, FiExternalLink } from 'react-icons/fi';

/**
 * Settings Tab - Configure API keys and preferences
 */
export function SettingsTab({ aiConfig, onSaveConfig }) {
  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [awHost, setAwHost] = useState(aiConfig.awHost || 'http://localhost:5600');
  const [githubOwner, setGithubOwner] = useState(aiConfig.githubOwner || '');
  const [githubRepo, setGithubRepo] = useState(aiConfig.githubRepo || '');
  const [githubBranch, setGithubBranch] = useState(aiConfig.githubBranch || 'main');
  const [githubPathPrefix, setGithubPathPrefix] = useState(aiConfig.githubPathPrefix || 'Obsidian/Daily');
  const [githubToken, setGithubToken] = useState(aiConfig.githubToken || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveConfig({
      ...aiConfig,
      apiKey,
      awHost,
      githubOwner,
      githubRepo,
      githubBranch,
      githubPathPrefix,
      githubToken
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
                style={{ color: 'var(--accent-cool)' }}
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

          <div className="settings-field">
            <label htmlFor="github-owner">GitHub Owner</label>
            <p className="text-secondary text-sm">
              Sync daily notes directly into the repository that backs your Obsidian vault.
            </p>
            <input
              id="github-owner"
              type="text"
              placeholder="your-username"
              value={githubOwner}
              onChange={(e) => setGithubOwner(e.target.value)}
              className="input-glass"
            />
          </div>

          <div className="settings-field">
            <label htmlFor="github-repo">GitHub Repository</label>
            <input
              id="github-repo"
              type="text"
              placeholder="your-vault-repo"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              className="input-glass"
            />
          </div>

          <div className="settings-field settings-grid">
            <div>
              <label htmlFor="github-branch">Branch</label>
              <input
                id="github-branch"
                type="text"
                placeholder="main"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                className="input-glass"
              />
            </div>
            <div>
              <label htmlFor="github-path-prefix">Note Path Prefix</label>
              <input
                id="github-path-prefix"
                type="text"
                placeholder="Obsidian/Daily"
                value={githubPathPrefix}
                onChange={(e) => setGithubPathPrefix(e.target.value)}
                className="input-glass"
              />
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="github-token">GitHub Access Token</label>
            <p className="text-secondary text-sm">
              Use a fine-grained token with contents write access to the vault repo. Stored locally only.
            </p>
            <input
              id="github-token"
              type="password"
              placeholder="ghp_..."
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
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
