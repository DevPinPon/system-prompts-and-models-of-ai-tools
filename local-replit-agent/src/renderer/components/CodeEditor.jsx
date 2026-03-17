import React, { useEffect, useRef, useCallback, useState } from 'react';

function getLanguage(filePath) {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', kt: 'kotlin', swift: 'swift',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    md: 'markdown', mdx: 'markdown',
    sql: 'sql', sh: 'shell', bash: 'shell', zsh: 'shell',
    xml: 'xml', svg: 'xml',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    cs: 'csharp', php: 'php', r: 'r', dart: 'dart',
    dockerfile: 'dockerfile',
  };
  return map[ext] || 'plaintext';
}

function TabBar({ openFiles, activeFile, onSelectFile, onClose }) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      overflow: 'auto',
      minHeight: 36,
    }}>
      {openFiles.map(filePath => {
        const name = filePath.split('/').pop();
        const isActive = filePath === activeFile;
        return (
          <div
            key={filePath}
            onClick={() => onSelectFile(filePath)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 12px',
              height: 36,
              cursor: 'pointer',
              background: isActive ? 'var(--bg-primary)' : 'transparent',
              borderRight: '1px solid var(--border)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12,
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            <span>{name}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onClose(filePath); }}
              style={{
                width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                fontSize: 14,
                color: 'var(--text-muted)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CodeEditor({ filePath, content, openFiles, onSave, onClose, onSelectFile, onChange }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const monacoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function initMonaco() {
      // Dynamic import for monaco
      if (typeof window !== 'undefined' && !window.monaco) {
        // In Electron, we need to configure monaco's worker paths
        const monacoModule = await import('monaco-editor');
        window.monaco = monacoModule;

        // Configure workers via blob URLs
        window.MonacoEnvironment = {
          getWorker: function (workerId, label) {
            const getWorkerModule = (moduleUrl, label) => {
              return new Worker(
                new URL(`monaco-editor/esm/vs/editor/editor.worker.js`, import.meta.url),
                { type: 'module' }
              );
            };
            return getWorkerModule('', label);
          },
        };
      }

      if (disposed) return;

      const monaco = window.monaco;
      if (!containerRef.current || editorRef.current) return;

      // Define Catppuccin Mocha theme
      monaco.editor.defineTheme('catppuccin-mocha', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'cba6f7' },
          { token: 'string', foreground: 'a6e3a1' },
          { token: 'number', foreground: 'fab387' },
          { token: 'type', foreground: 'f9e2af' },
          { token: 'function', foreground: '89b4fa' },
          { token: 'variable', foreground: 'cdd6f4' },
          { token: 'operator', foreground: '89dceb' },
        ],
        colors: {
          'editor.background': '#1e1e2e',
          'editor.foreground': '#cdd6f4',
          'editor.lineHighlightBackground': '#313244',
          'editor.selectionBackground': '#45475a',
          'editorCursor.foreground': '#f5e0dc',
          'editorLineNumber.foreground': '#6c7086',
          'editorLineNumber.activeForeground': '#cdd6f4',
          'editor.inactiveSelectionBackground': '#313244',
        },
      });

      editorRef.current = monaco.editor.create(containerRef.current, {
        value: content || '',
        language: getLanguage(filePath),
        theme: 'catppuccin-mocha',
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        minimap: { enabled: true, maxColumn: 80 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        padding: { top: 12 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      });

      monacoRef.current = monaco;

      // Ctrl+S / Cmd+S to save
      editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        if (filePath) {
          onSave(filePath, editorRef.current.getValue());
        }
      });

      editorRef.current.onDidChangeModelContent(() => {
        onChange?.(editorRef.current.getValue());
      });

      setLoaded(true);
    }

    initMonaco();

    return () => {
      disposed = true;
    };
  }, []);

  // Update content when file changes
  useEffect(() => {
    if (editorRef.current && content !== undefined) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== content) {
        editorRef.current.setValue(content);
      }
    }
  }, [content]);

  // Update language when file changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current && filePath) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, getLanguage(filePath));
      }
    }
  }, [filePath]);

  if (!filePath && openFiles.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        background: 'var(--bg-primary)',
        gap: 16,
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
        <div style={{ fontSize: 16 }}>Open a file from the explorer</div>
        <div style={{ fontSize: 12 }}>or use the AI Agent to generate code</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TabBar
        openFiles={openFiles}
        activeFile={filePath}
        onSelectFile={onSelectFile}
        onClose={onClose}
      />
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  );
}
