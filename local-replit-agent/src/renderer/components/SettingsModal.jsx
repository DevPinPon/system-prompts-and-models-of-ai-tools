import React, { useState, useEffect } from 'react';

const MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Recommended)' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (Fast)' },
];

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.api.settings.getAll().then(setSettings);
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    for (const [key, value] of Object.entries(settings)) {
      await window.api.settings.set(key, value);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        width: 520,
        maxHeight: '80vh',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Settings</h2>
          <button onClick={onClose} style={{
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            fontSize: 18,
          }}>
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Claude API */}
          <Section title="Claude AI">
            <Field label="API Key">
              <input
                type="password"
                value={settings.claudeApiKey || ''}
                onChange={e => updateSetting('claudeApiKey', e.target.value)}
                placeholder="sk-ant-..."
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Get your API key from console.anthropic.com. For Claude Max, use your session key.
              </div>
            </Field>

            <Field label="Model">
              <select
                value={settings.claudeModel || 'claude-sonnet-4-20250514'}
                onChange={e => updateSetting('claudeModel', e.target.value)}
                style={inputStyle}
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Max Tokens">
              <input
                type="number"
                value={settings.maxTokens || 8192}
                onChange={e => updateSetting('maxTokens', parseInt(e.target.value))}
                style={inputStyle}
              />
            </Field>
          </Section>

          {/* Google Cloud */}
          <Section title="Google Cloud">
            <Field label="Project ID">
              <input
                type="text"
                value={settings.gcpProjectId || ''}
                onChange={e => updateSetting('gcpProjectId', e.target.value)}
                placeholder="my-gcp-project"
                style={inputStyle}
              />
            </Field>

            <Field label="Region">
              <select
                value={settings.gcpRegion || 'us-central1'}
                onChange={e => updateSetting('gcpRegion', e.target.value)}
                style={inputStyle}
              >
                {['us-central1', 'us-east1', 'us-west1', 'europe-west1', 'asia-east1'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>

            <Field label="Service Account Key File">
              <input
                type="text"
                value={settings.gcpKeyFile || ''}
                onChange={e => updateSetting('gcpKeyFile', e.target.value)}
                placeholder="/path/to/service-account-key.json"
                style={inputStyle}
              />
            </Field>
          </Section>

          {/* Editor */}
          <Section title="Editor">
            <Field label="Font Size">
              <input
                type="number"
                value={settings.fontSize || 14}
                onChange={e => updateSetting('fontSize', parseInt(e.target.value))}
                min={10}
                max={24}
                style={inputStyle}
              />
            </Field>

            <Field label="Auto Save">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.autoSave ?? true}
                  onChange={e => updateSetting('autoSave', e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>Save files automatically</span>
              </label>
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
          }}>
            Cancel
          </button>
          <button onClick={save} style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            background: saved ? 'var(--green)' : 'var(--accent)',
            color: 'var(--bg-primary)',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--accent)',
        marginBottom: 12,
        paddingBottom: 6,
        borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        marginBottom: 4,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
};
