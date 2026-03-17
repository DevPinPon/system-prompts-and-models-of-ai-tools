# Local Replit Agent

A local desktop application that replicates Replit Agent's autonomous AI coding capabilities. Powered by Claude (Anthropic) with containerized workspaces via Docker and cloud deployment via Google Cloud Run.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Electron Desktop App                   │
├──────────┬───────────┬──────────────┬───────────────────┤
│ Sidebar  │ File      │ Monaco Code  │ AI Agent Panel    │
│ Nav      │ Explorer  │ Editor       │ (Chat/Autonomous) │
│          │           │              │                   │
│ Files    │ Tree View │ Syntax HL    │ Claude API        │
│ Agent    │ Search    │ Autocomplete │ Tool Execution    │
│ Deploy   │ Watch     │ Multi-tab    │ Progress Events   │
├──────────┴───────────┴──────────────┴───────────────────┤
│                    Integrated Terminal                    │
│                    (xterm.js + node-pty)                  │
├──────────────────────────────────────────────────────────┤
│                    Backend Services                       │
│  ┌──────────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │ Workspace    │ │ Docker      │ │ GCloud Deployer  │  │
│  │ Manager      │ │ Manager     │ │ (Cloud Run)      │  │
│  │ (chokidar)   │ │ (dockerode) │ │                  │  │
│  └──────────────┘ └─────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                   │                    │
         ▼                   ▼                    ▼
    Local Filesystem    Docker Engine      Google Cloud Platform
```

## Features

### AI Agent (Claude-Powered)
- **Chat Mode**: Interactive coding assistant — ask questions, request changes
- **Autonomous Mode**: Describe what you want, the agent plans and builds it end-to-end
- **Tool Use**: The agent can create/edit/delete files, run shell commands, install packages, search code
- **Agentic Loop**: Continues executing until the task is fully complete

### Code Editor
- Monaco Editor (same engine as VS Code)
- Catppuccin Mocha theme
- Syntax highlighting for 30+ languages
- Multi-tab editing with Ctrl+S save
- Font ligatures, bracket pair colorization

### File Management
- File tree explorer with live-reload (chokidar)
- Create, rename, delete files and directories
- Full-text search across project files

### Integrated Terminal
- Full PTY terminal (xterm.js + node-pty)
- 256-color support, clickable links
- Catppuccin color scheme

### Containerized Workspaces (Docker)
- Auto-generated Dockerfiles for Node.js, Python, Go, Rust
- Pre-built universal workspace image with all runtimes
- Docker Compose with PostgreSQL and Redis
- Port forwarding, volume mounts, resource limits

### Google Cloud Deployment
- One-click deploy to Google Cloud Run
- Automatic container builds via Cloud Build
- Configurable memory, CPU, scaling
- View active deployments, logs, and status

## Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **Docker Desktop** (for containerized workspaces)
- **Google Cloud SDK** (optional, for cloud deployment)
- **Claude API Key** from [console.anthropic.com](https://console.anthropic.com)

### Installation

```bash
cd local-replit-agent

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Configuration

1. Launch the app and open **Settings** (Cmd/Ctrl + ,)
2. Add your **Claude API Key**
3. (Optional) Add your **Google Cloud Project ID** and service account key
4. Choose your preferred **Claude model**

### Building for Production

```bash
# Build for your platform
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

### Docker Workspace

```bash
# Build the universal development container
npm run docker:build

# Or use docker-compose for full stack (workspace + postgres + redis)
cd docker && docker-compose up -d
```

## Project Templates

| Template | Description |
|----------|-------------|
| Blank | Empty project |
| Node.js + Express | REST API server |
| Python + Flask | Python web app |
| React + Vite | React frontend |
| HTML/CSS/JS | Static website |

## Key Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + N | New Project |
| Cmd/Ctrl + O | Open Project |
| Cmd/Ctrl + , | Settings |
| Cmd/Ctrl + S | Save File |
| Cmd/Ctrl + Enter | Start Agent |
| Cmd/Ctrl + Shift+D | Deploy to Cloud |

## How the Agent Works

The agent uses Claude's tool-use capability in an agentic loop:

1. **User sends a message** (or task in autonomous mode)
2. **Claude analyzes** the project structure and request
3. **Claude calls tools**: create files, edit files, run commands, etc.
4. **Results are fed back** to Claude automatically
5. **Loop continues** until Claude decides the task is complete
6. **Final response** is shown to the user

In **Autonomous Mode**, the agent additionally:
- Generates a step-by-step plan
- Executes each step without waiting for user input
- Runs and tests the application
- Fixes errors automatically
- Reports progress throughout

## Tech Stack

- **Electron** — Desktop application framework
- **React** — UI components
- **Monaco Editor** — Code editing (VS Code engine)
- **xterm.js** — Terminal emulator
- **node-pty** — Pseudo-terminal backend
- **@anthropic-ai/sdk** — Claude AI integration
- **dockerode** — Docker API client
- **chokidar** — File system watcher
- **Google Cloud SDK** — Cloud Run deployment
