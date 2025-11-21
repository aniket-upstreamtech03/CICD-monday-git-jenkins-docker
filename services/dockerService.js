const { exec } = require('child_process');
const { promisify } = require('util');
const { STATUS } = require('../config/constants');

const execPromise = promisify(exec);

class DockerService {
  constructor() {
    this.containerName = process.env.DOCKER_CONTAINER_NAME || 'integration-server';
  }

  /**
   * Get Docker container status
   */
  async getContainerStatus(containerName = this.containerName) {
    try {
      const { stdout } = await execPromise(
        `docker inspect --format="{{.State.Status}}" ${containerName}`
      );
      const status = stdout.trim();
      
      return {
        success: true,
        status: this.mapDockerStatusToMonday(status),
        rawStatus: status
      };
    } catch (error) {
      console.error('❌ Error getting container status:', error.message);
      return {
        success: false,
        status: STATUS.DOCKER.STOPPED,
        error: error.message
      };
    }
  }

  /**
   * Get container ID
   */
  async getContainerId(containerName = this.containerName) {
    try {
      const { stdout } = await execPromise(
        `docker inspect --format="{{.Id}}" ${containerName}`
      );
      const containerId = stdout.trim().substring(0, 12); // Short ID
      
      return {
        success: true,
        containerId
      };
    } catch (error) {
      console.error('❌ Error getting container ID:', error.message);
      return {
        success: false,
        containerId: 'N/A',
        error: error.message
      };
    }
  }

