// Jenkins API Configuration
const JENKINS_CONFIG = {
  BASE_URL: process.env.JENKINS_URL || 'http://localhost:8080',
  USERNAME: process.env.JENKINS_USERNAME || 'aniket3',
  API_TOKEN: process.env.JENKINS_API_TOKEN,
  JOB_NAME: process.env.JENKINS_JOB_NAME || 'Sample-Test-API'
};

// GitHub Configuration
const GITHUB_CONFIG = {
  API_BASE: 'https://api.github.com',
  WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET
};

// Monday.com Configuration
const MONDAY_CONFIG = {
  API_BASE: 'https://api.monday.com/v2',
  API_KEY: process.env.MONDAY_API_KEY,
  BOARD_ID: process.env.MONDAY_BOARD_ID
};

// Status Constants
const STATUS = {
  GITHUB: {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CLOSED: 'Closed'
  },
  JENKINS: {
    NOT_STARTED: 'Not Started',
    BUILDING: 'Building',
    SUCCESS: 'Success',
    FAILED: 'Failed',
    UNSTABLE: 'Unstable',
    ABORTED: 'Aborted'
  },
  STAGE: {
    PENDING: 'Pending',
    RUNNING: 'Running',
    SUCCESS: 'Success',
    FAILED: 'Failed',
    SKIPPED: 'Skipped'
  },
  DOCKER: {
    RUNNING: 'Running',
    STOPPED: 'Stopped',
    FAILED: 'Failed',
    STARTING: 'Starting',
    RESTARTING: 'Restarting',
    REMOVING: 'Removing',
    PAUSED: 'Paused',
    EXITED: 'Exited',
    DEAD: 'Dead'
  }
};

// Column IDs for Monday.com (You'll need to get these from your board)
const MONDAY_COLUMNS = {
  FEATURE_NAME: 'name',
  GITHUB_STATUS: 'color_mky2zg3q',
  JENKINS_STATUS: 'color_mky244c8',
  PR_URL: 'text_mky2qw6k',
  BUILD_URL: 'text_mky227nh',
  DEVELOPER: 'text_mky2vtfe',          // Text column
  REVIEWER: 'text_mky26tg9',          // Text column - who reviewed/merged PR
  LAST_UPDATED: 'text_mky23kab',      // TEXT column (not date!)
  COMMIT_MESSAGE: 'text_mky2xmj8',    // Text column
  TEST_STATUS: 'color_mky23msf',
  BUILD_STATUS: 'color_mky2cxt1',
  DEPLOY_STATUS: 'color_mky2vr1n',
  BUILD_NUMBER: 'text_mky2ye10',
  TEST_COUNT: 'text_mky2qmkn',
  BUILD_TIMELINE: 'text_mky2pen9',
  REPO_NAME: 'text_mky26bgy',         // Repository name
  REPO_URL: 'text_mky2jr0h',          // Repository URL
  JENKINS_JOB_NAME: 'text_mky2jz4z',  // Jenkins job name
  
  // Docker-related columns
  DOCKER_STATUS: 'color_mky2jb8h',       // Status column - Running, Stopped, Failed
  CONTAINER_ID: 'text_mky27qed',         // Text column - Docker container ID
  DOCKER_IMAGE_VERSION: 'text_mky2m1h8', // Text column - Docker image version/tag
  EXPOSED_PORTS: 'text_mky2zqmg',        // Text column - Container exposed ports
  HEALTH_STATUS: 'text_mky2y7r',        // Text column - Container health status
  RESOURCE_USAGE: 'text_mky22968',       // Text column - CPU/Memory usage
  DEPLOYMENT_TIMESTAMP: 'text_mky2d1k3' // Text column - When container was deployed
};

// Helper function to extract Jenkins job name from repository name
// Option 4: Job name matches repo name
function getJenkinsJobFromRepo(repositoryFullName) {
  if (!repositoryFullName) return null;
  
  // Extract repo name from "owner/repo-name" format
  const repoName = repositoryFullName.split('/')[1];
  
  // Jenkins job name should match the repo name exactly
  // Example: "Sample-test" repo → "Sample-test" Jenkins job
  return repoName;
}

module.exports = {
  JENKINS_CONFIG,
  GITHUB_CONFIG,
  MONDAY_CONFIG,
  STATUS,
  MONDAY_COLUMNS,
  getJenkinsJobFromRepo
};