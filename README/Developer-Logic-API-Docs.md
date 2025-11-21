# 💻 Developer Logic & API Documentation

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Complete Code Flow](#complete-code-flow)
3. [Webhook Processing Logic](#webhook-processing-logic)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Service Layer Logic](#service-layer-logic)
6. [Data Models & Structures](#data-models--structures)
7. [Integration Workflows](#integration-workflows)
8. [Error Handling](#error-handling)
9. [Code Examples](#code-examples)

---

## 🏗️ System Architecture

### **Application Structure**

```
integration-server/
├── server.js                 # Main entry point, Express setup
├── config/
│   └── constants.js          # Configuration constants, column IDs
├── routes/
│   ├── webhooks.js          # GitHub webhook routes
│   ├── jenkins.js           # Jenkins API routes
│   ├── monday.js            # Monday.com routes
│   └── docker.js            # Docker API routes
├── controllers/
│   ├── githubController.js  # GitHub webhook logic
│   ├── jenkinsController.js # Jenkins build management
│   ├── mondayController.js  # Monday.com operations
│   └── dockerController.js  # Docker deployment tracking
├── services/
│   ├── githubService.js     # GitHub API wrapper
│   ├── jenkinsService.js    # Jenkins API wrapper
│   ├── mondayService.js     # Monday.com GraphQL API
│   └── dockerService.js     # Docker CLI wrapper
└── Helper/
    └── localtunnel.js       # LocalTunnel for webhooks
```

### **Request Flow Architecture**

```
HTTP Request
     ↓
Express Middleware Stack
     ├─ helmet (security headers)
     ├─ cors (cross-origin)
     ├─ morgan (logging)
     └─ bodyParser (JSON parsing)
     ↓
Route Handler (routes/*.js)
     ↓
Controller (controllers/*.js)
     ├─ Validate request
     ├─ Call service methods
     └─ Format response
     ↓
Service (services/*.js)
     ├─ Business logic
     ├─ External API calls
     └─ Data transformation
     ↓
External APIs
     ├─ GitHub API
     ├─ Jenkins API
     ├─ Monday.com GraphQL
     └─ Docker CLI
```

---

## 🔄 Complete Code Flow

### **Flow 1: Developer Pushes Code**

```javascript
// STEP 1: GitHub sends webhook
// POST https://server.com/api/webhooks/github
// Headers: { 'x-github-event': 'push', 'x-hub-signature-256': '...' }
// Body: { ref: 'refs/heads/feature-xyz', repository: {...}, commits: [...] }

// STEP 2: routes/webhooks.js receives request
router.post('/github', githubController.handleWebhook);

// STEP 3: controllers/githubController.js processes webhook
async handleWebhook(req, res) {
  // 3.1: Validate webhook signature
  const signature = req.headers['x-hub-signature-256'];
  const isValid = this.validateWebhookSignature(req.body, signature);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 3.2: Extract event type
  const eventType = req.headers['x-github-event'];
  
  // 3.3: Parse payload using githubService
  const webhookData = githubService.parseWebhookPayload(req.body);
  
  // webhookData structure:
  // {
  //   eventType: "push",
  //   featureName: "feature-xyz",
  //   branch: "feature-xyz",
  //   developer: "aniket-upstreamtech03",
  //   commitMessage: "Add new feature",
  //   commitId: "abc123de",
  //   repository: "Sample-test",
  //   repositoryUrl: "https://github.com/.../Sample-test"
  // }

  // 3.4: Handle based on event type
  if (eventType === 'push') {
    await this.handlePushEvent(webhookData, req.body);
  } else if (eventType === 'pull_request') {
    await this.handlePullRequestEvent(webhookData, req.body);
  } else if (eventType === 'pull_request_review') {
    await this.handlePRReviewEvent(webhookData, req.body);
  }

  // 3.5: Update Monday.com
  await this.updateMondayWithGitHubEvent(webhookData);
  
  return res.status(200).json({ success: true });
}

// STEP 4: controllers/githubController.js updates Monday.com
async updateMondayWithGitHubEvent(webhookData) {
  // 4.1: Build column values based on event
  const columnValues = this.getGitHubPushColumnValues(webhookData);
  
  // columnValues structure:
  // {
  //   [MONDAY_COLUMNS.GITHUB_STATUS]: { label: "In Progress" },
  //   [MONDAY_COLUMNS.DEVELOPER]: "aniket-upstreamtech03",
  //   [MONDAY_COLUMNS.COMMIT_MESSAGE]: "Add new feature",
  //   [MONDAY_COLUMNS.LAST_UPDATED]: { date: "2025-11-20" },
  //   [MONDAY_COLUMNS.REPO_NAME]: "Sample-test",
  //   [MONDAY_COLUMNS.REPO_URL]: "https://github.com/.../Sample-test"
  // }

  // 4.2: Call mondayService to update/create item
  const result = await mondayService.updatePipelineItem(
    webhookData.featureName,  // Item name: "feature-xyz"
    columnValues,
    webhookData.commitId,
    webhookData.branch
  );
  
  return result;
}

// STEP 5: services/mondayService.js handles Monday.com update
async updatePipelineItem(featureName, columnValues, commitId, branchName) {
  // 5.1: Use branch name as item identifier
  const itemName = branchName || featureName;
  
  console.log(`🔧 Updating Monday.com item: ${featureName}`);
  console.log(`📍 Branch name: ${branchName}`);
  console.log(`📝 Item name will be: ${itemName}`);

  // 5.2: Search for existing item
  const existingItem = await this.findItemByFeatureName(itemName);

  if (existingItem) {
    // 5.3: Update existing item
    console.log(`🔄 Updating existing item: ${existingItem.id}`);
    return await this.updateItem(existingItem.id, columnValues);
  } else {
    // 5.4: Create new item
    console.log(`🆕 Creating new item: ${itemName}`);
    return await this.createItem(itemName, columnValues);
  }
}

// STEP 6: services/mondayService.js creates item via GraphQL
async createItem(featureName, columnValues) {
  const query = `
    mutation {
      create_item (
        board_id: ${this.getBoardId()},
        item_name: "${featureName}",
        column_values: "${JSON.stringify(columnValues).replace(/"/g, '\\"')}",
        create_labels_if_missing: true
      ) {
        id
        name
      }
    }
  `;

  // 6.1: Send GraphQL mutation to Monday.com
  const response = await this.api.post('', { query });
  
  // 6.2: Return result
  return {
    success: true,
    data: response.data
  };
}

// RESULT: Monday.com board now has item "feature-xyz" with all GitHub info ✅
```

---

### **Flow 2: Pull Request Merged → Jenkins Build**

```javascript
// STEP 1: PR merged on GitHub
// Webhook: { action: "closed", pull_request: { merged: true } }

// STEP 2: githubController.handlePullRequestEvent() detects merge
async handlePullRequestEvent(webhookData, payload) {
  const action = payload.action;
  const isMerged = payload.pull_request.merged;
  
  if (action === 'closed' && isMerged) {
    console.log('🎉 PR merged! Triggering Jenkins build...');
    
    // CRITICAL FIX: Preserve PR URL on merge
    columnValues[MONDAY_COLUMNS.PR_URL] = webhookData.prUrl;
    
    // Update Monday.com
    await this.updateMondayWithGitHubEvent(webhookData);
    
    // Trigger Jenkins build
    await this.triggerJenkinsBuild(webhookData);
  }
}

// STEP 3: Trigger Jenkins build
async triggerJenkinsBuild(webhookData) {
  // 3.1: Extract repository name
  const repoName = webhookData.repository.split('/')[1];
  
  // 3.2: Determine Jenkins job name (matches repo name)
  const jenkinsJobName = repoName; // e.g., "Sample-test"
  
  console.log(`🚀 Triggering Jenkins job: ${jenkinsJobName}`);

  // 3.3: Build parameters
  const buildParams = {
    BRANCH_NAME: webhookData.targetBranch || 'main',
    COMMIT_ID: webhookData.commitId,
    COMMIT_MESSAGE: webhookData.commitMessage,
    FEATURE_NAME: webhookData.featureName
  };

  // 3.4: Call jenkinsService to trigger build
  const buildResult = await jenkinsService.triggerBuild(
    jenkinsJobName,
    buildParams
  );

  if (buildResult.success) {
    console.log('✅ Jenkins build triggered successfully');
    
    // 3.5: Start monitoring build progress
    await this.monitorJenkinsBuild(
      webhookData.featureName,
      webhookData.repository
    );
  }
}

// STEP 4: Monitor Jenkins build progress
async monitorJenkinsBuild(featureName, repositoryName) {
  // 4.1: Extract Jenkins job name from repository
  const jenkinsJobName = repositoryName.split('/')[1];
  
  console.log(`👀 Monitoring Jenkins build for: ${jenkinsJobName}`);

  // 4.2: Polling loop
  const maxAttempts = 120; // 20 minutes max (120 * 10 seconds)
  let attempts = 0;

  const pollInterval = setInterval(async () => {
    attempts++;
    
    try {
      // 4.3: Get last build info
      const buildInfo = await jenkinsService.getLastBuildInfo(jenkinsJobName);
      
      if (!buildInfo.success) {
        console.error('❌ Failed to get build info');
        return;
      }

      const build = buildInfo.data;
      const buildNumber = build.number;
      const buildResult = build.result; // null, 'SUCCESS', 'FAILURE'
      const isBuilding = build.building;

      console.log(`📊 Build #${buildNumber}: ${buildResult || 'BUILDING'}`);

      // 4.4: Update Monday.com with progress
      const columnValues = {
        [MONDAY_COLUMNS.JENKINS_STATUS]: {
          label: isBuilding ? STATUS.JENKINS.BUILDING : 
                 buildResult === 'SUCCESS' ? STATUS.JENKINS.SUCCESS :
                 buildResult === 'FAILURE' ? STATUS.JENKINS.FAILED :
                 STATUS.JENKINS.NOT_STARTED
        },
        [MONDAY_COLUMNS.BUILD_NUMBER]: buildNumber.toString(),
        [MONDAY_COLUMNS.BUILD_URL]: build.url
      };

      await mondayService.updatePipelineItem(
        featureName,
        columnValues,
        '',
        featureName
      );

      // 4.5: Check if build completed
      if (buildResult !== null) {
        clearInterval(pollInterval);
        
        if (buildResult === 'SUCCESS') {
          console.log('✅ Jenkins build SUCCESS');
        } else {
          console.log('❌ Jenkins build FAILED');
        }
      }

      // 4.6: Stop if max attempts reached
      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        console.log('⏱️ Monitoring timeout reached');
      }

    } catch (error) {
      console.error('❌ Error monitoring build:', error);
    }

  }, 10000); // Poll every 10 seconds
}

