import React, { useEffect, useRef, useState } from 'react';

export default function Terminal({ projectPath }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const terminalIdRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cleanup = null;

    async function init() {
      if (!containerRef.current || initialized) return;

      // Dynamic imports for xterm
      const { Terminal: XTerm } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');

      // Import xterm CSS
      await import('@xterm/xterm/css/xterm.css');

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      const term = new XTerm({
        theme: {
          background: '#11111b',
          foreground: '#cdd6f4',
          cursor: '#f5e0dc',
          selectionBackground: '#45475a',
          black: '#45475a',
          red: '#f38ba8',
          green: '#a6e3a1',
          yellow: '#f9e2af',
          blue: '#89b4fa',
          magenta: '#cba6f7',
          cyan: '#89dceb',
          white: '#cdd6f4',
          brightBlack: '#585b70',
          brightRed: '#f38ba8',
          brightGreen: '#a6e3a1',
          brightYellow: '#f9e2af',
          brightBlue: '#89b4fa',
          brightMagenta: '#cba6f7',
          brightCyan: '#89dceb',
          brightWhite: '#cdd6f4',
        },
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 5000,
      });

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(containerRef.current);

      setTimeout(() => fitAddon.fit(), 50);
      termRef.current = term;

      // Create backend terminal
      const id = await window.api.terminal.create(projectPath);
      terminalIdRef.current = id;

      // Terminal input -> backend
      term.onData((data) => {
        window.api.terminal.write(id, data);
      });

      // Terminal resize
      term.onResize(({ cols, rows }) => {
        window.api.terminal.resize(id, cols, rows);
      });

      // Backend output -> terminal
      cleanup = window.api.terminal.onData(({ id: termId, data }) => {
        if (termId === id) {
          term.write(data);
        }
      });

      // Handle container resize
      const observer = new ResizeObserver(() => {
        fitAddon.fit();
      });
      observer.observe(containerRef.current);

      setInitialized(true);

      return () => {
        observer.disconnect();
        term.dispose();
        if (terminalIdRef.current) {
          window.api.terminal.kill(terminalIdRef.current);
        }
      };
    }

    init();

    return () => {
      cleanup?.();
    };
  }, [projectPath]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 12px',
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--text-muted)',
        }}>
          Terminal
        </span>
      </div>
      <div ref={containerRef} style={{ flex: 1, padding: 4 }} />
    </div>
  );
}
