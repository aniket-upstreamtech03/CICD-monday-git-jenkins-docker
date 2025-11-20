const jenkinsService = require('../services/jenkinsService');
const mondayService = require('../services/mondayService');

class JenkinsController {

  // Get Jenkins server status
  async getJenkinsStatus(req, res) {
    try {
      const jobInfo = await jenkinsService.getJobInfo();
      
      if (jobInfo.success) {
        res.json({
          success: true,
          data: {
            jenkins: {
              url: process.env.JENKINS_URL,
              version: jobInfo.data.nodeDescription,
              mode: jobInfo.data.mode
            },
            job: {
              name: jobInfo.data.name,
              url: jobInfo.data.url,
              color: jobInfo.data.color,
              lastBuild: jobInfo.data.lastBuild
            },
            builds: jobInfo.data.builds.slice(0, 5).map(build => ({
              number: build.number,
              url: build.url,
              result: build.result
            }))
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: jobInfo.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get specific build information
  async getBuildInfo(req, res) {
    try {
      const { buildNumber } = req.params;
      const jobName = req.query.job || process.env.JENKINS_JOB_NAME;
      
      const buildInfo = await jenkinsService.getBuildInfo(jobName, buildNumber);
      
      if (buildInfo.success) {
        // Get stage information if available
        const stagesInfo = await jenkinsService.getBuildStages(jobName, buildNumber);
        
        res.json({
          success: true,
          data: {
            build: buildInfo.data,
            stages: stagesInfo.success ? stagesInfo.data : [],
            status: jenkinsService.parseBuildStatus(buildInfo.data)
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: buildInfo.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get last build information
  async getLastBuild(req, res) {
    try {
      const jobName = req.query.job || process.env.JENKINS_JOB_NAME;
      
      const buildInfo = await jenkinsService.getLastBuildInfo(jobName);
      
      if (buildInfo.success) {
        const stagesInfo = await jenkinsService.getBuildStages(jobName, buildInfo.data.number);
        
        res.json({
          success: true,
          data: {
            build: buildInfo.data,
            stages: stagesInfo.success ? stagesInfo.data : [],
            status: jenkinsService.parseBuildStatus(buildInfo.data)
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: buildInfo.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Trigger a build manually
  async triggerBuild(req, res) {
    try {
      const { jobName, parameters } = req.body;
      
      const buildResult = await jenkinsService.triggerBuild(
        jobName || process.env.JENKINS_JOB_NAME,
        parameters || {}
      );
      
      if (buildResult.success) {
        res.json({
          success: true,
          data: buildResult.data,
          message: 'Build triggered successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: buildResult.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get build console output
  async getConsoleOutput(req, res) {
    try {
      const { buildNumber } = req.params;
      const jobName = req.query.job || process.env.JENKINS_JOB_NAME;
      
      const consoleOutput = await jenkinsService.getBuildConsoleOutput(jobName, buildNumber);
      
      if (consoleOutput.success) {
        res.json({
          success: true,
          data: {
            output: consoleOutput.data,
            buildNumber: parseInt(buildNumber),
            jobName: jobName
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: consoleOutput.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all jobs
  async getAllJobs(req, res) {
    try {
      // Get Jenkins root info which contains jobs list
      const auth = Buffer.from(`${process.env.JENKINS_USERNAME}:${process.env.JENKINS_API_TOKEN}`).toString('base64');
      
      const response = await require('axios').get(`${process.env.JENKINS_URL}/api/json`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      res.json({
        success: true,
        data: {
          jobs: response.data.jobs.map(job => ({
            name: job.name,
            url: job.url,
            color: job.color,
            _class: job._class
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new JenkinsController();