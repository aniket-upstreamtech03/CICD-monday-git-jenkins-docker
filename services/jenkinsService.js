const axios = require('axios');
const { JENKINS_CONFIG, STATUS } = require('../config/constants');

class JenkinsService {
  constructor() {
    const auth = Buffer.from(`${JENKINS_CONFIG.USERNAME}:${JENKINS_CONFIG.API_TOKEN}`).toString('base64');
    
    this.api = axios.create({
      baseURL: JENKINS_CONFIG.BASE_URL,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Get Jenkins job information
  async getJobInfo(jobName = JENKINS_CONFIG.JOB_NAME) {
    try {
      const response = await this.api.get(`/job/${jobName}/api/json`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get build information
  async getBuildInfo(jobName, buildNumber) {
    try {
      const response = await this.api.get(`/job/${jobName}/${buildNumber}/api/json`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get last build information
  async getLastBuildInfo(jobName = JENKINS_CONFIG.JOB_NAME) {
    try {
      const response = await this.api.get(`/job/${jobName}/lastBuild/api/json`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get build console output
  async getBuildConsoleOutput(jobName, buildNumber) {
    try {
      const response = await this.api.get(`/job/${jobName}/${buildNumber}/consoleText`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Trigger a new build

//   async triggerBuild(jobName = JENKINS_CONFIG.JOB_NAME, parameters = {}) {
//     try {
//       let url = `/job/${jobName}/build`;
      
//       if (Object.keys(parameters).length > 0) {
//         const params = new URLSearchParams(parameters);
//         url = `/job/${jobName}/buildWithParameters?${params}`;
//       }

//       const response = await this.api.post(url);
//       return {
//         success: true,
//         data: {
//           queueUrl: response.headers['location'],
//           message: 'Build triggered successfully'
//         }
//       };
//     } catch (error) {
//       return {
//         success: false,
//         error: error.message
//       };
//     }
//   }

// In services/jenkinsService.js - Update the triggerBuild method
async triggerBuild(jobName = JENKINS_CONFIG.JOB_NAME, parameters = {}) {
  try {
    let url = `/job/${jobName}/build`;
    
    // Add cause parameter for better tracking
    const allParams = {
      cause: `Triggered by GitHub webhook: ${parameters.COMMIT_MESSAGE || 'Manual trigger'}`,
      ...parameters
    };
    
    if (Object.keys(allParams).length > 0) {
      const params = new URLSearchParams();
      Object.keys(allParams).forEach(key => {
        if (allParams[key]) {
          params.append(key, allParams[key]);
        }
      });
      url = `/job/${jobName}/buildWithParameters?${params}`;
    }

    console.log(`🔧 Triggering Jenkins build: ${JENKINS_CONFIG.BASE_URL}${url}`);
    
    const response = await this.api.post(url);
    
    // Get queue item to track build
    const queueUrl = response.headers['location'];
    console.log(`✅ Build triggered. Queue URL: ${queueUrl}`);
    
    return {
      success: true,
      data: {
        queueUrl: queueUrl,
        message: 'Build triggered successfully'
      }
    };
  } catch (error) {
    console.error('❌ Jenkins build trigger failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

  // Parse build status
  parseBuildStatus(buildData) {
    if (!buildData) return STATUS.JENKINS.NOT_STARTED;
    
    if (buildData.building) return STATUS.JENKINS.BUILDING;
    
    switch (buildData.result) {
      case 'SUCCESS':
        return STATUS.JENKINS.SUCCESS;
      case 'FAILURE':
        return STATUS.JENKINS.FAILED;
      case 'UNSTABLE':
        return STATUS.JENKINS.UNSTABLE;
      case 'ABORTED':
        return STATUS.JENKINS.ABORTED;
      default:
        return STATUS.JENKINS.NOT_STARTED;
    }
  }

  // Get build stages information
  async getBuildStages(jobName, buildNumber) {
    try {
      const response = await this.api.get(`/job/${jobName}/${buildNumber}/wfapi/describe`);
      const stages = response.data.stages || [];
      
      return {
        success: true,
        data: stages.map(stage => ({
          name: stage.name,
          status: stage.status,
          duration: stage.durationMillis,
          startTime: stage.startTimeMillis,
          endTime: stage.endTimeMillis
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Monitor build progress
  async monitorBuild(jobName, buildNumber, interval = 5000) {
    return new Promise(async (resolve) => {
      const checkBuild = async () => {
        const buildInfo = await this.getBuildInfo(jobName, buildNumber);
        
        if (buildInfo.success && !buildInfo.data.building) {
          resolve(buildInfo.data);
        } else {
          setTimeout(checkBuild, interval);
        }
      };
      
      await checkBuild();
    });
  }

  // Get test results from build
  async getTestResults(jobName, buildNumber) {
    try {
      const response = await this.api.get(`/job/${jobName}/${buildNumber}/testReport/api/json`);
      const testData = response.data;
      
      return {
        success: true,
        data: {
          totalTests: testData.totalCount || 0,
          passedTests: testData.passCount || 0,
          failedTests: testData.failCount || 0,
          skippedTests: testData.skipCount || 0
        }
      };
    } catch (error) {
      // If no test report exists, return 0 tests
      return {
        success: true,
        data: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0
        }
      };
    }
  }
}

module.exports = new JenkinsService();