// RESULT: Jenkins builds, deploys to Docker, Monday.com tracks entire process ✅
```

---

### **Flow 3: Jenkins Notifies Docker Deployment**

```javascript
// STEP 1: Jenkins completes Docker deployment
// Jenkinsfile executes:
// curl -X POST http://integration-server:5000/api/docker/deploy-notification
//   -d '{"containerName": "sample-test-container", "buildNumber": "58", ...}'

// STEP 2: routes/docker.js receives notification
router.post('/deploy-notification', dockerController.handleDeploymentNotification);

// STEP 3: controllers/dockerController.js processes notification
async handleDeploymentNotification(req, res) {
  const {
    containerName,
    featureName,
    branchName,
    buildNumber,
    imageTag,
    repositoryName
  } = req.body;

  console.log(`🐳 Docker deployment notification received`);
  console.log(`📦 Container: ${containerName}`);
  console.log(`📋 Repository: ${repositoryName}`);

  // 3.1: Find actual container by repository name
  let actualContainerName = containerName;
  
  if (repositoryName) {
    const foundContainer = await dockerService.findContainerByRepoName(
      repositoryName
    );
    
    if (foundContainer) {
      actualContainerName = foundContainer;
      console.log(`✅ Using found container: ${actualContainerName}`);
    }
  }

  // 3.2: Get full container information
  const containerInfo = await dockerService.getFullContainerInfo(
    actualContainerName,
    repositoryName
  );

  if (!containerInfo.success) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve container information'
    });
  }

  console.log('📊 Container Info:', containerInfo.data);
  
  // containerInfo.data structure:
  // {
  //   status: "Running",
  //   containerId: "0bb8f1139951",
  //   imageVersion: "sample-test:58",
  //   ports: "0.0.0.0:3000->3000/tcp",
  //   health: "healthy",
  //   resourceUsage: "CPU: 2.5% | Memory: 56.97MB",
  //   deploymentTimestamp: "2025-11-20 13:25:05"
  // }

  // 3.3: Build Monday.com column values
  const columnValues = mondayService.buildColumnValues('docker_deployed', {
    dockerStatus: containerInfo.data.status,
    containerId: containerInfo.data.containerId,
    imageVersion: imageTag || containerInfo.data.imageVersion,
    ports: containerInfo.data.ports,
    health: containerInfo.data.health,
    resourceUsage: containerInfo.data.resourceUsage,
    deploymentTimestamp: containerInfo.data.deploymentTimestamp
  });

  // Add build number
  if (buildNumber) {
    columnValues[MONDAY_COLUMNS.BUILD_NUMBER] = buildNumber.toString();
  }

  // 3.4: Update Monday.com
  const itemName = branchName || featureName || containerName;
  const mondayResult = await mondayService.updatePipelineItem(
    itemName,
    columnValues,
    '',
    branchName
  );

  // 3.5: Return success response
  return res.status(200).json({
    success: true,
    message: 'Docker deployment tracked successfully',
    containerInfo: containerInfo.data,
    mondayUpdate: mondayResult.success
  });
}

