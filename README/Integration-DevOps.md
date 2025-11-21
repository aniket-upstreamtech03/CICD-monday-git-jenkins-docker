# 🔄 Integration DevOps - Complete CI/CD Pipeline Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Low-Level Workflow](#low-level-workflow)
4. [Component Integration](#component-integration)
5. [Complete Flow Diagrams](#complete-flow-diagrams)
6. [DevOps Pipeline Stages](#devops-pipeline-stages)

---

## 🎯 Overview

This integration system creates a **fully automated CI/CD pipeline** that connects four major platforms:
- **GitHub** - Source code management and webhook events
- **Jenkins** - Continuous Integration and Deployment automation
- **Docker** - Containerized application deployment
- **Monday.com** - Project tracking and status monitoring

### **Business Value**
✅ **Real-time visibility** of entire development lifecycle  
✅ **Automated tracking** from code commit to production deployment  
✅ **Centralized dashboard** for project management in Monday.com  
✅ **Zero-manual intervention** for status updates  
✅ **Complete audit trail** of all changes and deployments  

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │   Git Push   │  │  Pull Request│  │   PR Review  │
         │  to Branch   │  │   Created    │  │   Approved   │
         └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                │                 │                  │
                └─────────────────┼──────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────────────────┐
         │          GITHUB (Source of Truth)                  │
         │  • Webhooks send events to Integration Server      │
         │  • Repository contains application code            │
         │  • Branch tracking and PR management               │
         └────────────────────┬───────────────────────────────┘
                              │ Webhook POST
                              │
                              ▼
         ┌────────────────────────────────────────────────────┐
         │      INTEGRATION SERVER (Express.js - Port 5000)   │
         │                                                    │
         │  ┌──────────────┐  ┌──────────────┐              │
         │  │   GitHub     │→ │   Monday     │              │
         │  │  Controller  │  │   Service    │              │
         │  └──────────────┘  └──────┬───────┘              │
         │                           │                        │
         │  ┌──────────────┐  ┌──────┴───────┐              │
         │  │   Jenkins    │← │    Docker    │              │
         │  │   Service    │  │   Service    │              │
         │  └──────────────┘  └──────────────┘              │
         └────┬──────────────────────────┬───────────────────┘
              │                          │
    ┌─────────┴────────┐      ┌─────────┴──────────┐
    ▼                  ▼      ▼                    ▼
┌─────────┐      ┌─────────┐ ┌──────────┐   ┌──────────────┐
│ Jenkins │      │ Docker  │ │ Docker   │   │ Monday.com   │
│ Server  │      │ Engine  │ │Container │   │    Board     │
│         │      │         │ │ Running  │   │              │
└─────────┘      └─────────┘ └──────────┘   └──────────────┘
```

---

## 🔄 High-Level Integration Flow

### **Stage 1: Developer Action**
```
Developer → Creates Feature Branch → Pushes Code → Creates Pull Request
```

### **Stage 2: GitHub Event Processing**
```
GitHub Webhook → Integration Server → Parse Event → Extract Data
```

### **Stage 3: Monday.com Tracking Starts**
```
Create/Update Item → Set GitHub Status → Add Developer Info → Track Commit
```

### **Stage 4: Code Review & Approval**
```
Reviewers → Approve PR → Merge to Main → Trigger Production Pipeline
```

### **Stage 5: Jenkins CI/CD Pipeline**
```
Jenkins Triggered → Checkout Code → Run Tests → Build Image → Deploy Container
```

### **Stage 6: Docker Deployment**
```
Docker Build → Container Deploy → Health Check → Get Container Metrics
```

### **Stage 7: Final Monday.com Update**
```
Update Docker Status → Add Container Info → Set Deployment Time → Complete
```

---

## 🔍 Low-Level Workflow

### **1️⃣ GitHub Push Event Flow**

```
┌───────────────────────────────────────────────────────────────────┐
│ STEP 1: Developer Pushes Code                                    │
└───────────────────────────────────────────────────────────────────┘
                            │
                            │ git push origin feature-xyz
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 2: GitHub Webhook Triggered                                 │
│                                                                   │
│ POST https://your-server.com/api/webhooks/github                │
│ Headers:                                                          │
│   X-GitHub-Event: push                                           │
│   X-Hub-Signature-256: sha256=...                                │
│ Body:                                                             │
│   {                                                               │
│     "ref": "refs/heads/feature-xyz",                             │
│     "repository": {                                               │
│       "full_name": "aniket-upstreamtech03/Sample-test",         │
│       "html_url": "https://github.com/..."                       │
│     },                                                            │
│     "head_commit": {                                              │
│       "id": "b265e73f233bb5756e48eaae6af4541993fa4f99",         │
│       "message": "Add new feature implementation",               │
│       "author": {                                                 │
│         "username": "aniket-upstreamtech03"                      │
│       }                                                           │
│     }                                                             │
│   }                                                               │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 3: Integration Server Receives Webhook                      │
│ File: routes/webhooks.js → POST /api/webhooks/github            │
│                                                                   │
│ • Validate webhook signature                                     │
│ • Extract event type from X-GitHub-Event header                  │
│ • Forward to githubController.handleWebhook()                    │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 4: Parse Webhook Data                                       │
│ File: services/githubService.js → parseWebhookPayload()         │
│                                                                   │
│ Extracted Data:                                                   │
│   eventType: "push"                                              │
│   featureName: "feature-xyz"                                     │
│   branch: "feature-xyz"                                          │
│   developer: "aniket-upstreamtech03"                            │
│   commitMessage: "Add new feature implementation"                │
│   commitId: "b265e73f"                                           │
│   repository: "aniket-upstreamtech03/Sample-test"               │
│   repositoryUrl: "https://github.com/..."                        │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 5: Build Monday.com Column Values                           │
│ File: controllers/githubController.js                            │
│                                                                   │
│ Column Values Created:                                            │
│   {                                                               │
│     GITHUB_STATUS: { label: "In Progress" },                    │
│     DEVELOPER: "aniket-upstreamtech03",                         │
│     COMMIT_MESSAGE: "Add new feature implementation",            │
│     LAST_UPDATED: { date: "2025-11-20" },                       │
│     BUILD_STATUS: { label: "Pending" },                         │
│     REPO_NAME: "Sample-test",                                    │
│     REPO_URL: "https://github.com/...",                          │
│     JENKINS_JOB_NAME: "Sample-test"                              │
│   }                                                               │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 6: Update Monday.com                                        │
│ File: services/mondayService.js → updatePipelineItem()          │
│                                                                   │
│ 1. Search for existing item by branch name "feature-xyz"         │
│ 2. If not found → Create new item with branch name              │
│ 3. If found → Update existing item                               │
│ 4. Use GraphQL mutation to update all columns                    │
│ 5. Return success/failure result                                 │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 7: Monday.com Item Created/Updated                          │
│                                                                   │
│ Board Item:                                                       │
│   Name: "feature-xyz"                                            │
│   GitHub Status: In Progress (Yellow)                            │
│   Developer: aniket-upstreamtech03                               │
│   Commit Message: Add new feature implementation                 │
│   Last Updated: 2025-11-20                                       │
│   Build Status: Pending                                          │
│   Jenkins Status: Not Started                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

### **2️⃣ Pull Request Workflow**

```
┌───────────────────────────────────────────────────────────────────┐
│ Pull Request Created                                              │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
    GitHub Webhook → POST /api/webhooks/github
    Event: pull_request, Action: opened
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Parse PR Data                                                     │
│   - PR Number: #8                                                 │
│   - Source Branch: feature-xyz                                    │
│   - Target Branch: main                                           │
│   - PR URL: https://github.com/.../pull/8                        │
│   - Title: "Add new feature"                                      │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Update Monday.com                                                 │
│   - Find item "feature-xyz"                                       │
│   - Update GitHub Status → "In Review"                           │
│   - Add PR URL                                                    │
│   - Update PR Status → "Open"                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

### **3️⃣ PR Review & Approval Workflow**

```
┌───────────────────────────────────────────────────────────────────┐
│ Reviewer Approves PR                                              │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
    GitHub Webhook → POST /api/webhooks/github
    Event: pull_request_review, Action: submitted
    Review State: approved
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Update Monday.com                                                 │
│   - PR Status → "Approved"                                       │
│   - Reviewer: reviewer-username                                   │
│   - Review Comments added                                         │
└───────────────────────────────────────────────────────────────────┘
```

---

### **4️⃣ PR Merge & Jenkins Trigger Workflow**

```
┌───────────────────────────────────────────────────────────────────┐
│ PR Merged to Main Branch                                          │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
    GitHub Webhook → POST /api/webhooks/github
    Event: pull_request, Action: closed, merged: true
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 1: Update Monday.com - PR Merged                            │
│   - GitHub Status → "Merged"                                     │
│   - PR Status → "Merged"                                         │
│   - Preserve PR URL (CRITICAL FIX)                               │
│   - Add merged_by information                                     │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 2: Trigger Jenkins Build                                    │
│ File: controllers/githubController.js → triggerJenkinsBuild()   │
│                                                                   │
│ Extract repository name: "Sample-test"                            │
│ Jenkins Job Name: "Sample-test" (dynamic matching)               │
│                                                                   │
│ POST http://jenkins:8080/job/Sample-test/buildWithParameters    │
│ Parameters:                                                       │
│   BRANCH_NAME: main                                              │
│   COMMIT_ID: b265e73f                                            │
│   COMMIT_MESSAGE: "Merged: Add new feature"                      │
│   FEATURE_NAME: feature-xyz                                      │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 3: Start Jenkins Build Monitoring                           │
│ File: controllers/githubController.js → monitorJenkinsBuild()   │
│                                                                   │
│ Polling Loop (every 10 seconds):                                 │
│   1. GET /job/Sample-test/lastBuild/api/json                    │
│   2. Check build.result (SUCCESS/FAILURE/null)                   │
│   3. Update Monday.com with progress                             │
│   4. Continue until build completes                              │
└───────────────────────────────────────────────────────────────────┘
```

---

### **5️⃣ Jenkins CI/CD Pipeline Execution**

```
┌───────────────────────────────────────────────────────────────────┐
│ Jenkins Pipeline Stages                                           │
└───────────────────────────────────────────────────────────────────┘

STAGE 1: Checkout Code
├─ Clone repository from GitHub
├─ Checkout main branch
└─ Integration Server updates Monday: "Jenkins - Checkout"

STAGE 2: Install Dependencies & Test
├─ npm install
├─ npm test
└─ Integration Server updates Monday: "Jenkins - Testing"

STAGE 3: Build Application
├─ npm run build
└─ Integration Server updates Monday: "Jenkins - Building"

STAGE 4: Cleanup Old Docker Resources
├─ docker stop old-container (if exists)
├─ docker rm old-container
└─ docker rmi old-image

STAGE 5: Build Docker Image
├─ docker build -t sample-test:${BUILD_NUMBER}
└─ Integration Server updates Monday: "Jenkins - Building Docker"

STAGE 6: Deploy Docker Container
├─ docker run -d --name sample-test-container
│  -p 3000:3000
│  --restart=always
│  sample-test:${BUILD_NUMBER}
└─ Integration Server updates Monday: "Jenkins - Deploying"

STAGE 7: Health Check
├─ Wait for container to be healthy
├─ Verify HTTP endpoint responds
├─ Check container status
└─ Integration Server updates Monday: "Jenkins - Health Check"

STAGE 8: Get Container Information
├─ docker inspect sample-test-container
├─ docker port sample-test-container
├─ docker stats sample-test-container (CPU/Memory)
└─ Prepare data for Monday.com

STAGE 9: Notify Integration Server
├─ POST http://integration-server:5000/api/docker/deploy-notification
├─ Send container details:
│  {
│    containerName: "sample-test-container",
│    featureName: "feature-xyz",
│    branchName: "main",
│    buildNumber: "58",
│    imageTag: "58",
│    repositoryName: "Sample-test"
│  }
└─ Integration Server processes Docker deployment
```

---

### **6️⃣ Docker Deployment & Monday.com Update**

```
┌───────────────────────────────────────────────────────────────────┐
│ Integration Server Receives Docker Notification                   │
│ File: controllers/dockerController.js                            │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 1: Get Full Container Information                           │
│ File: services/dockerService.js → getFullContainerInfo()        │
│                                                                   │
│ Execute Docker Commands:                                          │
│   docker inspect sample-test-container                            │
│     → Container ID: 0bb8f1139951                                 │
│     → Status: running                                             │
│     → Image: sample-test:58                                       │
│                                                                   │
│   docker port sample-test-container                              │
│     → Ports: 0.0.0.0:3000->3000/tcp                              │
│                                                                   │
│   docker stats sample-test-container --no-stream                 │
│     → CPU: 2.5%                                                   │
│     → Memory: 56.97MB / 7.76GB                                    │
│                                                                   │
│   Health Check                                                    │
│     → Status: healthy                                             │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 2: Format Docker Data for Monday.com                        │
│                                                                   │
│ Column Values:                                                    │
│   {                                                               │
│     DOCKER_STATUS: { label: "Running" },                         │
│     CONTAINER_ID: "0bb8f1139951",                                │
│     DOCKER_IMAGE_VERSION: "sample-test:58",                      │
│     EXPOSED_PORTS: "0.0.0.0:3000->3000/tcp",                     │
│     HEALTH_STATUS: "healthy",                                     │
│     RESOURCE_USAGE: "CPU: 2.5% | Memory: 56.97MB",              │
│     DEPLOYMENT_TIMESTAMP: "2025-11-20 13:25:05",                 │
│     BUILD_NUMBER: "58",                                           │
│     JENKINS_STATUS: { label: "Success" }                         │
│   }                                                               │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ STEP 3: Update Monday.com with Docker Info                       │
│ File: services/mondayService.js                                  │
│                                                                   │
│ GraphQL Mutation:                                                 │
│   mutation {                                                      │
│     change_multiple_column_values(                                │
│       item_id: 5033108307,                                        │
│       board_id: 5024820979,                                       │
│       column_values: "{...all Docker columns...}"                │
│     ) {                                                           │
│       id                                                          │
│     }                                                             │
│   }                                                               │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ FINAL: Monday.com Board Updated ✅                                │
│                                                                   │
│ Item: "feature-xyz"                                               │
│   ├─ GitHub Status: Merged ✅                                    │
│   ├─ PR Status: Merged ✅                                        │
│   ├─ PR URL: https://github.com/.../pull/8 (PRESERVED)          │
│   ├─ Jenkins Status: Success ✅                                  │
│   ├─ Build Number: 58                                             │
│   ├─ Build URL: http://jenkins:8080/job/Sample-test/58          │
│   ├─ Docker Status: Running ✅                                   │
│   ├─ Container ID: 0bb8f1139951                                  │
│   ├─ Image Version: sample-test:58                               │
│   ├─ Exposed Ports: 3000:3000                                    │
│   ├─ Health: healthy                                              │
│   ├─ Resources: CPU: 2.5% | Memory: 56.97MB                      │
│   └─ Deployed: 2025-11-20 13:25:05                               │
│                                                                   │
│ 🎉 Complete Pipeline Tracked!                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Component Integration Details

### **GitHub ↔ Integration Server**
- **Connection Method:** Webhooks (HTTP POST)
- **Events Tracked:** push, pull_request, pull_request_review
- **Authentication:** Webhook secret signature validation
- **Data Flow:** JSON payload containing commit/PR information

### **Integration Server ↔ Jenkins**
- **Connection Method:** Jenkins REST API
- **Authentication:** Basic Auth (username + API token)
- **Trigger Method:** POST to buildWithParameters endpoint
- **Monitoring:** Polling lastBuild/api/json every 10 seconds

### **Integration Server ↔ Docker**
- **Connection Method:** Docker CLI commands via exec
- **Commands Used:**
  - `docker inspect` - Get container details
  - `docker port` - Get port mappings
  - `docker stats` - Get resource usage
  - `docker start/stop/restart` - Container control
- **Data Processing:** Parse CLI output to structured JSON

### **Integration Server ↔ Monday.com**
- **Connection Method:** Monday.com GraphQL API v2
- **Authentication:** API token in Authorization header
- **Operations:**
  - `create_item` - Create new board items
  - `change_multiple_column_values` - Update columns
  - Query items by name for finding existing items

---

## 📊 DevOps Pipeline Stages Summary

```
┌──────────────────────────────────────────────────────────────┐
│                 Complete DevOps Pipeline                     │
└──────────────────────────────────────────────────────────────┘

1. Development Phase
   ├─ Developer creates feature branch
   ├─ Writes code and commits
   └─ Monday.com: GitHub Status = "In Progress"

2. Code Review Phase
   ├─ Creates Pull Request
   ├─ Reviewers review and approve
   └─ Monday.com: GitHub Status = "In Review" → "Approved"

3. Merge Phase
   ├─ PR merged to main branch
   ├─ Triggers production pipeline
   └─ Monday.com: GitHub Status = "Merged"

4. Build Phase (Jenkins)
   ├─ Checkout code
   ├─ Install dependencies
   ├─ Run tests
   ├─ Build application
   └─ Monday.com: Jenkins Status = "Building" → "Testing"

5. Containerization Phase (Docker)
   ├─ Build Docker image with version tag
   ├─ Tag image with build number
   └─ Monday.com: Build Status = "Building Docker Image"

6. Deployment Phase (Docker)
   ├─ Stop old container
   ├─ Deploy new container
   ├─ Run health checks
   └─ Monday.com: Docker Status = "Deploying" → "Running"

7. Verification Phase
   ├─ Health endpoint check
   ├─ Container metrics collection
   ├─ Port mapping verification
   └─ Monday.com: All Docker columns filled

8. Completion Phase
   ├─ Final status update
   ├─ All columns updated in Monday.com
   └─ Pipeline marked as SUCCESS
```

---

## 🔐 Security & Best Practices

### **Webhook Security**
- ✅ GitHub webhook signature validation using HMAC-SHA256
- ✅ Secret token stored in environment variables
- ✅ HTTPS enforced for production webhooks

### **Jenkins Security**
- ✅ API token authentication (no passwords in code)
- ✅ RBAC (Role-Based Access Control) on Jenkins
- ✅ Credentials stored in Jenkins credential manager

### **Docker Security**
- ✅ Non-root user in containers
- ✅ Read-only file systems where possible
- ✅ Resource limits (CPU/Memory) enforced
- ✅ Health checks configured

### **Monday.com Security**
- ✅ API token with minimal required permissions
- ✅ Board-level access control
- ✅ No sensitive data in column values

---

## 🎓 For New Developers

This documentation provides:
1. **High-level overview** - Understand the big picture
2. **Low-level workflows** - See exact execution paths
3. **Component diagrams** - Visualize system architecture
4. **Step-by-step flows** - Follow data through the system

**Next Steps:**
1. Read [Developer-Guide.md](./Developer-Guide.md) for setup instructions
2. Review [Visual-Flow-Diagrams.md](./Visual-Flow-Diagrams.md) for more diagrams
3. Check [Jenkins-GitHub-Docker-Configuration.md](./Jenkins-GitHub-Docker-Configuration.md) for configuration
4. Study [Developer-Logic-API-Docs.md](./Developer-Logic-API-Docs.md) for API details

---

**Documentation Version:** 1.0  
**Last Updated:** November 20, 2025  
**Maintained By:** Integration Team
