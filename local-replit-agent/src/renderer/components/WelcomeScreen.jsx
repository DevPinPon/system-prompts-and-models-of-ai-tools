import React, { useState, useEffect } from 'react';

const TEMPLATES = [
  { id: 'blank', name: 'Blank Project', icon: '📄', desc: 'Start from scratch' },
  { id: 'node-express', name: 'Node.js + Express', icon: '🟢', desc: 'REST API server' },
  { id: 'python-flask', name: 'Python + Flask', icon: '🐍', desc: 'Python web app' },
  { id: 'react-vite', name: 'React + Vite', icon: '⚛️', desc: 'React frontend' },
  { id: 'html-css-js', name: 'HTML/CSS/JS', icon: '🌐', desc: 'Static website' },
];

export default function WelcomeScreen({ onOpenProject, onCreateProject, onOpenSettings }) {
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [template, setTemplate] = useState('blank');
  const [recentProjects, setRecentProjects] = useState([]);

  useEffect(() => {
    window.api.settings.get('recentProjects').then(p => setRecentProjects(p || []));
  }, []);

  const handleCreate = () => {
    if (!projectName.trim()) return;
    onCreateProject(projectName.trim(), template);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: 600, maxWidth: '90%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 48,
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--accent), var(--mauve))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>
            Local Replit Agent
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Autonomous AI coding environment powered by Claude
          </div>
        </div>

        {!showCreate ? (
          <>
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
              <ActionButton
                label="New Project"
                icon="+"
                color="var(--accent)"
                onClick={() => setShowCreate(true)}
              />
              <ActionButton
                label="Open Folder"
                icon="📂"
                color="var(--green)"
                onClick={onOpenProject}
              />
              <ActionButton
                label="Settings"
                icon="⚙"
                color="var(--text-muted)"
                onClick={onOpenSettings}
              />
            </div>

            {/* Recent Projects */}
            {recentProjects.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 8,
                }}>
                  Recent Projects
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {recentProjects.slice(0, 8).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // Re-open via workspace open (dispatched through App)
                        window.api.workspace.open(p);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'left',
                        color: 'var(--text-primary)',
                        transition: 'all var(--transition)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <span style={{ color: 'var(--accent)' }}>📁</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{p.split('/').pop()}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Create Project Form */
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create New Project</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="my-awesome-app"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                Template
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    style={{
                      padding: '10px 12px',
                      background: template === t.id ? 'var(--bg-surface)' : 'transparent',
                      border: `1px solid ${template === t.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!projectName.trim()}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-sm)',
                  background: projectName.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                  color: projectName.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ label, icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '16px 12px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        color: 'var(--text-primary)',
        transition: 'all var(--transition)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <span style={{ fontSize: 24, color }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
    </button>
  );
}