// STEP 4: services/dockerService.js collects container metrics
async getFullContainerInfo(containerName, repositoryName) {
  try {
    // 4.1: Get container status
    const statusResult = await this.getContainerStatus(containerName);
    
    // 4.2: Get container ID
    const idResult = await this.getContainerId(containerName);
    
    // 4.3: Get image version
    const imageResult = await this.getImageVersion(containerName);
    
    // 4.4: Get exposed ports
    const portsResult = await this.getExposedPorts(containerName);
    
    // 4.5: Get health status
    const healthResult = await this.getHealthStatus(containerName);
    
    // 4.6: Get resource usage
    const resourceResult = await this.getResourceUsage(containerName);

    // 4.7: Combine all information
    return {
      success: true,
      data: {
        status: statusResult.status,
        containerId: idResult.containerId,
        imageVersion: imageResult.imageVersion,
        ports: portsResult.ports,
        health: healthResult.health,
        resourceUsage: resourceResult.resourceUsage,
        deploymentTimestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// STEP 5: Individual Docker CLI commands
async getContainerStatus(containerName) {
  // Executes: docker inspect --format="{{.State.Status}}" containerName
  const { stdout } = await execPromise(
    `docker inspect --format="{{.State.Status}}" ${containerName}`
  );
  
  return {
    success: true,
    status: this.mapDockerStatusToMonday(stdout.trim())
  };
}

async getResourceUsage(containerName) {
  // Executes: docker stats --no-stream containerName
  const { stdout } = await execPromise(
    `docker stats --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}" ${containerName}`
  );
  
  const [cpu, mem] = stdout.trim().split('|');
  
  return {
    success: true,
    resourceUsage: `CPU: ${cpu} | Memory: ${mem}`
  };
}

// RESULT: Monday.com updated with all 7 Docker columns ✅
```

---

## 📡 API Endpoints Reference

### **Webhook Endpoints**

#### **POST /api/webhooks/github**
Receive GitHub webhook events

**Request:**
```javascript
Headers:
  x-github-event: push | pull_request | pull_request_review
  x-hub-signature-256: sha256=...
  content-type: application/json

Body: (GitHub webhook payload)
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "eventType": "push",
  "featureName": "feature-xyz"
}
```

#### **GET /api/webhooks/test**
Test webhook endpoint availability

**Response:**
```json
{
  "success": true,
  "message": "Webhook endpoint is working"
}
```

#### **POST /api/webhooks/simulate/github**
Simulate GitHub webhook for testing

**Request:**
```json
{
  "eventType": "push",
  "payload": {
    "ref": "refs/heads/test-branch",
    "repository": {
      "full_name": "user/repo"
    }
  }
}
```

---

### **Docker Endpoints**

#### **POST /api/docker/deploy-notification**
Notify successful Docker deployment (called by Jenkins)

**Request:**
```json
{
  "containerName": "sample-test-container",
  "featureName": "feature-xyz",
  "branchName": "main",
  "buildNumber": "58",
  "imageTag": "58",
  "repositoryName": "Sample-test"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Docker deployment tracked successfully",
  "containerInfo": {
    "status": "Running",
    "containerId": "0bb8f1139951",
    "imageVersion": "sample-test:58",
    "ports": "0.0.0.0:3000->3000/tcp",
    "health": "healthy",
    "resourceUsage": "CPU: 2.5% | Memory: 56.97MB"
  },
  "mondayUpdate": true
}
```

#### **POST /api/docker/deploy-failure**
Notify Docker deployment failure

**Request:**
```json
{
  "featureName": "feature-xyz",
  "branchName": "main",
  "errorMessage": "Container failed to start",
  "buildNumber": "58"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Docker failure tracked in Monday.com"
}
```

#### **GET /api/docker/containers**
List all Docker containers

**Response:**
```json
{
  "success": true,
  "containers": [
    {
      "id": "0bb8f1139951",
      "name": "sample-test-container",
      "image": "sample-test:58",
      "status": "running",
      "ports": "0.0.0.0:3000->3000/tcp"
    }
  ]
}
```

#### **GET /api/docker/status/:containerName**
Get specific container status

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "Running",
    "containerId": "0bb8f1139951",
    "imageVersion": "sample-test:58",
    "ports": "0.0.0.0:3000->3000/tcp",
    "health": "healthy",
    "resourceUsage": "CPU: 2.5% | Memory: 56.97MB"
  }
}
```

#### **POST /api/docker/update-monday**
Update Monday.com with current Docker status

**Request:**
```json
{
  "containerName": "sample-test-container",
  "featureName": "feature-xyz",
  "branchName": "main"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Monday.com updated with Docker status"
}
```

#### **POST /api/docker/start/:containerName**
Start a Docker container

**Response:**
```json
{
  "success": true,
  "message": "Container started successfully"
}
```

#### **POST /api/docker/stop/:containerName**
Stop a Docker container

#### **POST /api/docker/restart/:containerName**
Restart a Docker container

#### **GET /api/docker/logs/:containerName?lines=100**
Get container logs

**Response:**
```json
{
  "success": true,
  "logs": "..container logs..."
}
```

---

### **Jenkins Endpoints**

#### **GET /api/jenkins/status**
Get Jenkins server status

**Response:**
```json
{
  "success": true,
  "jenkinsVersion": "2.387.1",
  "mode": "NORMAL",
  "numExecutors": 2
}
```

#### **GET /api/jenkins/build/:buildNumber**
Get specific build information

**Response:**
```json
{
  "success": true,
  "build": {
    "number": 58,
    "result": "SUCCESS",
    "building": false,
    "duration": 125000,
    "url": "http://jenkins:8080/job/Sample-test/58"
  }
}
```

#### **GET /api/jenkins/build/last**
Get last build information

#### **POST /api/jenkins/build/trigger**
Manually trigger Jenkins build

**Request:**
```json
{
  "featureName": "manual-build",
  "branch": "main",
  "commitId": "abc123de"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Build triggered successfully",
  "queueUrl": "http://jenkins:8080/queue/item/123"
}
```

---

### **Monday.com Endpoints**

#### **GET /api/monday/boards**
Get all Monday.com boards

**Response:**
```json
{
  "success": true,
  "boards": [
    {
      "id": "5024820979",
      "name": "DevOps Pipeline Tracking"
    }
  ]
}
```

#### **GET /api/monday/items**
Get all items from board

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "5033108307",
      "name": "feature-xyz",
      "column_values": [...]
    }
  ]
}
```

#### **POST /api/monday/items**
Create new Monday.com item

**Request:**
```json
{
  "itemName": "feature-xyz",
  "columnValues": {
    "color_mkxt1jnm": { "label": "In Progress" }
  }
}
```

#### **PUT /api/monday/items/status**
Update item status

**Request:**
```json
{
  "featureName": "feature-xyz",
  "status": "Success",
  "columnId": "color_mkxtrhcq"
}
```

---

## 🔧 Service Layer Logic

### **githubService.js - GitHub API Wrapper**

```javascript
class GitHubService {
  // Parse webhook payload into structured data
  parseWebhookPayload(payload) {
    const { action, pull_request, repository, sender, ref, commits, head_commit } = payload;
    
    let eventType = 'unknown';
    let featureName = '';
    let branch = ref ? ref.replace('refs/heads/', '') : '';
    let sourceBranch = '';
    let targetBranch = '';
    
    // Handle Pull Request events
    if (pull_request) {
      eventType = 'pull_request';
      sourceBranch = pull_request.head?.ref || '';
      targetBranch = pull_request.base?.ref || '';
      branch = sourceBranch;
      featureName = sourceBranch;
      
      // Check if PR was merged
      if (action === 'closed' && pull_request.merged) {
        isMerge = true;
        reviewer = pull_request.merged_by?.login;
      }
    }
    // Handle Push events
    else if (head_commit) {
      eventType = 'push';
      featureName = branch;
      
      // Check if merge commit
      if (head_commit.message.includes('Merge pull request')) {
        isMerge = true;
        // Extract source branch from merge message
        const branchMatch = head_commit.message.match(/from [^/]+\/(.+)/);
        if (branchMatch) {
          sourceBranch = branchMatch[1].trim();
          featureName = sourceBranch;
        }
      }
    }
    
    return {
      eventType,
      featureName,
      branch,
      sourceBranch,
      targetBranch,
      developer,
      commitMessage,
      commitId,
      repository: repository?.full_name,
      repositoryUrl: repository?.html_url,
      isMerge,
      prUrl,
      reviewer
    };
  }
}
```

### **mondayService.js - Monday.com GraphQL API**

```javascript
class MondayService {
  // Build column values based on event stage
  buildColumnValues(stage, data) {
    const values = {};
    
    switch(stage) {
      case 'github_push':
        values[MONDAY_COLUMNS.GITHUB_STATUS] = { label: STATUS.GITHUB.IN_PROGRESS };
        values[MONDAY_COLUMNS.DEVELOPER] = data.developer;
        values[MONDAY_COLUMNS.COMMIT_MESSAGE] = data.commitMessage;
        values[MONDAY_COLUMNS.REPO_NAME] = data.repoName;
        values[MONDAY_COLUMNS.REPO_URL] = data.repoUrl;
        break;
        
      case 'github_pr':
        values[MONDAY_COLUMNS.GITHUB_STATUS] = { label: STATUS.GITHUB.IN_REVIEW };
        values[MONDAY_COLUMNS.PR_URL] = data.prUrl;
        values[MONDAY_COLUMNS.PR_STATUS] = { label: 'Open' };
        break;
        
      case 'jenkins_started':
        values[MONDAY_COLUMNS.JENKINS_STATUS] = { label: STATUS.JENKINS.BUILDING };
        values[MONDAY_COLUMNS.BUILD_NUMBER] = data.buildNumber;
        break;
        
      case 'jenkins_success':
        values[MONDAY_COLUMNS.JENKINS_STATUS] = { label: STATUS.JENKINS.SUCCESS };
        values[MONDAY_COLUMNS.BUILD_URL] = data.buildUrl;
        break;
        
      case 'docker_deployed':
        values[MONDAY_COLUMNS.DOCKER_STATUS] = { label: STATUS.DOCKER.RUNNING };
        values[MONDAY_COLUMNS.CONTAINER_ID] = data.containerId;
        values[MONDAY_COLUMNS.DOCKER_IMAGE_VERSION] = data.imageVersion;
        values[MONDAY_COLUMNS.EXPOSED_PORTS] = data.ports;
        values[MONDAY_COLUMNS.HEALTH_STATUS] = data.health;
        values[MONDAY_COLUMNS.RESOURCE_USAGE] = data.resourceUsage;
        values[MONDAY_COLUMNS.DEPLOYMENT_TIMESTAMP] = data.deploymentTimestamp;
        break;
    }
    
    // Always update last updated date
    values[MONDAY_COLUMNS.LAST_UPDATED] = {
      date: new Date().toISOString().split('T')[0]
    };
    
    return values;
  }

