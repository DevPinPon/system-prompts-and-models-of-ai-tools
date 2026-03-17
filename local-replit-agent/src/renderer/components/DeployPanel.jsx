import React, { useState, useEffect } from 'react';

export default function DeployPanel({ projectPath }) {
  const [deployments, setDeployments] = useState([]);
  const [deploying, setDeploying] = useState(false);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({
    serviceName: '',
    port: '3000',
    memory: '512Mi',
    cpu: '1',
    minInstances: '0',
    maxInstances: '10',
  });
  const [dockerStatus, setDockerStatus] = useState(null);

  useEffect(() => {
    loadDeployments();
    checkDocker();

    const cleanupDocker = window.api.docker.onEvent((event) => {
      setLogs(prev => [...prev, event.message || JSON.stringify(event)]);
    });

    const cleanupGcloud = window.api.gcloud.onEvent((event) => {
      setLogs(prev => [...prev, event.message || JSON.stringify(event)]);
    });

    return () => { cleanupDocker(); cleanupGcloud(); };
  }, []);

  const loadDeployments = async () => {
    try {
      const deps = await window.api.gcloud.getDeployments();
      setDeployments(deps);
    } catch { /* GCP not configured */ }
  };

  const checkDocker = async () => {
    const status = await window.api.docker.status();
    setDockerStatus(status);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setLogs([]);
    try {
      await window.api.gcloud.deploy(projectPath, config);
      await loadDeployments();
    } catch (err) {
      setLogs(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setDeploying(false);
    }
  };

  const handleDockerRun = async () => {
    setLogs([]);
    try {
      await window.api.docker.buildWorkspace(projectPath);
      await window.api.docker.startContainer(projectPath);
    } catch (err) {
      setLogs(prev => [...prev, `Error: ${err.message}`]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        fontWeight: 600, fontSize: 12, textTransform: 'uppercase',
        letterSpacing: '0.5px', color: 'var(--text-muted)',
      }}>
        Deploy & Run
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Docker Section */}
        <section>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>
            Local Docker
          </h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {dockerStatus?.connected
              ? `Docker v${dockerStatus.version} — ${dockerStatus.containers} containers`
              : 'Docker not connected'}
          </div>
          <button
            onClick={handleDockerRun}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Build & Run Container
          </button>
        </section>

        {/* Google Cloud Section */}
        <section>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', marginBottom: 8 }}>
            Google Cloud Run
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { key: 'serviceName', label: 'Service Name', placeholder: 'my-app' },
              { key: 'port', label: 'Port', placeholder: '3000' },
              { key: 'memory', label: 'Memory', placeholder: '512Mi' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={config[key]}
                  onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
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
            ))}
          </div>

          <button
            onClick={handleDeploy}
            disabled={deploying}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginTop: 8,
              background: deploying ? 'var(--bg-hover)' : 'var(--green)',
              color: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {deploying ? 'Deploying...' : 'Deploy to Cloud Run'}
          </button>
        </section>

        {/* Deployments List */}
        {deployments.length > 0 && (
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Active Deployments
            </h3>
            {deployments.map((dep, i) => (
              <div key={i} style={{
                padding: 8,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 4,
                fontSize: 12,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dep.name}</div>
                <div style={{ color: 'var(--accent)', fontSize: 11 }}>{dep.url}</div>
                <div style={{
                  color: dep.ready ? 'var(--green)' : 'var(--yellow)',
                  fontSize: 11,
                  marginTop: 2,
                }}>
                  {dep.ready ? 'Ready' : 'Provisioning'}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Logs
            </h3>
            <div style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              padding: 8,
              maxHeight: 200,
              overflow: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}>
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: 2 }}>{log}</div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
