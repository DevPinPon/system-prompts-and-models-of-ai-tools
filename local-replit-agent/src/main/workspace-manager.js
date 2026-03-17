const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const chokidar = require('chokidar');

const IGNORED_PATTERNS = [
  'node_modules', '.git', '__pycache__', '.DS_Store', '.env',
  'dist', 'build', '.next', '.cache', 'coverage', '.venv', 'venv',
];

class WorkspaceManager extends EventEmitter {
  constructor(store) {
    super();
    this.store = store;
    this.watchers = new Map();
    this.activeProject = null;
  }

  async openProject(projectPath) {
    if (this.watchers.has(projectPath)) {
      this.watchers.get(projectPath).close();
    }

    this.activeProject = projectPath;
    this._addToRecent(projectPath);

    const watcher = chokidar.watch(projectPath, {
      ignored: IGNORED_PATTERNS.map(p => `**/${p}/**`),
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on('add', (filePath) => this.emit('fileChanged', { type: 'add', path: filePath }))
      .on('change', (filePath) => this.emit('fileChanged', { type: 'change', path: filePath }))
      .on('unlink', (filePath) => this.emit('fileChanged', { type: 'delete', path: filePath }));

    this.watchers.set(projectPath, watcher);

    return {
      path: projectPath,
      name: path.basename(projectPath),
      fileTree: await this.getFileTree(projectPath),
    };
  }

  async createProject(projectName, template = 'blank') {
    const projectsDir = path.join(require('os').homedir(), 'LocalReplitProjects');
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    const projectPath = path.join(projectsDir, projectName);
    if (fs.existsSync(projectPath)) {
      throw new Error(`Project "${projectName}" already exists`);
    }

    fs.mkdirSync(projectPath, { recursive: true });

    const templates = {
      blank: () => {
        fs.writeFileSync(path.join(projectPath, 'README.md'), `# ${projectName}\n`);
      },
      'node-express': () => {
        fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
          name: projectName,
          version: '1.0.0',
          main: 'index.js',
          scripts: { start: 'node index.js', dev: 'node --watch index.js' },
          dependencies: { express: '^4.21.0' },
        }, null, 2));
        fs.writeFileSync(path.join(projectPath, 'index.js'),
          `const express = require('express');\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello from ${projectName}!' });\n});\n\napp.listen(PORT, () => {\n  console.log(\`Server running on port \${PORT}\`);\n});\n`
        );
      },
      'python-flask': () => {
        fs.writeFileSync(path.join(projectPath, 'requirements.txt'), 'flask>=3.0.0\ngunicorn>=22.0.0\n');
        fs.writeFileSync(path.join(projectPath, 'app.py'),
          `from flask import Flask, jsonify\n\napp = Flask(__name__)\n\n@app.route('/')\ndef index():\n    return jsonify(message='Hello from ${projectName}!')\n\nif __name__ == '__main__':\n    app.run(host='0.0.0.0', port=3000, debug=True)\n`
        );
      },
      'react-vite': () => {
        fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
          name: projectName,
          version: '1.0.0',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0' },
          devDependencies: { '@vitejs/plugin-react': '^4.3.0', vite: '^6.0.0' },
        }, null, 2));
        fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
        fs.writeFileSync(path.join(projectPath, 'src/App.jsx'),
          `export default function App() {\n  return <h1>Hello from ${projectName}!</h1>;\n}\n`
        );
        fs.writeFileSync(path.join(projectPath, 'index.html'),
          `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8" /><title>${projectName}</title></head>\n<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>\n</html>\n`
        );
        fs.writeFileSync(path.join(projectPath, 'src/main.jsx'),
          `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n`
        );
      },
      'html-css-js': () => {
        fs.writeFileSync(path.join(projectPath, 'index.html'),
          `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${projectName}</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello from ${projectName}!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n`
        );
        fs.writeFileSync(path.join(projectPath, 'style.css'),
          `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1e1e2e; color: #cdd6f4; }\n`
        );
        fs.writeFileSync(path.join(projectPath, 'script.js'),
          `console.log('${projectName} loaded!');\n`
        );
      },
    };

    (templates[template] || templates.blank)();
    return this.openProject(projectPath);
  }

  async getFileTree(dirPath, depth = 0) {
    if (depth > 8) return [];
    const entries = [];

    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        if (IGNORED_PATTERNS.includes(item.name)) continue;
        if (item.name.startsWith('.') && item.name !== '.env.example') continue;

        const fullPath = path.join(dirPath, item.name);
        const entry = {
          name: item.name,
          path: fullPath,
          type: item.isDirectory() ? 'directory' : 'file',
        };

        if (item.isDirectory()) {
          entry.children = await this.getFileTree(fullPath, depth + 1);
        } else {
          const stats = fs.statSync(fullPath);
          entry.size = stats.size;
          entry.extension = path.extname(item.name).slice(1);
        }

        entries.push(entry);
      }
    } catch (err) {
      // Permission denied or other errors
    }

    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  async writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  }

  async createFile(filePath, content = '') {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  }

  async deleteFile(filePath) {
    fs.rmSync(filePath, { recursive: true, force: true });
    return { success: true };
  }

  async renameFile(oldPath, newPath) {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  }

  async searchFiles(projectPath, query) {
    const results = [];
    const searchRecursive = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (IGNORED_PATTERNS.includes(item.name)) continue;
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            searchRecursive(fullPath);
          } else if (item.name.toLowerCase().includes(query.toLowerCase())) {
            results.push(fullPath);
          } else {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              if (content.toLowerCase().includes(query.toLowerCase())) {
                const lines = content.split('\n');
                const matchingLines = lines
                  .map((line, i) => ({ line: i + 1, content: line }))
                  .filter(l => l.content.toLowerCase().includes(query.toLowerCase()))
                  .slice(0, 5);
                results.push({ path: fullPath, matches: matchingLines });
              }
            } catch {
              // Binary file or read error
            }
          }
        }
      } catch {
        // Permission denied
      }
    };
    searchRecursive(projectPath);
    return results.slice(0, 100);
  }

  _addToRecent(projectPath) {
    const recent = this.store.get('recentProjects', []);
    const filtered = recent.filter(p => p !== projectPath);
    filtered.unshift(projectPath);
    this.store.set('recentProjects', filtered.slice(0, 20));
  }

  destroy() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

module.exports = { WorkspaceManager };