  // Create new item in Monday.com
  async createItem(featureName, columnValues) {
    const query = `
      mutation {
        create_item (
          board_id: ${this.getBoardId()},
          item_name: "${featureName}",
          column_values: "${JSON.stringify(columnValues).replace(/"/g, '\\"')}",
          create_labels_if_missing: true
        ) {
          id
          name
        }
      }
    `;
    
    const response = await this.api.post('', { query });
    return { success: true, data: response.data };
  }

  // Update existing item
  async updateItem(itemId, columnValues) {
    const query = `
      mutation {
        change_multiple_column_values (
          item_id: ${itemId},
          board_id: ${this.getBoardId()},
          column_values: "${JSON.stringify(columnValues).replace(/"/g, '\\"')}",
          create_labels_if_missing: true
        ) {
          id
        }
      }
    `;
    
    const response = await this.api.post('', { query });
    return { success: true, data: response.data };
  }
}
```

### **dockerService.js - Docker CLI Wrapper**

```javascript
class DockerService {
  // Get container status
  async getContainerStatus(containerName) {
    const { stdout } = await execPromise(
      `docker inspect --format="{{.State.Status}}" ${containerName}`
    );
    
    return {
      success: true,
      status: stdout.trim()
    };
  }

  // Get resource usage
  async getResourceUsage(containerName) {
    const { stdout } = await execPromise(
      `docker stats --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}" ${containerName}`
    );
    
    const [cpu, mem] = stdout.trim().split('|');
    return {
      success: true,
      resourceUsage: `CPU: ${cpu} | Memory: ${mem}`
    };
  }

