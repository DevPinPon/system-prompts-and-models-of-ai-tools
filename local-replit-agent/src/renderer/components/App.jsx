import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import AgentChat from './AgentChat';
import Terminal from './Terminal';
import DeployPanel from './DeployPanel';
import SettingsModal from './SettingsModal';
import WelcomeScreen from './WelcomeScreen';

export default function App() {
  const [project, setProject] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [fileContent, setFileContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [sidebarView, setSidebarView] = useState('files'); // files, agent, deploy
  const [agentEvents, setAgentEvents] = useState([]);
  const [terminalVisible, setTerminalVisible] = useState(true);

  useEffect(() => {
    // Listen for menu events
    const cleanups = [
      window.api.onMenuEvent('menu:settings', () => setShowSettings(true)),
      window.api.onMenuEvent('menu:open-project', (path) => openProject(path)),
      window.api.onMenuEvent('menu:new-project', () => setProject(null)),
      window.api.onMenuEvent('agent:deploy', () => {
        setSidebarView('deploy');
        setShowDeploy(true);
      }),
    ];

    // Listen for agent events
    const cleanupAgent = window.api.agent.onEvent((event) => {
      setAgentEvents(prev => [...prev, event]);
    });

    return () => {
      cleanups.forEach(fn => fn());
      cleanupAgent();
    };
  }, []);

  const openProject = useCallback(async (projectPath) => {
    try {
      const result = await window.api.workspace.open(projectPath);
      setProject(result);
      setOpenFiles([]);
      setActiveFile(null);
      setFileContent('');
    } catch (err) {
      console.error('Failed to open project:', err);
    }
  }, []);

  const openFile = useCallback(async (filePath) => {
    try {
      const content = await window.api.workspace.readFile(filePath);
      setActiveFile(filePath);
      setFileContent(content);
      setOpenFiles(prev => {
        if (prev.includes(filePath)) return prev;
        return [...prev, filePath];
      });
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, []);

  const closeFile = useCallback((filePath) => {
    setOpenFiles(prev => prev.filter(f => f !== filePath));
    if (activeFile === filePath) {
      const remaining = openFiles.filter(f => f !== filePath);
      if (remaining.length > 0) {
        openFile(remaining[remaining.length - 1]);
      } else {
        setActiveFile(null);
        setFileContent('');
      }
    }
  }, [activeFile, openFiles, openFile]);

  const saveFile = useCallback(async (filePath, content) => {
    try {
      await window.api.workspace.writeFile(filePath, content);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, []);

  const createProject = useCallback(async (name, template) => {
    try {
      const result = await window.api.workspace.create(name, template);
      setProject(result);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }, []);

  // No project open — show welcome screen
  if (!project) {
    return (
      <>
        <WelcomeScreen
          onOpenProject={async () => {
            const dir = await window.api.workspace.selectDirectory();
            if (dir) openProject(dir);
          }}
          onCreateProject={createProject}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Activity Bar */}
      <Sidebar
        activeView={sidebarView}
        onViewChange={setSidebarView}
        onToggleTerminal={() => setTerminalVisible(v => !v)}
      />

      {/* Side Panel */}
      <div style={{
        width: sidebarView === 'agent' ? 400 : 260,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        transition: 'width var(--transition)',
      }}>
        {sidebarView === 'files' && (
          <FileExplorer
            project={project}
            activeFile={activeFile}
            onOpenFile={openFile}
            onRefresh={() => openProject(project.path)}
          />
        )}
        {sidebarView === 'agent' && (
          <AgentChat
            projectPath={project.path}
            events={agentEvents}
            onEventsChange={setAgentEvents}
          />
        )}
        {sidebarView === 'deploy' && (
          <DeployPanel projectPath={project.path} />
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Editor Area */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor
            filePath={activeFile}
            content={fileContent}
            openFiles={openFiles}
            onSave={saveFile}
            onClose={closeFile}
            onSelectFile={openFile}
            onChange={setFileContent}
          />
        </div>

        {/* Terminal */}
        {terminalVisible && (
          <div style={{
            height: 250,
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-tertiary)',
          }}>
            <Terminal projectPath={project.path} />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
