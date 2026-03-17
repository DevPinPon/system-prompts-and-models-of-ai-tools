const { exec, spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const treeKill = require('tree-kill');

class TerminalManager {
  constructor() {
    this.terminals = new Map();
    this.processes = new Map();
  }

  async createTerminal(cwd, onData) {
    const id = uuidv4();
    // Use node-pty if available, fallback to spawn
    try {
      const pty = require('node-pty');
      const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
      const term = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: cwd || process.cwd(),
        env: { ...process.env, TERM: 'xterm-256color' },
      });

      term.onData((data) => {
        onData({ id, data });
      });

      this.terminals.set(id, { term, type: 'pty' });
    } catch {
      // Fallback: no pty available
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const proc = spawn(shell, [], {
        cwd: cwd || process.cwd(),
        env: { ...process.env, TERM: 'dumb' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdout.on('data', (data) => onData({ id, data: data.toString() }));
      proc.stderr.on('data', (data) => onData({ id, data: data.toString() }));
      proc.on('exit', (code) => {
        onData({ id, data: `\r\nProcess exited with code ${code}\r\n` });
        this.terminals.delete(id);
      });

      this.terminals.set(id, { proc, type: 'spawn' });
    }

    return id;
  }

  write(terminalId, data) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;
    if (terminal.type === 'pty') {
      terminal.term.write(data);
    } else if (terminal.proc?.stdin?.writable) {
      terminal.proc.stdin.write(data);
    }
  }

  resize(terminalId, cols, rows) {
    const terminal = this.terminals.get(terminalId);
    if (terminal?.type === 'pty') {
      terminal.term.resize(cols, rows);
    }
  }

  kill(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;
    if (terminal.type === 'pty') {
      terminal.term.kill();
    } else {
      treeKill(terminal.proc.pid, 'SIGTERM');
    }
    this.terminals.delete(terminalId);
  }

  async exec(command, cwd) {
    return new Promise((resolve, reject) => {
      exec(command, {
        cwd: cwd || process.cwd(),
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 10,
      }, (error, stdout, stderr) => {
        if (error) {
          resolve({ error: error.message, stdout, stderr, code: error.code });
        } else {
          resolve({ stdout, stderr, code: 0 });
        }
      });
    });
  }

  killAll() {
    for (const [id] of this.terminals) {
      this.kill(id);
    }
  }
}

module.exports = { TerminalManager };