  // Find container by repository name
  async findContainerByRepoName(repoName) {
    try {
      // Search for container with repo name in labels or name
      const { stdout } = await execPromise(
        `docker ps --filter "name=${repoName}" --format "{{.Names}}"`
      );
      
      const containers = stdout.trim().split('\n').filter(Boolean);
      return containers[0] || null;
    } catch (error) {
      return null;
    }
  }
}
```

---

## 📊 Data Models & Structures

### **Webhook Data Structure**

```typescript
interface WebhookData {
  eventType: 'push' | 'pull_request' | 'pull_request_review';
  featureName: string;          // e.g., "feature-xyz" or "PR-8"
  branch: string;               // Source branch
  sourceBranch: string;         // Feature branch
  targetBranch: string;         // Target branch (main)
  developer: string;            // GitHub username
  reviewer?: string;            // PR reviewer username
  commitMessage: string;
  commitId: string;            // Short commit hash
  repository: string;          // "owner/repo-name"
  repositoryUrl: string;       // Full GitHub URL
  prUrl?: string;              // PR URL if applicable
  isMerge: boolean;            // Is this a merge commit?
}
```

### **Monday.com Column Values**

```typescript
interface MondayColumnValues {
  // Status columns (use label format)
  [statusColumnId: string]: {
    label: string;  // e.g., "In Progress", "Success"
  };
  
