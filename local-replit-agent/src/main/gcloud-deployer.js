const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class GCloudDeployer {
  constructor(store) {
    this.store = store;
  }

  _getConfig() {
    return {
      projectId: this.store.get('gcpProjectId'),
      region: this.store.get('gcpRegion'),
      keyFile: this.store.get('gcpKeyFile'),
    };
  }

  _exec(command, cwd) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env };
      const config = this._getConfig();
      if (config.keyFile) {
        env.GOOGLE_APPLICATION_CREDENTIALS = config.keyFile;
      }
      exec(command, { cwd, env, timeout: 300000, maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
        if (error) reject(new Error(`${error.message}\n${stderr}`));
        else resolve({ stdout, stderr });
      });
    });
  }

  async deploy(projectPath, config = {}, emitEvent) {
    const gcpConfig = this._getConfig();
    if (!gcpConfig.projectId) {
      throw new Error('Google Cloud project ID not configured. Go to Settings.');
    }

    const projectName = path.basename(projectPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const serviceName = config.serviceName || `replit-${projectName}`;
    const region = config.region || gcpConfig.region;

    emitEvent?.({ type: 'deploy_start', message: `Deploying ${serviceName} to Google Cloud Run...` });

    try {
      // Step 1: Ensure Dockerfile exists
      const dockerfilePath = path.join(projectPath, 'Dockerfile');
      if (!fs.existsSync(dockerfilePath)) {
        emitEvent?.({ type: 'deploy_step', message: 'Generating Dockerfile...' });
        const { DockerManager } = require('./docker-manager');
        const dm = new DockerManager(this.store);
        const dockerfile = dm._generateDockerfile(projectPath);
        fs.writeFileSync(dockerfilePath, dockerfile);
      }

      // Step 2: Build and push to Artifact Registry
      const imageUri = `${region}-docker.pkg.dev/${gcpConfig.projectId}/cloud-run-source-deploy/${serviceName}`;

      emitEvent?.({ type: 'deploy_step', message: 'Building container image...' });
      await this._exec(
        `gcloud builds submit --tag ${imageUri} --project ${gcpConfig.projectId} --quiet`,
        projectPath
      );

      // Step 3: Deploy to Cloud Run
      emitEvent?.({ type: 'deploy_step', message: 'Deploying to Cloud Run...' });
      const { stdout } = await this._exec(
        `gcloud run deploy ${serviceName} ` +
        `--image ${imageUri} ` +
        `--platform managed ` +
        `--region ${region} ` +
        `--project ${gcpConfig.projectId} ` +
        `--allow-unauthenticated ` +
        `--port ${config.port || 3000} ` +
        `--memory ${config.memory || '512Mi'} ` +
        `--cpu ${config.cpu || '1'} ` +
        `--min-instances ${config.minInstances || '0'} ` +
        `--max-instances ${config.maxInstances || '10'} ` +
        `--quiet --format json`,
        projectPath
      );

      let serviceUrl = '';
      try {
        const result = JSON.parse(stdout);
        serviceUrl = result.status?.url || '';
      } catch {
        const match = stdout.match(/https:\/\/[^\s]+\.run\.app/);
        serviceUrl = match ? match[0] : '';
      }

      emitEvent?.({
        type: 'deploy_complete',
        serviceName,
        url: serviceUrl,
        region,
        message: `Deployed successfully! URL: ${serviceUrl}`,
      });

      return { serviceName, url: serviceUrl, region };

    } catch (error) {
      emitEvent?.({ type: 'deploy_error', message: error.message });
      throw error;
    }
  }

  async listDeployments() {
    const config = this._getConfig();
    if (!config.projectId) return [];

    try {
      const { stdout } = await this._exec(
        `gcloud run services list --project ${config.projectId} --region ${config.region} --format json`
      );
      const services = JSON.parse(stdout);
      return services.map(s => ({
        name: s.metadata.name,
        url: s.status?.url || '',
        ready: s.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True',
        lastDeployed: s.metadata.creationTimestamp,
      }));
    } catch {
      return [];
    }
  }

  async deleteDeployment(serviceName) {
    const config = this._getConfig();
    await this._exec(
      `gcloud run services delete ${serviceName} --project ${config.projectId} --region ${config.region} --quiet`
    );
    return { success: true };
  }

  async getServiceStatus(serviceName) {
    const config = this._getConfig();
    const { stdout } = await this._exec(
      `gcloud run services describe ${serviceName} --project ${config.projectId} --region ${config.region} --format json`
    );
    return JSON.parse(stdout);
  }

  async getServiceLogs(serviceName) {
    const config = this._getConfig();
    const { stdout } = await this._exec(
      `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${serviceName}" ` +
      `--project ${config.projectId} --limit 100 --format json`
    );
    return JSON.parse(stdout);
  }
}

module.exports = { GCloudDeployer };
