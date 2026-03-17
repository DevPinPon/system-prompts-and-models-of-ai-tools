const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const tar = require('tar-fs');

class DockerManager {
  constructor(store) {
    this.store = store;
    this.docker = new Docker();
    this.containers = new Map();
  }

  async getStatus() {
    try {
      const info = await this.docker.info();
      return {
        connected: true,
        version: info.ServerVersion,
        containers: info.Containers,
        images: info.Images,
      };
    } catch (error) {
      return {
        connected: false,
        error: 'Docker is not running. Please start Docker Desktop.',
      };
    }
  }

  async buildWorkspace(projectPath, emitEvent) {
    const dockerfilePath = path.join(projectPath, 'Dockerfile');

    // Auto-generate Dockerfile if none exists
    if (!fs.existsSync(dockerfilePath)) {
      const dockerfile = this._generateDockerfile(projectPath);
      fs.writeFileSync(dockerfilePath, dockerfile);
      emitEvent?.({ type: 'info', message: 'Generated Dockerfile for your project.' });
    }

    emitEvent?.({ type: 'build_start', message: 'Building Docker image...' });

    const tarStream = tar.pack(projectPath, {
      ignore: (name) => {
        const rel = path.relative(projectPath, name);
        return rel.startsWith('node_modules') || rel.startsWith('.git') || rel.startsWith('dist');
      },
    });

    const imageName = `local-replit-${path.basename(projectPath).toLowerCase()}`;

    return new Promise((resolve, reject) => {
      this.docker.buildImage(tarStream, { t: imageName }, (err, stream) => {
        if (err) {
          emitEvent?.({ type: 'build_error', message: err.message });
          return reject(err);
        }

        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) {
            emitEvent?.({ type: 'build_error', message: err.message });
            return reject(err);
          }
          emitEvent?.({ type: 'build_complete', imageName });
          resolve({ imageName, output });
        }, (event) => {
          if (event.stream) {
            emitEvent?.({ type: 'build_log', message: event.stream.trim() });
          }
        });
      });
    });
  }

  async startContainer(projectPath, emitEvent) {
    const imageName = `local-replit-${path.basename(projectPath).toLowerCase()}`;
    const containerName = `replit-${path.basename(projectPath).toLowerCase()}-${Date.now()}`;

    emitEvent?.({ type: 'container_starting', message: 'Starting container...' });

    const container = await this.docker.createContainer({
      Image: imageName,
      name: containerName,
      ExposedPorts: { '3000/tcp': {}, '5000/tcp': {}, '8080/tcp': {} },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: '3001' }],
          '5000/tcp': [{ HostPort: '5001' }],
          '8080/tcp': [{ HostPort: '8081' }],
        },
        Binds: [`${projectPath}:/workspace`],
        Memory: 2 * 1024 * 1024 * 1024, // 2GB
        CpuShares: 1024,
      },
      WorkingDir: '/workspace',
      Env: [
        'NODE_ENV=development',
        'PORT=3000',
      ],
    });

    await container.start();
    this.containers.set(container.id, { container, projectPath, containerName });

    emitEvent?.({
      type: 'container_started',
      containerId: container.id,
      containerName,
      ports: { 3000: 3001, 5000: 5001, 8080: 8081 },
    });

    return { containerId: container.id, containerName };
  }

  async stopContainer(containerId) {
    const entry = this.containers.get(containerId);
    if (!entry) throw new Error('Container not found');
    await entry.container.stop();
    await entry.container.remove();
    this.containers.delete(containerId);
    return { success: true };
  }

  async getLogs(containerId) {
    const entry = this.containers.get(containerId);
    if (!entry) throw new Error('Container not found');
    const logs = await entry.container.logs({
      stdout: true, stderr: true, tail: 200, timestamps: true,
    });
    return logs.toString('utf-8');
  }

  _generateDockerfile(projectPath) {
    // Detect project type
    const files = fs.readdirSync(projectPath);

    if (files.includes('package.json')) {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      const hasTS = files.includes('tsconfig.json');
      return `FROM node:20-slim
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY . .
${hasTS ? 'RUN npm run build\n' : ''}EXPOSE 3000
CMD ["npm", "start"]
`;
    }

    if (files.includes('requirements.txt') || files.includes('Pipfile')) {
      return `FROM python:3.12-slim
WORKDIR /workspace
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3000
CMD ["python", "app.py"]
`;
    }

    if (files.includes('go.mod')) {
      return `FROM golang:1.22-alpine
WORKDIR /workspace
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o app .
EXPOSE 3000
CMD ["./app"]
`;
    }

    if (files.includes('Cargo.toml')) {
      return `FROM rust:1.80-slim
WORKDIR /workspace
COPY . .
RUN cargo build --release
EXPOSE 3000
CMD ["./target/release/app"]
`;
    }

    // Generic fallback
    return `FROM ubuntu:24.04
RUN apt-get update && apt-get install -y curl git build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY . .
EXPOSE 3000
CMD ["/bin/bash"]
`;
  }
}

module.exports = { DockerManager };