  // Text columns (use string directly)
  [textColumnId: string]: string;
  
  // Date columns (use date format)
  [dateColumnId: string]: {
    date: string;  // ISO format: "2025-11-20"
  };
}
```

### **Container Info Structure**

```typescript
interface ContainerInfo {
  status: 'Running' | 'Stopped' | 'Exited';
  containerId: string;         // Short ID (12 chars)
  imageVersion: string;        // e.g., "sample-test:58"
  ports: string;               // e.g., "0.0.0.0:3000->3000/tcp"
  health: 'healthy' | 'unhealthy' | 'none';
  resourceUsage: string;       // e.g., "CPU: 2.5% | Memory: 56MB"
  deploymentTimestamp: string; // ISO timestamp
}
```

---

## 🎯 Integration Workflows

### **Workflow: Complete PR to Production**

```
1. Developer creates PR
   ├─ POST /api/webhooks/github (event: pull_request, action: opened)
   ├─ Create/update Monday item
   └─ Set GitHub Status: "In Review"

2. Reviewer approves PR
   ├─ POST /api/webhooks/github (event: pull_request_review)
   ├─ Update Monday item
   └─ Set PR Status: "Approved"

3. PR merged to main
   ├─ POST /api/webhooks/github (event: pull_request, action: closed, merged: true)
   ├─ Update Monday: "Merged"
   ├─ Preserve PR URL (CRITICAL FIX)
   └─ Trigger Jenkins build