  /**
   * Get Docker image version/tag
   */
  async getImageVersion(containerName = this.containerName) {
    try {
      const { stdout } = await execPromise(
        `docker inspect --format="{{.Config.Image}}" ${containerName}`
      );
      const imageTag = stdout.trim();
      
      return {
        success: true,
        imageVersion: imageTag
      };
    } catch (error) {
      console.error('❌ Error getting image version:', error.message);
      return {
        success: false,
        imageVersion: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Get exposed ports
   */
  async getExposedPorts(containerName = this.containerName) {
    try {
      const { stdout } = await execPromise(
        `docker port ${containerName}`
      );
      const ports = stdout.trim() || 'No ports exposed';
      
      return {
        success: true,
        ports: ports.replace(/\n/g, ', ')
      };
    } catch (error) {
      console.error('❌ Error getting exposed ports:', error.message);
      return {
        success: false,
        ports: 'N/A',
        error: error.message
      };
    }
  }

  /**
   * Get container health status
   */
  async getHealthStatus(containerName = this.containerName) {
    try {
      const { stdout } = await execPromise(
        `docker inspect --format="{{.State.Health.Status}}" ${containerName}`
      );
      const health = stdout.trim();
      
      // If no healthcheck defined, check if running
      if (health === '<no value>' || !health) {
        const statusResult = await this.getContainerStatus(containerName);
        return {
          success: true,
          health: statusResult.rawStatus === 'running' ? 'running' : 'unknown'
        };
      }
      
      return {
        success: true,
        health
      };
    } catch (error) {
      console.error('❌ Error getting health status:', error.message);
      return {
        success: false,
        health: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Get resource usage (CPU and Memory)
   */
  async getResourceUsage(containerName = this.containerName) {
    try {
      const { stdout } = await execPromise(
        `docker stats ${containerName} --no-stream --format "CPU: {{.CPUPerc}} | Memory: {{.MemUsage}}"`
      );
      const usage = stdout.trim();
      
      return {
        success: true,
        usage
      };
    } catch (error) {
      console.error('❌ Error getting resource usage:', error.message);
      return {
        success: false,
        usage: 'N/A',
        error: error.message
      };
    }
  }

  /**
   * Get container start time (deployment timestamp)
   */
  async getDeploymentTimestamp(containerName = this.containerName) {
    try {
      const { stdout } = await execPromise(
        `docker inspect --format="{{.State.StartedAt}}" ${containerName}`
      );
      const timestamp = stdout.trim();
      
      // Format to readable date
      const date = new Date(timestamp);
      const formattedDate = date.toISOString().replace('T', ' ').substring(0, 19);
      
      return {
        success: true,
        timestamp: formattedDate
      };
    } catch (error) {
      console.error('❌ Error getting deployment timestamp:', error.message);
      return {
        success: false,
        timestamp: 'N/A',
        error: error.message
      };
    }
  }

  /**
   * Find container by repository name
   * Searches through all containers and finds the one matching the repo name
   */
  async findContainerByRepoName(repoName, allContainersResult = null) {
    try {
      // Get containers list if not provided
      const containersResult = allContainersResult || await this.listContainers();
      
      if (!containersResult.success || !containersResult.containers) {
        return null;
      }

      // Convert repo name to lowercase first
      const repoNameLower = repoName.toLowerCase();
      
      // Normalize repo name for comparison (lowercase, remove special chars)
      const normalizedRepoName = repoNameLower.replace(/[^a-z0-9]/g, '');
      
      console.log(`   🔍 Searching for container matching repo: ${repoName}`);
      console.log(`      Lowercase: ${repoNameLower}`);
      console.log(`      Normalized: ${normalizedRepoName}`);

      // Search patterns (in order of priority):
      // 1. Exact match with lowercase repo name
      // 2. Contains lowercase repo name
      // 3. Contains normalized repo name (no special chars)
      
      for (const container of containersResult.containers) {
        const containerNameLower = container.name.toLowerCase();
        const normalizedContainerName = containerNameLower.replace(/[^a-z0-9]/g, '');
        
        console.log(`      Checking container: ${container.name} (lowercase: ${containerNameLower})`);
        
        // Pattern 1: Exact match with lowercase
        if (containerNameLower === repoNameLower) {
          console.log(`   ✅ Found exact match: ${container.name}`);
          return container.name;
        }
        
        // Pattern 2: Contains lowercase repo name
        if (containerNameLower.includes(repoNameLower)) {
          console.log(`   ✅ Found container containing lowercase repo name: ${container.name}`);
          return container.name;
        }
        
        // Pattern 3: Normalized match (removes dashes, underscores, etc.)
        if (normalizedContainerName.includes(normalizedRepoName)) {
          console.log(`   ✅ Found container with normalized match: ${container.name}`);
          return container.name;
        }
      }
      
      console.log(`   ❌ No container found matching: ${repoName}`);
      return null;
      
    } catch (error) {
      console.error('❌ Error finding container by repo name:', error.message);
      return null;
    }
  }

  /**
   * Get all container information at once
   */
  async getFullContainerInfo(containerName = this.containerName, repoName = null) {
    try {
      console.log(`🐳 Fetching Docker info for container: ${containerName}`);
      if (repoName) {
        console.log(`   📦 Repository: ${repoName}`);
      }
      
      const [status, containerId, imageVersion, ports, health, usage, timestamp] = await Promise.all([
        this.getContainerStatus(containerName),
        this.getContainerId(containerName),
        this.getImageVersion(containerName),
        this.getExposedPorts(containerName),
        this.getHealthStatus(containerName),
        this.getResourceUsage(containerName),
        this.getDeploymentTimestamp(containerName)
      ]);

      return {
        success: true,
        data: {
          status: status.status,
          containerId: containerId.containerId,
          imageVersion: imageVersion.imageVersion,
          ports: ports.ports,
          health: health.health,
          resourceUsage: usage.usage,
          deploymentTimestamp: timestamp.timestamp
        }
      };
    } catch (error) {
      console.error('❌ Error getting full container info:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all containers
   */
  async listContainers() {
    try {
      const { stdout } = await execPromise(
        'docker ps -a --format "{{.Names}}|{{.Status}}|{{.Image}}"'
      );
      
      const containers = stdout.trim().split('\n').map(line => {
        const [name, status, image] = line.split('|');
        return { name, status, image };
      });
      
      return {
        success: true,
        containers
      };
    } catch (error) {
      console.error('❌ Error listing containers:', error.message);
      return {
        success: false,
        error: error.message,
        containers: []
      };
    }
  }

  /**
   * Stop container
   */
  async stopContainer(containerName = this.containerName) {
    try {
      await execPromise(`docker stop ${containerName}`);
      console.log(`✅ Container ${containerName} stopped`);
      
      return {
        success: true,
        message: `Container ${containerName} stopped successfully`
      };
    } catch (error) {
      console.error('❌ Error stopping container:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start container
   */
  async startContainer(containerName = this.containerName) {
    try {
      await execPromise(`docker start ${containerName}`);
      console.log(`✅ Container ${containerName} started`);
      
      return {
        success: true,
        message: `Container ${containerName} started successfully`
      };
    } catch (error) {
      console.error('❌ Error starting container:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restart container
   */
  async restartContainer(containerName = this.containerName) {
    try {
      await execPromise(`docker restart ${containerName}`);
      console.log(`✅ Container ${containerName} restarted`);
      
      return {
        success: true,
        message: `Container ${containerName} restarted successfully`
      };
    } catch (error) {
      console.error('❌ Error restarting container:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove container
   */
  async removeContainer(containerName = this.containerName, force = false) {
    try {
      const forceFlag = force ? ' -f' : '';
      await execPromise(`docker rm${forceFlag} ${containerName}`);
      console.log(`✅ Container ${containerName} removed`);
      
      return {
        success: true,
        message: `Container ${containerName} removed successfully`
      };
    } catch (error) {
      console.error('❌ Error removing container:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerName = this.containerName, lines = 100) {
    try {
      const { stdout } = await execPromise(
        `docker logs --tail ${lines} ${containerName}`
      );
      
      return {
        success: true,
        logs: stdout
      };
    } catch (error) {
      console.error('❌ Error getting container logs:', error.message);
      return {
        success: false,
        error: error.message,
        logs: ''
      };
    }
  }

  /**
   * Map Docker status to Monday.com status labels
   */
  mapDockerStatusToMonday(dockerStatus) {
    const statusMap = {
      'running': STATUS.DOCKER.RUNNING,
      'exited': STATUS.DOCKER.EXITED,
      'stopped': STATUS.DOCKER.STOPPED,
      'paused': STATUS.DOCKER.PAUSED,
      'restarting': STATUS.DOCKER.RESTARTING,
      'removing': STATUS.DOCKER.REMOVING,
      'dead': STATUS.DOCKER.DEAD,
      'created': STATUS.DOCKER.STARTING
    };
    
    return statusMap[dockerStatus.toLowerCase()] || STATUS.DOCKER.FAILED;
  }

  /**
   * Check if Docker is running
   */
  async isDockerRunning() {
    try {
      await execPromise('docker info');
      return true;
    } catch (error) {
      console.error('❌ Docker is not running or not installed');
      return false;
    }
  }

  /**
   * Build Docker image
   */
  async buildImage(imageName, tag = 'latest', dockerfile = 'Dockerfile') {
    try {
      console.log(`🔨 Building Docker image: ${imageName}:${tag}`);
      
      const { stdout, stderr } = await execPromise(
        `docker build -t ${imageName}:${tag} -f ${dockerfile} .`
      );
      
      console.log('✅ Docker image built successfully');
      
      return {
        success: true,
        message: `Image ${imageName}:${tag} built successfully`,
        output: stdout
      };
    } catch (error) {
      console.error('❌ Error building Docker image:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new DockerService();
