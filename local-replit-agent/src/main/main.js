const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { WorkspaceManager } = require('./workspace-manager');
const { AgentOrchestrator } = require('./agent-orchestrator');
const { TerminalManager } = require('./terminal-manager');
const { DockerManager } = require('./docker-manager');
const { GCloudDeployer } = require('./gcloud-deployer');

const store = new Store({
  defaults: {
    claudeApiKey: '',
    claudeModel: 'claude-sonnet-4-20250514',
    gcpProjectId: '',
    gcpRegion: 'us-central1',
    gcpKeyFile: '',
    theme: 'dark',
    fontSize: 14,
    recentProjects: [],
    dockerEnabled: true,
    autoSave: true,
    maxTokens: 8192,
  }
});

let mainWindow;
let workspaceManager;
let agentOrchestrator;
let terminalManager;
let dockerManager;
let gcloudDeployer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1024,
    minHeight: 700,
    title: 'Local Replit Agent',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#1e1e2e',
  });

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-project'),
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Open Project Directory',
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send('menu:open-project', result.filePaths[0]);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu:settings'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Agent',
      submenu: [
        {
          label: 'Start Agent',
          accelerator: 'CmdOrCtrl+Enter',
          click: () => mainWindow?.webContents.send('agent:start'),
        },
        {
          label: 'Stop Agent',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('agent:stop'),
        },
        { type: 'separator' },
        {
          label: 'Deploy to Cloud',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow?.webContents.send('agent:deploy'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function registerIpcHandlers() {
  // Settings
  ipcMain.handle('settings:get', (_, key) => store.get(key));
  ipcMain.handle('settings:set', (_, key, value) => store.set(key, value));
  ipcMain.handle('settings:getAll', () => store.store);

  // Workspace
  ipcMain.handle('workspace:open', async (_, projectPath) => {
    return workspaceManager.openProject(projectPath);
  });

  ipcMain.handle('workspace:create', async (_, projectName, template) => {
    return workspaceManager.createProject(projectName, template);
  });

  ipcMain.handle('workspace:getFileTree', async (_, projectPath) => {
    return workspaceManager.getFileTree(projectPath);
  });

  ipcMain.handle('workspace:readFile', async (_, filePath) => {
    return workspaceManager.readFile(filePath);
  });

  ipcMain.handle('workspace:writeFile', async (_, filePath, content) => {
    return workspaceManager.writeFile(filePath, content);
  });

  ipcMain.handle('workspace:createFile', async (_, filePath, content) => {
    return workspaceManager.createFile(filePath, content || '');
  });

  ipcMain.handle('workspace:deleteFile', async (_, filePath) => {
    return workspaceManager.deleteFile(filePath);
  });

  ipcMain.handle('workspace:renameFile', async (_, oldPath, newPath) => {
    return workspaceManager.renameFile(oldPath, newPath);
  });

  ipcMain.handle('workspace:searchFiles', async (_, projectPath, query) => {
    return workspaceManager.searchFiles(projectPath, query);
  });

  ipcMain.handle('workspace:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Directory',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Terminal
  ipcMain.handle('terminal:create', async (_, projectPath) => {
    return terminalManager.createTerminal(projectPath, (data) => {
      mainWindow?.webContents.send('terminal:data', data);
    });
  });

  ipcMain.handle('terminal:write', async (_, terminalId, data) => {
    return terminalManager.write(terminalId, data);
  });

  ipcMain.handle('terminal:resize', async (_, terminalId, cols, rows) => {
    return terminalManager.resize(terminalId, cols, rows);
  });

  ipcMain.handle('terminal:kill', async (_, terminalId) => {
    return terminalManager.kill(terminalId);
  });

  ipcMain.handle('terminal:exec', async (_, command, cwd) => {
    return terminalManager.exec(command, cwd);
  });

  // Agent
  ipcMain.handle('agent:chat', async (_, message, projectPath, conversationHistory) => {
    return agentOrchestrator.chat(message, projectPath, conversationHistory, (event) => {
      mainWindow?.webContents.send('agent:event', event);
    });
  });

  ipcMain.handle('agent:stop', async () => {
    return agentOrchestrator.stop();
  });

  ipcMain.handle('agent:planAndExecute', async (_, task, projectPath) => {
    return agentOrchestrator.planAndExecute(task, projectPath, (event) => {
      mainWindow?.webContents.send('agent:event', event);
    });
  });

  // Docker
  ipcMain.handle('docker:status', async () => {
    return dockerManager.getStatus();
  });

  ipcMain.handle('docker:buildWorkspace', async (_, projectPath) => {
    return dockerManager.buildWorkspace(projectPath, (event) => {
      mainWindow?.webContents.send('docker:event', event);
    });
  });

  ipcMain.handle('docker:startContainer', async (_, projectPath) => {
    return dockerManager.startContainer(projectPath, (event) => {
      mainWindow?.webContents.send('docker:event', event);
    });
  });

  ipcMain.handle('docker:stopContainer', async (_, containerId) => {
    return dockerManager.stopContainer(containerId);
  });

  ipcMain.handle('docker:containerLogs', async (_, containerId) => {
    return dockerManager.getLogs(containerId);
  });

  // Google Cloud Deploy
  ipcMain.handle('gcloud:deploy', async (_, projectPath, config) => {
    return gcloudDeployer.deploy(projectPath, config, (event) => {
      mainWindow?.webContents.send('gcloud:event', event);
    });
  });

  ipcMain.handle('gcloud:getDeployments', async () => {
    return gcloudDeployer.listDeployments();
  });

  ipcMain.handle('gcloud:deleteDeployment', async (_, serviceName) => {
    return gcloudDeployer.deleteDeployment(serviceName);
  });

  ipcMain.handle('gcloud:getStatus', async (_, serviceName) => {
    return gcloudDeployer.getServiceStatus(serviceName);
  });

  ipcMain.handle('gcloud:getLogs', async (_, serviceName) => {
    return gcloudDeployer.getServiceLogs(serviceName);
  });
}

app.whenReady().then(() => {
  workspaceManager = new WorkspaceManager(store);
  agentOrchestrator = new AgentOrchestrator(store);
  terminalManager = new TerminalManager();
  dockerManager = new DockerManager(store);
  gcloudDeployer = new GCloudDeployer(store);

  createWindow();
  createMenu();
  registerIpcHandlers();

  // Watch for file changes in active projects
  workspaceManager.on('fileChanged', (event) => {
    mainWindow?.webContents.send('workspace:fileChanged', event);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  terminalManager?.killAll();
  if (process.platform !== 'darwin') app.quit();
});