4. Jenkins builds
   ├─ Monitor: GET /api/jenkins/build/last (polling)
   ├─ Update Monday: "Building" → "Testing" → "Building Docker"
   └─ Build completes

5. Jenkins deploys Docker
   ├─ Container deployed
   ├─ Jenkins calls: POST /api/docker/deploy-notification
   └─ Collect container metrics

6. Update Monday with Docker info
   ├─ All Docker columns filled
   ├─ Jenkins Status: "Success"
   └─ Pipeline complete ✅
```

---

## ❌ Error Handling

### **Error Handling Strategy**

```javascript
// Controller level - catch and return HTTP errors
async handleWebhook(req, res) {
  try {
    // Process webhook
    await this.processWebhook(req.body);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Service level - return structured error objects
async updatePipelineItem(itemName, columnValues) {
  try {
    const result = await this.mondayApi.mutate();
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Monday.com update error:', error);
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}
```

### **Retry Logic for Jenkins Monitoring**

```javascript
async monitorWithRetry(jenkinsJobName, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const result = await jenkinsService.getLastBuildInfo(jenkinsJobName);
      
      if (result.success) {
        return result;
      }
      
      attempt++;
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      attempt++;
    }
  }
  
  return { success: false, error: 'Max retries reached' };
}
```

---

## 💡 Code Examples

### **Example 1: Testing GitHub Webhook Locally**

```javascript
const axios = require('axios');

async function testWebhook() {
  const payload = {
    ref: 'refs/heads/test-branch',
    repository: {
      full_name: 'aniket-upstreamtech03/Sample-test',
      html_url: 'https://github.com/aniket-upstreamtech03/Sample-test'
    },
    head_commit: {
      id: 'abc123def456',
      message: 'Test commit for integration',
      author: {
        username: 'aniket-upstreamtech03'
      }
    }
  };

  try {
    const response = await axios.post(
      'http://localhost:5000/api/webhooks/simulate/github',
      {
        eventType: 'push',
        payload: payload
      }
    );
    
    console.log('✅ Webhook test successful:', response.data);
  } catch (error) {
    console.error('❌ Webhook test failed:', error.response?.data || error.message);
  }
}

testWebhook();
```

### **Example 2: Manually Trigger Jenkins Build**

```javascript
const axios = require('axios');

async function triggerBuild() {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/jenkins/build/trigger',
      {
        featureName: 'manual-test-build',
        branch: 'main',
        commitId: 'manual123'
      }
    );
    
    console.log('✅ Build triggered:', response.data);
  } catch (error) {
    console.error('❌ Build trigger failed:', error.response?.data);
  }
}

