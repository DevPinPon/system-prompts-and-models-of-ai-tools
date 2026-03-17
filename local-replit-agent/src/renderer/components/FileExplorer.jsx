import React, { useState, useEffect } from 'react';

function FileIcon({ extension, isDirectory }) {
  if (isDirectory) {
    return <span style={{ color: 'var(--accent)', marginRight: 6 }}>📁</span>;
  }
  const colorMap = {
    js: '#f9e2af', jsx: '#f9e2af', ts: '#89b4fa', tsx: '#89b4fa',
    py: '#a6e3a1', rb: '#f38ba8', go: '#89dceb', rs: '#fab387',
    html: '#fab387', css: '#89b4fa', json: '#f9e2af', md: '#cdd6f4',
    yaml: '#cba6f7', yml: '#cba6f7', toml: '#fab387',
    sql: '#89dceb', sh: '#a6e3a1', bash: '#a6e3a1',
    png: '#f38ba8', jpg: '#f38ba8', svg: '#f38ba8',
  };
  const color = colorMap[extension] || 'var(--text-muted)';
  return <span style={{ color, marginRight: 6, fontSize: 11 }}>📄</span>;
}

function TreeNode({ node, depth, activeFile, onOpenFile }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isActive = node.path === activeFile;

  if (node.type === 'directory') {
    return (
      <div>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '3px 8px',
            paddingLeft: 8 + depth * 16,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 13,
            userSelect: 'none',
            borderRadius: 'var(--radius-sm)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ marginRight: 4, fontSize: 10, width: 14, textAlign: 'center' }}>
            {expanded ? '▾' : '▸'}
          </span>
          <FileIcon isDirectory />
          <span>{node.name}</span>
        </div>
        {expanded && node.children?.map(child => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFile={activeFile}
            onOpenFile={onOpenFile}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenFile(node.path)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '3px 8px',
        paddingLeft: 22 + depth * 16,
        cursor: 'pointer',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'var(--bg-surface)' : 'transparent',
        fontSize: 13,
        userSelect: 'none',
        borderRadius: 'var(--radius-sm)',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <FileIcon extension={node.extension} />
      <span className="truncate">{node.name}</span>
    </div>
  );
}

export default function FileExplorer({ project, activeFile, onOpenFile, onRefresh }) {
  const [fileTree, setFileTree] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (project?.fileTree) {
      setFileTree(project.fileTree);
    }
  }, [project]);

  // Refresh on file changes
  useEffect(() => {
    const cleanup = window.api.workspace.onFileChanged(async () => {
      if (project?.path) {
        const tree = await window.api.workspace.getFileTree(project.path);
        setFileTree(tree);
      }
    });
    return cleanup;
  }, [project?.path]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
          Explorer
        </span>
        <button
          onClick={onRefresh}
          title="Refresh"
          style={{ color: 'var(--text-muted)', fontSize: 14, padding: 2 }}
        >
          ↻
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '6px 8px' }}>
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '5px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 12,
            outline: 'none',
          }}
        />
      </div>

      {/* Project Name */}
      <div style={{ padding: '4px 12px', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
        {project?.name || 'Project'}
      </div>

      {/* File Tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {fileTree.map(node => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFile={activeFile}
            onOpenFile={onOpenFile}
          />
        ))}
      </div>
    </div>
  );
}
