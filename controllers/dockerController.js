const dockerService = require('../services/dockerService');
const mondayService = require('../services/mondayService');
const { MONDAY_COLUMNS } = require('../config/constants');

class DockerController {
  
  /**
   * Handle Docker deployment notification from Jenkins
   * This gets called after Jenkins successfully deploys a container
   */
  async handleDeploymentNotification(req, res) {
    try {
      const {
        containerName,
        featureName,
        branchName,
        buildNumber,
        imageTag,
        repositoryName
      } = req.body;

      console.log(`🐳 Docker deployment notification received`);
      console.log(`📦 Feature: ${featureName}, Branch: ${branchName}`);
      console.log(`📋 Repository: ${repositoryName}`);
      console.log(`📦 Container Name (Jenkins): ${containerName}`);

      // Try to find the actual container by repository name
      let actualContainerName = containerName;
      
      if (repositoryName) {
        console.log(`🔍 Searching for container matching repository: ${repositoryName}`);
        const foundContainer = await dockerService.findContainerByRepoName(repositoryName);
        
        if (foundContainer) {
          actualContainerName = foundContainer;
          console.log(`✅ Using found container: ${actualContainerName}`);
        } else {
          console.log(`⚠️  No container found for repo: ${repositoryName}, trying original name: ${containerName}`);
        }
      }

      // Get full container information
      const containerInfo = await dockerService.getFullContainerInfo(actualContainerName, repositoryName);
      
      if (!containerInfo.success) {
        console.error('❌ Failed to get container info:', containerInfo.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve container information',
          details: containerInfo.error
        });
      }

      console.log('📊 Container Info:', containerInfo.data);

      // Build Monday.com column values
      const columnValues = mondayService.buildColumnValues('docker_deployed', {
        dockerStatus: containerInfo.data.status,
        containerId: containerInfo.data.containerId,
        imageVersion: imageTag || containerInfo.data.imageVersion,
        ports: containerInfo.data.ports,
        health: containerInfo.data.health,
        resourceUsage: containerInfo.data.resourceUsage,
        deploymentTimestamp: containerInfo.data.deploymentTimestamp
      });

      // Also add build information
      if (buildNumber) {
        columnValues[MONDAY_COLUMNS.BUILD_NUMBER] = buildNumber.toString();
      }

      // Update Monday.com
      const itemName = branchName || featureName || containerName;
      const mondayResult = await mondayService.updatePipelineItem(
        itemName,
        columnValues,
        '', // No commit ID for Docker events
        branchName
      );

      if (mondayResult.success) {
        console.log('✅ Monday.com updated with Docker deployment info');
      } else {
        console.error('❌ Failed to update Monday.com:', mondayResult.error);
      }

      res.status(200).json({
        success: true,
        message: 'Docker deployment tracked successfully',
        containerInfo: containerInfo.data,
        mondayUpdate: mondayResult.success
      });

    } catch (error) {
      console.error('❌ Error handling Docker deployment notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process Docker deployment notification',
        message: error.message
      });
    }
  }

  /**
   * Get current status of a container
   */
  async getContainerStatus(req, res) {
    try {
      const { containerName } = req.params;
      
      if (!containerName) {
        return res.status(400).json({
          success: false,
          error: 'Container name is required'
        });
      }

      const containerInfo = await dockerService.getFullContainerInfo(containerName);
      
      if (!containerInfo.success) {
        return res.status(404).json({
          success: false,
          error: 'Container not found or not accessible',
          details: containerInfo.error
        });
      }

      res.status(200).json({
        success: true,
        data: containerInfo.data
      });

    } catch (error) {
      console.error('❌ Error getting container status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get container status',
        message: error.message
      });
    }
  }

  /**
   * List all Docker containers
   */
  async listContainers(req, res) {
    try {
      const result = await dockerService.listContainers();
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to list containers',
          details: result.error
        });
      }

      res.status(200).json({
        success: true,
        containers: result.containers
      });

    } catch (error) {
      console.error('❌ Error listing containers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list containers',
        message: error.message
      });
    }
  }

  /**
   * Update Monday.com with current Docker status
   * Can be called periodically or on-demand
   */
  async updateMondayWithDockerStatus(req, res) {
    try {
      const { containerName, featureName, branchName } = req.body;

      if (!containerName) {
        return res.status(400).json({
          success: false,
          error: 'Container name is required'
        });
      }

      const containerInfo = await dockerService.getFullContainerInfo(containerName);
      
      if (!containerInfo.success) {
        return res.status(404).json({
          success: false,
          error: 'Container not found',
          details: containerInfo.error
        });
      }

      const columnValues = mondayService.buildColumnValues('docker_status_update', {
        dockerStatus: containerInfo.data.status,
        health: containerInfo.data.health,
        resourceUsage: containerInfo.data.resourceUsage
      });

      const itemName = branchName || featureName || containerName;
      const mondayResult = await mondayService.updatePipelineItem(
        itemName,
        columnValues,
        '',
        branchName
      );

      res.status(200).json({
        success: true,
        message: 'Monday.com updated with Docker status',
        containerInfo: containerInfo.data,
        mondayUpdate: mondayResult.success
      });

    } catch (error) {
      console.error('❌ Error updating Monday.com with Docker status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update Monday.com',
        message: error.message
      });
    }
  }

  /**
   * Handle Docker deployment failure
   */
  async handleDeploymentFailure(req, res) {
    try {
      const { featureName, branchName, errorMessage, buildNumber } = req.body;

      if (!featureName && !branchName) {
        return res.status(400).json({
          success: false,
          error: 'Feature name or branch name is required'
        });
      }

      const columnValues = mondayService.buildColumnValues('docker_failed', {
        errorMessage: errorMessage || 'Docker deployment failed'
      });

      if (buildNumber) {
        columnValues[MONDAY_COLUMNS.BUILD_NUMBER] = buildNumber.toString();
      }

      const itemName = branchName || featureName;
      const mondayResult = await mondayService.updatePipelineItem(
        itemName,
        columnValues,
        '',
        branchName
      );

      res.status(200).json({
        success: true,
        message: 'Docker failure tracked in Monday.com',
        mondayUpdate: mondayResult.success
      });

    } catch (error) {
      console.error('❌ Error handling Docker deployment failure:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track deployment failure',
        message: error.message
      });
    }
  }

  /**
   * Container control endpoints
   */
  async startContainer(req, res) {
    try {
      const { containerName } = req.params;
      const result = await dockerService.startContainer(containerName);
      
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async stopContainer(req, res) {
    try {
      const { containerName } = req.params;
      const result = await dockerService.stopContainer(containerName);
      
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async restartContainer(req, res) {
    try {
      const { containerName } = req.params;
      const result = await dockerService.restartContainer(containerName);
      
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getContainerLogs(req, res) {
    try {
      const { containerName } = req.params;
      const lines = req.query.lines || 100;
      
      const result = await dockerService.getContainerLogs(containerName, lines);
      
      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new DockerController();