triggerBuild();
```

### **Example 3: Get Docker Container Status**

```javascript
const axios = require('axios');

async function getContainerStatus() {
  try {
    const response = await axios.get(
      'http://localhost:5000/api/docker/status/sample-test-container'
    );
    
    console.log('📊 Container Status:', response.data.data);
    // {
    //   status: "Running",
    //   containerId: "0bb8f1139951",
    //   health: "healthy",
    //   resourceUsage: "CPU: 2.5% | Memory: 56.97MB"
    // }
  } catch (error) {
    console.error('❌ Status check failed:', error.response?.data);
  }
}

getContainerStatus();
```

### **Example 4: Custom Monday.com Update**

```javascript
const axios = require('axios');

async function updateMondayCustom() {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/monday/items',
      {
        itemName: 'custom-feature',
        columnValues: {
          'color_mkxt1jnm': { label: 'In Progress' },
          'text_mkxtt4m': 'custom-developer',
          'text_mkxtbdvy': 'Custom update via API'
        }
      }
    );
    
    console.log('✅ Monday.com updated:', response.data);
  } catch (error) {
    console.error('❌ Update failed:', error.response?.data);
  }
}

updateMondayCustom();
```

---

## 🔍 Debugging Tips

### **Enable Debug Logging**

Add to your code:

```javascript
// In services/mondayService.js
async updatePipelineItem(itemName, columnValues) {
  console.log('🔍 DEBUG: Updating item:', itemName);
  console.log('🔍 DEBUG: Column values:', JSON.stringify(columnValues, null, 2));
  
  const result = await this.mondayApi.mutate();
  
  console.log('🔍 DEBUG: Monday API response:', JSON.stringify(result, null, 2));
  
  return result;
}
```

### **Check Webhook Delivery**

In GitHub:
1. Go to Settings → Webhooks
2. Click your webhook
3. Click "Recent Deliveries"
4. Check Request/Response details

### **Monitor Jenkins Build Logs**

```bash
# View Jenkins logs in real-time
tail -f /var/log/jenkins/jenkins.log

# Or via API
curl http://localhost:8080/job/Sample-test/lastBuild/consoleText
```

### **Check Docker Container Logs**

```bash
# View Integration Server logs
docker logs -f integration-server

# View specific container logs
docker logs -f sample-test-container

# Check last 100 lines
docker logs --tail 100 sample-test-container
```

---

**Documentation Version:** 1.0  
**Last Updated:** November 20, 2025  
**API Version:** v1  
**For Developers:** Advanced Technical Reference
