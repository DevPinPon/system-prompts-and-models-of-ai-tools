const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // Workspace / File System
  workspace: {
    open: (path) => ipcRenderer.invoke('workspace:open', path),
    create: (name, template) => ipcRenderer.invoke('workspace:create', name, template),
    getFileTree: (path) => ipcRenderer.invoke('workspace:getFileTree', path),
    readFile: (path) => ipcRenderer.invoke('workspace:readFile', path),
    writeFile: (path, content) => ipcRenderer.invoke('workspace:writeFile', path, content),
    createFile: (path, content) => ipcRenderer.invoke('workspace:createFile', path, content),
    deleteFile: (path) => ipcRenderer.invoke('workspace:deleteFile', path),
    renameFile: (oldPath, newPath) => ipcRenderer.invoke('workspace:renameFile', oldPath, newPath),
    searchFiles: (path, query) => ipcRenderer.invoke('workspace:searchFiles', path, query),
    selectDirectory: () => ipcRenderer.invoke('workspace:selectDirectory'),
    onFileChanged: (cb) => {
      ipcRenderer.on('workspace:fileChanged', (_, event) => cb(event));
      return () => ipcRenderer.removeAllListeners('workspace:fileChanged');
    },
  },

  // Terminal
  terminal: {
    create: (projectPath) => ipcRenderer.invoke('terminal:create', projectPath),
    write: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id) => ipcRenderer.invoke('terminal:kill', id),
    exec: (command, cwd) => ipcRenderer.invoke('terminal:exec', command, cwd),
    onData: (cb) => {
      ipcRenderer.on('terminal:data', (_, data) => cb(data));
      return () => ipcRenderer.removeAllListeners('terminal:data');
    },
  },

  // Agent (Claude AI)
  agent: {
    chat: (message, projectPath, history) =>
      ipcRenderer.invoke('agent:chat', message, projectPath, history),
    stop: () => ipcRenderer.invoke('agent:stop'),
    planAndExecute: (task, projectPath) =>
      ipcRenderer.invoke('agent:planAndExecute', task, projectPath),
    onEvent: (cb) => {
      ipcRenderer.on('agent:event', (_, event) => cb(event));
      return () => ipcRenderer.removeAllListeners('agent:event');
    },
  },

  // Docker
  docker: {
    status: () => ipcRenderer.invoke('docker:status'),
    buildWorkspace: (projectPath) => ipcRenderer.invoke('docker:buildWorkspace', projectPath),
    startContainer: (projectPath) => ipcRenderer.invoke('docker:startContainer', projectPath),
    stopContainer: (id) => ipcRenderer.invoke('docker:stopContainer', id),
    containerLogs: (id) => ipcRenderer.invoke('docker:containerLogs', id),
    onEvent: (cb) => {
      ipcRenderer.on('docker:event', (_, event) => cb(event));
      return () => ipcRenderer.removeAllListeners('docker:event');
    },
  },

  // Google Cloud
  gcloud: {
    deploy: (projectPath, config) => ipcRenderer.invoke('gcloud:deploy', projectPath, config),
    getDeployments: () => ipcRenderer.invoke('gcloud:getDeployments'),
    deleteDeployment: (name) => ipcRenderer.invoke('gcloud:deleteDeployment', name),
    getStatus: (name) => ipcRenderer.invoke('gcloud:getStatus', name),
    getLogs: (name) => ipcRenderer.invoke('gcloud:getLogs', name),
    onEvent: (cb) => {
      ipcRenderer.on('gcloud:event', (_, event) => cb(event));
      return () => ipcRenderer.removeAllListeners('gcloud:event');
    },
  },

  // Menu events
  onMenuEvent: (channel, cb) => {
    ipcRenderer.on(channel, (_, ...args) => cb(...args));
    return () => ipcRenderer.removeAllListeners(channel);
  },
});
