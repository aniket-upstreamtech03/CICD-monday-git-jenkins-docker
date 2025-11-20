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
  }
};

// Column IDs for Monday.com (You'll need to get these from your board)
const MONDAY_COLUMNS = {
  FEATURE_NAME: 'name',
  GITHUB_STATUS: 'color_mkxt1jnm',
  JENKINS_STATUS: 'color_mkxtrhcq',
  PR_URL: 'text_mkxthvpn',
  BUILD_URL: 'text_mkxt8btk',
  DEVELOPER: 'text_mkxtt4m',          // Text column
  REVIEWER: 'text_mkxtr8qw',          // Text column - who reviewed/merged PR
  LAST_UPDATED: 'text_mkxtag7b',      // TEXT column (not date!)
  COMMIT_MESSAGE: 'text_mkxtbdvy',    // Text column
  TEST_STATUS: 'color_mkxt63hr',
  BUILD_STATUS: 'color_mkxthsg8',
  DEPLOY_STATUS: 'color_mkxtkmck',
  BUILD_NUMBER: 'text_mkxtcexj',
  TEST_COUNT: 'text_mkxtfqpp',
  BUILD_TIMELINE: 'text_mkxtt63z',
  REPO_NAME: 'text_mkxvrvpf',         // Repository name
  REPO_URL: 'text_mkxvh80n',          // Repository URL
  JENKINS_JOB_NAME: 'text_mkxvbrz7'   // Jenkins job name
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