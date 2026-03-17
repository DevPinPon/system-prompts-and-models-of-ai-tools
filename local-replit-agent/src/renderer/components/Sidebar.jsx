import React from 'react';

const icons = {
  files: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  agent: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10h-2a7 7 0 00-14 0H1" />
      <rect x="5" y="12" width="14" height="8" rx="2" />
      <path d="M9 16h6" />
    </svg>
  ),
  deploy: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  terminal: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
};

export default function Sidebar({ activeView, onViewChange, onToggleTerminal }) {
  const items = [
    { id: 'files', icon: icons.files, label: 'Files' },
    { id: 'agent', icon: icons.agent, label: 'AI Agent' },
    { id: 'deploy', icon: icons.deploy, label: 'Deploy' },
  ];

  return (
    <div style={{
      width: 48,
      background: 'var(--bg-tertiary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 8,
      gap: 4,
    }}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          title={item.label}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            color: activeView === item.id ? 'var(--accent)' : 'var(--text-muted)',
            background: activeView === item.id ? 'var(--bg-surface)' : 'transparent',
            transition: 'all var(--transition)',
          }}
        >
          {item.icon}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <button
        onClick={onToggleTerminal}
        title="Toggle Terminal"
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        {icons.terminal}
      </button>
    </div>
  );
}
