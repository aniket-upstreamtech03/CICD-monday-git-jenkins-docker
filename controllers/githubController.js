const githubService = require('../services/githubService');
const jenkinsService = require('../services/jenkinsService');
const mondayService = require('../services/mondayService');
const dockerService = require('../services/dockerService');
const { STATUS, MONDAY_COLUMNS, getJenkinsJobFromRepo } = require('../config/constants');

class GitHubController {
  
  // Handle GitHub webhook
  async handleWebhook(req, res) {
    try {
      const { body, headers } = req;
      const event = headers['x-github-event'];
      const signature = headers['x-hub-signature-256'];

      console.log(`📦 GitHub Webhook Received: ${event}`);

      // Verify webhook signature (optional for development)
      if (!githubService.verifyWebhookSignature(JSON.stringify(body), signature)) {
        console.warn('⚠️ GitHub webhook signature verification failed');
      }

      // Parse webhook payload
      const webhookData = githubService.parseWebhookPayload(body);
      
      if (!webhookData) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook payload'
        });
      }

      console.log(`🔍 Webhook Data:`, webhookData);

      // Update Monday.com with GitHub event
      await this.updateMondayWithGitHubEvent(webhookData);

      // Handle different GitHub events
      switch (event) {
        case 'push':
          await this.handlePushEvent(webhookData, body);
          break;
        
        case 'pull_request':
          await this.handlePullRequestEvent(webhookData, body);
          break;
        
        case 'pull_request_review':
          await this.handlePRReviewEvent(webhookData, body);
          break;
        
        default:
          console.log(`ℹ️ Unhandled GitHub event: ${event}`);
      }

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        event: event,
        feature: webhookData.featureName,
        repository: webhookData.repository
      });

    } catch (error) {
      console.error('❌ Error handling GitHub webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        message: error.message
      });
    }
  }

  // Enhanced GitHub status update method
  async updateMondayWithGitHubEvent(webhookData) {
    try {
      // SKIP DUPLICATE/INVALID WEBHOOKS - Prevent erasing existing data
      if (!webhookData.commitId || webhookData.commitMessage === 'No commit message') {
        console.log(`⏭️ Skipping duplicate/invalid webhook (no commit data) for: ${webhookData.featureName}`);
        return { success: true, skipped: true };
      }

      let columnValues;
      
      if (webhookData.eventType === 'pull_request') {
        columnValues = this.getGitHubPRColumnValues(webhookData);
      } else if (webhookData.eventType === 'push') {
        columnValues = this.getGitHubPushColumnValues(webhookData);
      } else {
        // Extract repo info for unknown events too
        const repoName = webhookData.repository ? webhookData.repository.split('/')[1] : '';
        const repoUrl = webhookData.repositoryUrl || '';
        const jenkinsJobName = getJenkinsJobFromRepo(webhookData.repository);
        
        columnValues = mondayService.buildColumnValues('github_push', {
          developer: webhookData.developer,
          commitMessage: webhookData.commitMessage,
          prUrl: webhookData.prUrl,
          branch: webhookData.branch,
          repoName: repoName,
          repoUrl: repoUrl,
          jenkinsJobName: jenkinsJobName || ''
        });
      }

      // IMPORTANT: Pass branch name as the item name
      const result = await mondayService.updatePipelineItem(
        webhookData.featureName,
        columnValues,
        webhookData.commitId,
        webhookData.branch // Pass branch name for item naming
      );

      if (result.success) {
        console.log(`✅ Monday.com updated for ${webhookData.eventType}: ${webhookData.branch || webhookData.featureName}`);
      } else {
        console.error('❌ Failed to update Monday.com:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error updating Monday.com:', error);
      return { success: false, error: error.message };
    }
  }

  // Get column values for PR events
  getGitHubPRColumnValues(webhookData) {
    let githubStatus = 'Open';
    let statusMessage = '';
    const columnValues = {};
    
    // Extract repository info
    const repoName = webhookData.repository ? webhookData.repository.split('/')[1] : '';
    const repoUrl = webhookData.repositoryUrl || '';
    
    switch (webhookData.action) {
      case 'opened':
        githubStatus = 'Open';
        statusMessage = 'PR Created - Waiting for Review';
        columnValues[MONDAY_COLUMNS.PR_URL] = webhookData.prUrl;
        columnValues[MONDAY_COLUMNS.COMMIT_MESSAGE] = webhookData.commitMessage;
        columnValues[MONDAY_COLUMNS.REPO_NAME] = repoName;
        columnValues[MONDAY_COLUMNS.REPO_URL] = repoUrl;
        break;
      
      case 'reopened':
        githubStatus = 'In Progress';
        statusMessage = 'PR Reopened';
        columnValues[MONDAY_COLUMNS.PR_URL] = webhookData.prUrl;
        break;
      
      case 'closed':
        if (webhookData.isMerge) {
          githubStatus = 'Completed';
          statusMessage = 'PR Merged to Main';
          columnValues[MONDAY_COLUMNS.COMMIT_MESSAGE] = `Merged: ${webhookData.commitMessage}`;
          // IMPORTANT: Preserve PR URL on merge
          columnValues[MONDAY_COLUMNS.PR_URL] = webhookData.prUrl;
          if (webhookData.reviewer) {
            columnValues[MONDAY_COLUMNS.REVIEWER] = webhookData.reviewer;
          }
        } else {
          githubStatus = 'Closed';
          statusMessage = 'PR Closed Without Merge';
          // Also preserve PR URL when closed without merge
          columnValues[MONDAY_COLUMNS.PR_URL] = webhookData.prUrl;
        }
        break;
      
      case 'ready_for_review':
        githubStatus = 'In Progress';
        statusMessage = 'PR Ready for Review';
        break;
      
      default:
        githubStatus = 'In Progress';
        statusMessage = `PR ${webhookData.action}`;
    }

    return {
      [MONDAY_COLUMNS.GITHUB_STATUS]: { label: githubStatus },
      [MONDAY_COLUMNS.DEVELOPER]: webhookData.developer,
      [MONDAY_COLUMNS.REPO_NAME]: repoName,
      [MONDAY_COLUMNS.REPO_URL]: repoUrl,
      ...columnValues
    };
  }

  // Get column values for Push events
  getGitHubPushColumnValues(webhookData) {
    let githubStatus = 'In Progress';
    
    if (webhookData.isMainBranch && webhookData.isMerge) {
      githubStatus = 'Completed';
    } else if (webhookData.isMainBranch) {
      githubStatus = 'Direct Push to Main';
    }

    // Extract repository info and Jenkins job name
    const repoName = webhookData.repository ? webhookData.repository.split('/')[1] : '';
    const repoUrl = webhookData.repositoryUrl || '';
    const jenkinsJobName = getJenkinsJobFromRepo(webhookData.repository);

    return {
      [MONDAY_COLUMNS.GITHUB_STATUS]: { label: githubStatus },
      [MONDAY_COLUMNS.DEVELOPER]: webhookData.developer,
      [MONDAY_COLUMNS.COMMIT_MESSAGE]: webhookData.commitMessage,
      [MONDAY_COLUMNS.PR_URL]: webhookData.prUrl || '',
      [MONDAY_COLUMNS.BUILD_STATUS]: { label: 'Pending' },
      [MONDAY_COLUMNS.REPO_NAME]: repoName,
      [MONDAY_COLUMNS.REPO_URL]: repoUrl,
      [MONDAY_COLUMNS.JENKINS_JOB_NAME]: jenkinsJobName || ''
    };
  }

  // Enhanced PR event handler - remove duplicate updates
  async handlePullRequestEvent(webhookData, payload) {
    try {
      const { pull_request } = payload;
      
      // Only create update message, main update happens in updateMondayWithGitHubEvent
      let statusMessage = '';
      
      switch (webhookData.action) {
        case 'opened':
          statusMessage = 'PR Created - Waiting for Review';
          break;
        case 'closed':
          statusMessage = webhookData.isMerge ? 'PR Merged to Main' : 'PR Closed Without Merge';
          break;
        default:
          statusMessage = `PR ${webhookData.action}`;
      }

      console.log(`✅ PR ${webhookData.action} handled: ${webhookData.featureName} - ${statusMessage}`);

      // If PR is merged, prepare for Jenkins build
      if (webhookData.isMerge) {
        console.log(`🎉 PR Merged - Main branch push will trigger Jenkins`);
      }

    } catch (error) {
      console.error('❌ Error handling PR event:', error);
    }
  }

  // Handle push events
  async handlePushEvent(webhookData, payload) {
    try {
      // Check if this is a merge commit to main
      if (webhookData.isMerge && webhookData.sourceBranch) {
        console.log(`🎯 Merge to main detected - Updating source branch item: ${webhookData.sourceBranch}`);
        console.log(`   Merged from: ${webhookData.sourceBranch} → ${webhookData.targetBranch || 'main'}`);
        
        // Extract repository info
        const repoName = webhookData.repository ? webhookData.repository.split('/')[1] : '';
        const repoUrl = webhookData.repositoryUrl || '';
        const jenkinsJobName = getJenkinsJobFromRepo(webhookData.repository);
        
        // Update the ORIGINAL branch item (not main) - PRESERVE repo info
        const columnValues = {
          [MONDAY_COLUMNS.GITHUB_STATUS]: { label: 'Completed' },
          [MONDAY_COLUMNS.COMMIT_MESSAGE]: webhookData.commitMessage,
          [MONDAY_COLUMNS.JENKINS_STATUS]: { label: 'Building' },
          [MONDAY_COLUMNS.BUILD_STATUS]: { label: 'Running' },
          [MONDAY_COLUMNS.REPO_NAME]: repoName,
          [MONDAY_COLUMNS.REPO_URL]: repoUrl,
          [MONDAY_COLUMNS.JENKINS_JOB_NAME]: jenkinsJobName || ''
        };

        // Update the SOURCE branch item
        await mondayService.updatePipelineItem(
          webhookData.sourceBranch, // Use source branch as identifier
          columnValues, 
          webhookData.commitId,
          webhookData.sourceBranch // Item name is source branch
        );

        // Start monitoring Jenkins build for the source branch item
        setTimeout(() => {
          this.monitorJenkinsBuild(webhookData.sourceBranch, webhookData.repository); // Pass repo name
        }, 10000);

      } else if (webhookData.isMainBranch && !webhookData.isMerge) {
        console.log(`🎯 Direct push to main branch detected`);
        
        // Extract repository info
        const repoName = webhookData.repository ? webhookData.repository.split('/')[1] : '';
        const repoUrl = webhookData.repositoryUrl || '';
        const jenkinsJobName = getJenkinsJobFromRepo(webhookData.repository);
        
        // Direct push to main (not a merge) - track separately or ignore
        const columnValues = mondayService.buildColumnValues('jenkins_started', {
          buildNumber: 'Auto-triggered by GitHub',
          buildUrl: `${process.env.JENKINS_URL}/job/${jenkinsJobName || process.env.JENKINS_JOB_NAME}`,
          jenkinsJobName: jenkinsJobName || ''
        });

        await mondayService.updatePipelineItem(
          'main-direct-push', 
          columnValues, 
          webhookData.commitId,
          'main'
        );

        setTimeout(() => {
          this.monitorJenkinsBuild('main-direct-push', webhookData.repository);
        }, 10000);

      } else {
        console.log(`ℹ️ Feature branch push - Tracking in Monday.com: ${webhookData.branch}`);
        
        const columnValues = mondayService.buildColumnValues('github_push', {
          developer: webhookData.developer,
          commitMessage: webhookData.commitMessage,
          prUrl: webhookData.prUrl || '',
          branch: webhookData.branch,
          status: 'In Progress'
        });

        // Pass branch name as item name for feature branches
        await mondayService.updatePipelineItem(
          webhookData.featureName, 
          columnValues, 
          webhookData.commitId,
          webhookData.branch // Pass branch name
        );
      }
    } catch (error) {
      console.error('❌ Error handling push event:', error);
    }
  }

  // New method for PR review events
  async handlePRReviewEvent(webhookData, payload) {
    try {
      const { action, review, pull_request } = payload;
      
      let reviewStatus = '';
      
      switch (review.state) {
        case 'approved':
          reviewStatus = 'Approved ✅';
          break;
        case 'changes_requested':
          reviewStatus = 'Changes Requested ⚠️';
          break;
        case 'commented':
          reviewStatus = 'Commented 💬';
          break;
        default:
          reviewStatus = `Review: ${review.state}`;
      }

      const columnValues = {
        [MONDAY_COLUMNS.GITHUB_STATUS]: { label: `Review - ${reviewStatus}` },
        [MONDAY_COLUMNS.COMMIT_MESSAGE]: `PR Review: ${reviewStatus} by ${review.user?.login}`
      };

      await mondayService.updatePipelineItem(webhookData.featureName, columnValues);
      
      console.log(`✅ PR Review: ${reviewStatus} for ${webhookData.featureName}`);

    } catch (error) {
      console.error('❌ Error handling PR review event:', error);
    }
  }

  // Enhanced Jenkins Build Monitoring
  async monitorJenkinsBuild(featureName, repositoryName) {
    try {
      console.log(`👀 Starting to monitor Jenkins build for: ${featureName}`);
      
      // Extract Jenkins job name from repository
      const jenkinsJobName = getJenkinsJobFromRepo(repositoryName);
      
      if (!jenkinsJobName) {
        console.error(`❌ Cannot determine Jenkins job for repository: ${repositoryName}`);
        return;
      }
      
      console.log(`🎯 Using Jenkins job: ${jenkinsJobName} for repository: ${repositoryName}`);

      // Wait a bit for Jenkins to start the build
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Get the last build info to monitor - USING DYNAMIC JOB NAME
      const lastBuildInfo = await jenkinsService.getLastBuildInfo(jenkinsJobName);
      
      if (!lastBuildInfo.success) {
        throw new Error('Failed to get last build info: ' + lastBuildInfo.error);
      }

      const buildNumber = lastBuildInfo.data.number;
      const buildUrl = lastBuildInfo.data.url;
      
      console.log(`🔍 Monitoring Jenkins build #${buildNumber}: ${buildUrl}`);

      // Update Monday.com with build started
      const startedColumnValues = mondayService.buildColumnValues('jenkins_started', {
        buildNumber: buildNumber.toString(),
        buildUrl: buildUrl,
        jenkinsJobName: jenkinsJobName
      });

      await mondayService.updatePipelineItem(featureName, startedColumnValues);

      // Monitor build until completion - USING DYNAMIC JOB NAME
      const finalBuildInfo = await jenkinsService.monitorBuild(
        jenkinsJobName,
        buildNumber
      );

      console.log(`🏁 Build completed: ${finalBuildInfo.result}`);

      // Update Monday.com with final build status
      const buildColumnValues = mondayService.buildColumnValues('build_completed', {
        success: finalBuildInfo.result === 'SUCCESS',
        jenkinsStatus: jenkinsService.parseBuildStatus(finalBuildInfo),
        buildNumber: finalBuildInfo.number,
        buildUrl: finalBuildInfo.url
      });

      await mondayService.updatePipelineItem(featureName, buildColumnValues);

      // If build succeeded, fetch Docker container info and update Monday.com
      if (finalBuildInfo.result === 'SUCCESS') {
        console.log('🐳 Fetching Docker container information...');
        
        // Extract repository name for container search
        // Jenkins job name matches repo name (e.g., "Sample-jenkins-test")
        // Container name pattern varies, so we'll search by repo name
        console.log(`   Repository: ${repositoryName}`);
        console.log(`   Jenkins Job: ${jenkinsJobName}`);
        
        // Wait a bit for container to be fully deployed
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          // List all containers and find the one matching repo name
          const allContainers = await dockerService.listContainers();
          if (allContainers.success) {
            console.log('   Available containers:', allContainers.containers.map(c => c.name).join(', '));
          }
          
          // Find container by repository name (case-insensitive search)
          const containerName = await dockerService.findContainerByRepoName(jenkinsJobName, allContainers);
          
          if (!containerName) {
            console.log(`⚠️  No container found matching repository: ${jenkinsJobName}`);
            console.log('   Container might be on a different Docker host or using a different naming pattern.');
            return;
          }
          
          console.log(`   ✅ Found container: ${containerName}`);
          
          // Get full container info
          const dockerInfo = await dockerService.getFullContainerInfo(containerName, jenkinsJobName);
          
          if (dockerInfo.success) {
            console.log('✅ Docker container info retrieved:', dockerInfo.data);
            
            // Build Docker column values for Monday.com
            const dockerColumnValues = mondayService.buildColumnValues('docker_deployed', {
              dockerStatus: dockerInfo.data.status,
              containerId: dockerInfo.data.containerId,
              imageVersion: dockerInfo.data.imageVersion,
              ports: dockerInfo.data.ports,
              health: dockerInfo.data.health,
              resourceUsage: dockerInfo.data.resourceUsage,
              deploymentTimestamp: dockerInfo.data.deploymentTimestamp
            });
            
            // Update Monday.com with Docker info
            await mondayService.updatePipelineItem(featureName, dockerColumnValues);
            console.log('✅ Monday.com updated with Docker container details');
          } else {
            console.log('⚠️ Could not retrieve Docker container info:', dockerInfo.error);
            console.log('   This is expected if Docker deployment happens on a different machine.');
          }
        } catch (dockerError) {
          console.log('⚠️ Docker info fetch failed:', dockerError.message);
          console.log('   Container might be on a different host or not yet ready.');
        }
      }

      // Get detailed stage information - USING DYNAMIC JOB NAME
      const stagesInfo = await jenkinsService.getBuildStages(
        jenkinsJobName,
        buildNumber
      );

      if (stagesInfo.success) {
        await this.updateBuildStages(featureName, stagesInfo.data);
      }

      console.log(`✅ Build monitoring completed for: ${featureName}`);

    } catch (error) {
      console.error('❌ Error monitoring Jenkins build:', error);
      
      // Update Monday.com with monitoring failure
      const errorColumnValues = mondayService.buildColumnValues('build_completed', {
        success: false
      });

      await mondayService.updatePipelineItem(featureName, errorColumnValues);
    }
  }

  // Update build stages in Monday.com
  async updateBuildStages(featureName, stages) {
    try {
      console.log(`🔄 Updating build stages for: ${featureName}`, stages.length);
      
      for (const stage of stages) {
        let stageType = '';
        let stageData = {};

        if (stage.name.toLowerCase().includes('test')) {
          stageType = 'tests_completed';
          stageData = {
            passed: stage.status === 'SUCCESS',
            passedTests: stage.status === 'SUCCESS' ? 'All' : '0',
            totalTests: 'Multiple'
          };
        } else if (stage.name.toLowerCase().includes('build')) {
          stageType = 'build_completed';
          stageData = {
            success: stage.status === 'SUCCESS'
          };
        } else if (stage.name.toLowerCase().includes('deploy')) {
          stageType = 'deployment';
          stageData = {
            success: stage.status === 'SUCCESS'
          };
        } else {
          // Generic stage update
          stageType = 'jenkins_started';
          stageData = {
            buildNumber: `Stage: ${stage.name}`,
            buildUrl: ''
          };
        }

        if (stageType) {
          const columnValues = mondayService.buildColumnValues(stageType, stageData);
          await mondayService.updatePipelineItem(featureName, columnValues);
          
          console.log(`✅ Updated stage: ${stage.name} - ${stage.status}`);
          
          // Small delay between stage updates
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('❌ Error updating build stages:', error);
    }
  }

  // Trigger Jenkins build (kept for manual triggers if needed)
  async triggerJenkinsBuild(webhookData) {
    try {
      console.log(`🚀 Triggering Jenkins build for: ${webhookData.featureName}`);

      // Update Monday.com that build is starting
      const startColumnValues = mondayService.buildColumnValues('jenkins_started', {
        buildNumber: 'Starting...',
        buildUrl: `${process.env.JENKINS_URL}/job/${process.env.JENKINS_JOB_NAME}`
      });

      await mondayService.updatePipelineItem(
        webhookData.featureName,
        startColumnValues
      );

      // Trigger Jenkins build with proper parameters
      const buildParams = {
        BRANCH: webhookData.branch || 'main',
        COMMIT_MESSAGE: webhookData.commitMessage || 'No commit message',
        DEVELOPER: webhookData.developer || 'Unknown',
        REPOSITORY: webhookData.repository || 'Unknown',
        FEATURE_NAME: webhookData.featureName || 'Unknown Feature',
        REPOSITORY_URL: webhookData.repositoryUrl || ''
      };

      console.log(`🔧 Jenkins build parameters:`, buildParams);

      const buildResult = await jenkinsService.triggerBuild(
        process.env.JENKINS_JOB_NAME,
        buildParams
      );

      if (buildResult.success) {
        console.log(`✅ Jenkins build triggered: ${webhookData.featureName}`);
        
        // Start monitoring the build
        setTimeout(() => {
          this.monitorJenkinsBuild(webhookData.featureName, webhookData.repository);
        }, 10000); // Wait 10 seconds for build to start
        
      } else {
        console.error('❌ Failed to trigger Jenkins build:', buildResult.error);
        
        // Update Monday.com with failure
        const failColumnValues = mondayService.buildColumnValues('build_completed', {
          success: false
        });

        await mondayService.updatePipelineItem(
          webhookData.featureName,
          failColumnValues
        );
      }

      return buildResult;
    } catch (error) {
      console.error('❌ Error triggering Jenkins build:', error);
      return { success: false, error: error.message };
    }
  }

  // Get GitHub repository info
  async getRepoInfo(req, res) {
    try {
      const { owner, repo } = req.params;
      
      const repoInfo = await githubService.getRepository(owner, repo);
      
      if (repoInfo.success) {
        res.json({
          success: true,
          data: repoInfo.data
        });
      } else {
        res.status(404).json({
          success: false,
          error: repoInfo.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Create instance and bind methods
const githubController = new GitHubController();

// Bind all methods to the instance
const boundController = {
  handleWebhook: githubController.handleWebhook.bind(githubController),
  handlePushEvent: githubController.handlePushEvent.bind(githubController),
  handlePullRequestEvent: githubController.handlePullRequestEvent.bind(githubController),
  handlePRReviewEvent: githubController.handlePRReviewEvent.bind(githubController),
  updateMondayWithGitHubEvent: githubController.updateMondayWithGitHubEvent.bind(githubController),
  triggerJenkinsBuild: githubController.triggerJenkinsBuild.bind(githubController),
  monitorJenkinsBuild: githubController.monitorJenkinsBuild.bind(githubController),
  updateBuildStages: githubController.updateBuildStages.bind(githubController),
  getRepoInfo: githubController.getRepoInfo.bind(githubController)
};

module.exports = boundController;