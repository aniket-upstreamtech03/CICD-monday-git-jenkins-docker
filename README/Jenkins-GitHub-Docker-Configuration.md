# ⚙️ Jenkins × GitHub × Docker Configuration Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites & Requirements](#prerequisites--requirements)
3. [GitHub Configuration](#github-configuration)
4. [Jenkins Configuration](#jenkins-configuration)
5. [Docker Configuration](#docker-configuration)
6. [Integration Server Configuration](#integration-server-configuration)
7. [Monday.com Configuration](#mondaycom-configuration)
8. [Complete Configuration Flow](#complete-configuration-flow)
9. [Troubleshooting Configuration Issues](#troubleshooting-configuration-issues)

---

## 🎯 Overview

This document provides **complete configuration details** for setting up the integration between:
- **GitHub** (source control)
- **Jenkins** (CI/CD automation)
- **Docker** (containerization)
- **Integration Server** (orchestration layer)
- **Monday.com** (project tracking)

### **Architecture Components**

```
GitHub ──(webhooks)──▶ Integration Server ──(REST API)──▶ Jenkins
   │                         │                              │
   │                         │                              │
   └─────────────────────────┴──(GraphQL)──▶ Monday.com    │
                             │                              │
                             └───(Docker CLI)──▶ Docker ◀──┘
```

---

## ✅ Prerequisites & Requirements

### **Software Requirements**

| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18.x+ | Run Integration Server |
| **npm** | 9.x+ | Package management |
| **Jenkins** | 2.x+ | CI/CD automation |
| **Docker** | 20.x+ | Container runtime |
| **Docker Compose** | 2.x+ | Multi-container apps |
| **Git** | 2.x+ | Version control |

### **Account Requirements**

1. **GitHub Account** with repository access
2. **Monday.com Account** with board admin access
3. **Jenkins** server (local or remote)
4. **Docker Hub Account** (optional, for registry)

### **Network Requirements**

- Jenkins must be able to reach GitHub
- Integration Server must be accessible from GitHub (via webhook)
- Jenkins must be able to reach Integration Server
- Integration Server must reach Monday.com API
- Docker must be available on Jenkins server

---

## 🐙 GitHub Configuration

### **Step 1: Repository Setup**

1. **Create or open your repository**
   ```
   Repository: Sample-test
   Owner: aniket-upstreamtech03
   URL: https://github.com/aniket-upstreamtech03/Sample-test
   ```

2. **Ensure proper branching strategy**
   ```
   main (production branch)
     ├─ feature/new-login
     ├─ feature/api-integration
     └─ bugfix/header-issue
   ```

### **Step 2: Configure Webhooks**

1. Navigate to **Repository Settings → Webhooks**

2. Click **"Add webhook"**

3. Configure webhook settings:

```yaml
Payload URL: https://your-server.com/api/webhooks/github
# For local development with LocalTunnel:
# https://upstream-mondaysession-98223080.loca.lt/api/webhooks/github

Content type: application/json

Secret: your-webhook-secret-key-123
# This must match GITHUB_WEBHOOK_SECRET in .env

SSL verification: Enable SSL verification (recommended for production)

Which events would you like to trigger this webhook?
☑ Let me select individual events:
  ☑ Pushes
  ☑ Pull requests
  ☑ Pull request reviews
  ☐ Issues (optional)
  ☐ Issue comments (optional)

Active: ☑ (checkbox checked)
```

4. Click **"Add webhook"**

5. **Verify webhook is working:**
   - Make a test commit
   - Go to Settings → Webhooks → Your webhook
   - Check "Recent Deliveries" tab
   - Should show successful 200 responses

### **Step 3: Create GitHub Personal Access Token** (Optional but Recommended)

Used for GitHub API calls (getting PR details, commit info, etc.)

1. Go to **Settings → Developer settings → Personal access tokens → Tokens (classic)**

2. Click **"Generate new token (classic)"**

3. Configure token:
   ```
   Note: Integration Server Token
   
   Scopes:
   ☑ repo (Full control of private repositories)
     ☑ repo:status
     ☑ repo_deployment
     ☑ public_repo
   ☑ workflow (Update GitHub Action workflows)
   ```

4. Click **"Generate token"**

5. **Copy token immediately** and save to `.env`:
   ```env
   GITHUB_ACCESS_TOKEN=ghp_your_token_here_abc123def456
   ```

### **Step 4: Branch Protection Rules** (Recommended)

Protect your main branch:

1. Go to **Settings → Branches**
2. Add rule for `main` branch:
   ```
   ☑ Require pull request reviews before merging
     • Required approvals: 1
   ☑ Require status checks to pass before merging
     • Require branches to be up to date
   ☐ Require signed commits (optional)
   ☑ Include administrators
   ```

---

## 🔧 Jenkins Configuration

### **Step 1: Install Jenkins**

**Windows:**
```bash
# Download Jenkins MSI installer from jenkins.io
# Run installer and follow wizard
# Jenkins will be available at http://localhost:8080
```

**Linux:**
```bash
# Debian/Ubuntu
wget -q -O - https://pkg.jenkins.io/debian/jenkins.io.key | sudo apt-key add -
sudo sh -c 'echo deb http://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
sudo apt update
sudo apt install jenkins

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins
```

**Mac:**
```bash
brew install jenkins-lts
brew services start jenkins-lts
```

### **Step 2: Initial Jenkins Setup**

1. **Access Jenkins:** `http://localhost:8080`

2. **Unlock Jenkins:**
   - Get initial password: 
     ```bash
     # Windows
     type "C:\Program Files\Jenkins\secrets\initialAdminPassword"
     
     # Linux/Mac
     cat /var/lib/jenkins/secrets/initialAdminPassword
     ```

3. **Install suggested plugins**

4. **Create admin user**

### **Step 3: Install Required Jenkins Plugins**

Navigate to **Manage Jenkins → Manage Plugins → Available**

Install these plugins:
- ☑ **Git Plugin** - Git integration
- ☑ **GitHub Plugin** - GitHub integration
- ☑ **Pipeline** - Pipeline support
- ☑ **Docker Pipeline** - Docker commands in pipeline
- ☑ **Blue Ocean** (optional) - Better UI
- ☑ **Workspace Cleanup** - Clean workspace
- ☑ **HTTP Request** - Make API calls

Click **"Install without restart"**

### **Step 4: Configure Jenkins System**

1. Go to **Manage Jenkins → Configure System**

2. **GitHub Configuration:**
   ```
   GitHub Servers:
     Name: github.com
     API URL: https://api.github.com
     Credentials: Add GitHub Personal Access Token
   ```

3. **Add GitHub Credentials:**
   - Click **"Add" → Jenkins**
   - Kind: Secret text
   - Secret: (your GitHub PAT)
   - ID: github-token
   - Description: GitHub Personal Access Token

### **Step 5: Create Jenkins Job**

**IMPORTANT:** Job name MUST match repository name exactly!

1. Click **"New Item"**

2. **Job Configuration:**
   ```
   Name: Sample-test
   Type: Pipeline
   ```

3. Click **"OK"**

### **Step 6: Configure Jenkins Job**

**General Section:**
```yaml
Description: Sample Test API - CI/CD Pipeline

GitHub project: ☑
  Project url: https://github.com/aniket-upstreamtech03/Sample-test
```

**Build Triggers:**
```yaml
☑ GitHub hook trigger for GITScm polling
  (This allows GitHub webhooks to trigger builds)

☐ Poll SCM (not needed if webhook works)
```

**Pipeline Section:**
```yaml
Definition: Pipeline script from SCM

SCM: Git

Repositories:
  Repository URL: https://github.com/aniket-upstreamtech03/Sample-test.git
  Credentials: (Select your GitHub credentials)
  
Branches to build:
  Branch Specifier: */main
  (Or use */master depending on your default branch)

Script Path: Jenkinsfile
  (Path to Jenkinsfile in repository root)

Lightweight checkout: ☑
```

**Save the configuration**

### **Step 7: Add Jenkins API Token**

1. Click your username (top right)
2. Click **"Configure"**
3. Scroll to **"API Token"** section
4. Click **"Add new Token"**
   ```
   Name: Integration Server Token
   ```
5. Click **"Generate"**
6. **Copy token immediately** and save to `.env`:
   ```env
   JENKINS_USERNAME=your-jenkins-username
   JENKINS_API_TOKEN=11abc123def456...
   ```

### **Step 8: Configure Jenkins Environment Variables**

In your Jenkins job, go to **Configure → Pipeline**:

```groovy
// At the top of your Jenkinsfile
environment {
    INTEGRATION_SERVER_URL = 'http://localhost:5000'
    DOCKER_CONTAINER_NAME = 'sample-test-container'
    APP_PORT = '3000'
}
```

### **Step 9: Install Docker on Jenkins Server**

Jenkins needs Docker to build and deploy containers:

**Linux:**
```bash
# Install Docker
sudo apt update
sudo apt install docker.io

# Add Jenkins user to docker group
sudo usermod -aG docker jenkins

# Restart Jenkins
sudo systemctl restart jenkins
```

**Windows:** Install Docker Desktop

**Verify:**
```bash
# Run as jenkins user
sudo -u jenkins docker ps
```

---

## 🐳 Docker Configuration

### **Step 1: Dockerfile Setup**

Create `Dockerfile` in repository root:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy application files
COPY . .

# Final stage
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /app .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "server.js"]
```

### **Step 2: Docker Compose Configuration**

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  integration-server:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: integration-server
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - integration-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  integration-network:
    driver: bridge
```

### **Step 3: Docker Ignore File**

Create `.dockerignore`:

```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
.vscode
.idea
*.md
.DS_Store
coverage
.nyc_output
test
tests
*.test.js
*.spec.js
```

### **Step 4: Docker Registry Configuration** (Optional)

If using private registry:

```bash
# Login to Docker Hub
docker login

# Or login to private registry
docker login your-registry.com -u username -p password

# In Jenkinsfile, push to registry:
docker push your-registry.com/integration-server:${BUILD_NUMBER}
```

---

## 🖥️ Integration Server Configuration

### **Step 1: Environment Variables**

Create `.env` file in project root:

```env
# ============================================
# APPLICATION CONFIGURATION
# ============================================
NODE_ENV=development
PORT=5000

# ============================================
# JENKINS CONFIGURATION
# ============================================
JENKINS_URL=http://localhost:8080
JENKINS_USERNAME=admin
JENKINS_API_TOKEN=11abc123def456ghi789jkl0mno1pqr2stu3vwx4yz5
JENKINS_JOB_NAME=Sample-Test-API

# ============================================
# MONDAY.COM CONFIGURATION
# ============================================
MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjM2...
MONDAY_BOARD_ID=5024820979

# ============================================
# GITHUB CONFIGURATION
# ============================================
GITHUB_WEBHOOK_SECRET=my-super-secret-webhook-key-123
GITHUB_ACCESS_TOKEN=ghp_your_github_personal_access_token

# ============================================
# DOCKER CONFIGURATION
# ============================================
DOCKER_CONTAINER_NAME=integration-server
INTEGRATION_SERVER_URL=http://localhost:5000
```

### **Step 2: Constants Configuration**

Update `config/constants.js` with your Monday.com column IDs:

```javascript
const MONDAY_COLUMNS = {
  // Item name (not a column, but used for identification)
  FEATURE_NAME: 'name',
  
  // Core tracking columns
  GITHUB_STATUS: 'color_mkxt1jnm',      // Status column
  JENKINS_STATUS: 'color_mkxtrhcq',     // Status column
  PR_URL: 'text_mkxthvpn',              // Text column
  BUILD_URL: 'text_mkxt8btk',           // Text column
  DEVELOPER: 'text_mkxtt4m',            // Text column
  LAST_UPDATED: 'text_mkxtag7b',        // Date column
  COMMIT_MESSAGE: 'text_mkxtbdvy',      // Text column
  BUILD_NUMBER: 'text_mkxwwngn',        // Text column
  
  // Docker deployment columns
  DOCKER_STATUS: 'color_mkxwnrwk',      // Status column
  CONTAINER_ID: 'text_mkxw8jf6',        // Text column
  DOCKER_IMAGE_VERSION: 'text_mkxwjwx7', // Text column
  EXPOSED_PORTS: 'text_mkxw4nkd',       // Text column
  HEALTH_STATUS: 'text_mkxwtatd',       // Text column
  RESOURCE_USAGE: 'text_mkxwhj7v',      // Text column
  DEPLOYMENT_TIMESTAMP: 'text_mkxwpw82', // Text column
  
  // Repository tracking columns
  REPO_NAME: 'text_mkxvrvpf',           // Text column
  REPO_URL: 'text_mkxvh80n',            // Text column
  JENKINS_JOB_NAME: 'text_mkxvbrz7',    // Text column
  
  // PR tracking columns
  PR_STATUS: 'color_mkxvwj0f',          // Status column
  REVIEW_STATUS: 'text_mkxwnuyr'        // Text column
};

module.exports = {
  MONDAY_COLUMNS,
  // ... other constants
};
```

**How to get Column IDs:**
1. Open Monday.com board
2. Click any column header → "Column settings"
3. Look at browser URL
4. Extract `columnId` parameter
5. Example: `columnId=text_mkxt8btk` → use `text_mkxt8btk`

---

## 📊 Monday.com Configuration

### **Step 1: Create Monday.com Board**

1. Create new board: **"DevOps Pipeline Tracking"**

2. Get Board ID from URL:
   ```
   https://yourcompany.monday.com/boards/5024820979
                                          ^^^^^^^^^^
                                          Board ID
   ```

### **Step 2: Add Required Columns**

| Column Name | Column Type | Values/Options |
|------------|-------------|----------------|
| **Feature Name** | Text | (Item name) |
| **GitHub Status** | Status | In Progress, In Review, Approved, Merged |
| **Jenkins Status** | Status | Not Started, Building, Testing, Success, Failed |
| **PR Status** | Status | Open, Approved, Merged, Closed |
| **Docker Status** | Status | Not Deployed, Deploying, Running, Stopped, Failed |
| **Build Status** | Status | Pending, Building, Success, Failed |
| **PR URL** | Text | Link to PR |
| **Build URL** | Text | Link to Jenkins build |
| **Developer** | Text | Username |
| **Last Updated** | Date | Auto-updated date |
| **Commit Message** | Long Text | Commit description |
| **Build Number** | Text | Jenkins build # |
| **Container ID** | Text | Docker container ID |
| **Docker Image Version** | Text | Image tag |
| **Exposed Ports** | Text | Port mappings |
| **Health Status** | Text | Container health |
| **Resource Usage** | Text | CPU/Memory |
| **Deployment Timestamp** | Text | Deploy time |
| **Repo Name** | Text | Repository name |
| **Repo URL** | Text | Repository URL |
| **Jenkins Job Name** | Text | Jenkins job |
| **Review Status** | Text | Review comments |

### **Step 3: Get Monday.com API Key**

1. Click your profile picture (bottom left)
2. Click **"Developers"**
3. Click **"My Access Tokens"** tab
4. Copy your API v2 token
5. Save to `.env`:
   ```env
   MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...
   ```

### **Step 4: Configure Status Column Labels**

For each Status column, ensure these labels exist:

**GitHub Status:**
- In Progress (Yellow/Orange)
- In Review (Blue)
- Approved (Green)
- Merged (Green)

**Jenkins Status:**
- Not Started (White)
- Building (Yellow)
- Testing (Blue)
- Success (Green)
- Failed (Red)

**Docker Status:**
- Not Deployed (White)
- Deploying (Yellow)
- Running (Green)
- Stopped (Gray)
- Failed (Red)

---

## 🔄 Complete Configuration Flow

### **How It All Works Together**

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. Developer pushes code to GitHub                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. GitHub sends webhook to Integration Server                   │
│    URL: https://server.com/api/webhooks/github                  │
│    Secret: Validated using GITHUB_WEBHOOK_SECRET                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Integration Server creates/updates Monday.com item           │
│    Using: MONDAY_API_KEY, MONDAY_BOARD_ID                       │
│    Item name: Branch name (e.g., "feature-new-login")           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. On PR merge, Integration Server triggers Jenkins             │
│    POST: JENKINS_URL/job/Sample-test/buildWithParameters       │
│    Auth: JENKINS_USERNAME + JENKINS_API_TOKEN                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Jenkins runs pipeline (tests, build, Docker)                 │
│    Reads Jenkinsfile from repository                             │
│    Uses Docker commands to build & deploy                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Jenkins notifies Integration Server after deployment         │
│    POST: INTEGRATION_SERVER_URL/api/docker/deploy-notification │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. Integration Server collects Docker metrics                   │
│    Uses Docker CLI: docker inspect, docker stats                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. Integration Server updates Monday.com with Docker info       │
│    All Docker columns filled with container metrics             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting Configuration Issues

### **Issue: GitHub Webhook Returns 403/401**

**Cause:** Invalid webhook secret

**Solution:**
1. Verify `.env` has correct `GITHUB_WEBHOOK_SECRET`
2. Ensure webhook secret in GitHub matches exactly
3. Check Integration Server logs for validation errors
4. Restart Integration Server after changing `.env`

### **Issue: Jenkins Build Not Triggering**

**Causes:**
- GitHub webhook not reaching Jenkins
- Jenkins job not configured for webhook trigger
- Job name doesn't match repository name

**Solution:**
1. Verify webhook is active in GitHub
2. Check Jenkins job has "GitHub hook trigger" enabled
3. Ensure Jenkins job name matches repo name exactly:
   ```
   Repository: Sample-test
   Jenkins Job: Sample-test  ✅ (exact match)
   ```
4. Test webhook manually:
   ```bash
   curl -X POST http://jenkins:8080/github-webhook/
   ```

### **Issue: Monday.com "Unauthorized" Error**

**Cause:** Invalid or expired API key

**Solution:**
1. Get fresh API key from Monday.com
2. Update `.env` file:
   ```env
   MONDAY_API_KEY=your_new_api_key_here
   ```
3. Restart Integration Server
4. Test connection:
   ```bash
   curl http://localhost:5000/api/monday/boards
   ```

### **Issue: Docker Commands Fail in Jenkins**

**Cause:** Jenkins user doesn't have Docker permissions

**Solution:**
```bash
# Add jenkins user to docker group
sudo usermod -aG docker jenkins

# Restart Jenkins
sudo systemctl restart jenkins

# Verify
sudo -u jenkins docker ps
```

### **Issue: Container Not Found**

**Cause:** Container name mismatch between Jenkins and Docker Service

**Solution:**
1. Check Jenkins environment variable:
   ```groovy
   CONTAINER_NAME = "sample-test-container"
   ```
2. Check Docker Service is using same name
3. Use repository-based naming for consistency:
   ```javascript
   // In dockerService.js
   const containerName = `${repoName}-container`;
   ```

### **Issue: Monday.com Columns Not Updating**

**Cause:** Incorrect column IDs in `config/constants.js`

**Solution:**
1. Go to Monday.com board
2. Click column → Column settings
3. Check URL for actual `columnId`
4. Update `config/constants.js`:
   ```javascript
   DOCKER_STATUS: 'color_mkxwnrwk',  // ← Your actual column ID
   ```
5. Restart server

---

## 📝 Configuration Checklist

Use this checklist to verify your setup:

### **GitHub** ✓
- [ ] Repository created
- [ ] Webhook added with correct URL
- [ ] Webhook secret matches `.env`
- [ ] Events selected: push, pull_request, pull_request_review
- [ ] Webhook shows green checkmarks in Recent Deliveries

### **Jenkins** ✓
- [ ] Jenkins installed and running
- [ ] Required plugins installed
- [ ] Job created with exact repo name
- [ ] GitHub webhook trigger enabled
- [ ] Jenkinsfile exists in repository
- [ ] API token generated and saved
- [ ] Docker available to Jenkins user

### **Docker** ✓
- [ ] Docker installed on Jenkins server
- [ ] Dockerfile exists in repository
- [ ] Docker Compose files created
- [ ] `.dockerignore` configured
- [ ] Jenkins user in docker group

### **Integration Server** ✓
- [ ] `.env` file created with all variables
- [ ] Column IDs match Monday.com board
- [ ] Server running on correct port
- [ ] Health check endpoint works
- [ ] Can reach Jenkins API
- [ ] Can reach Monday.com API

### **Monday.com** ✓
- [ ] Board created
- [ ] All required columns added
- [ ] Column IDs extracted and saved
- [ ] Status labels configured
- [ ] API key generated and saved

---

**Configuration Complete!** 🎉

All components should now be configured and ready to use. Test the complete flow by:
1. Pushing code to GitHub
2. Checking Monday.com for item creation
3. Merging a PR
4. Verifying Jenkins build triggers
5. Confirming Docker deployment
6. Seeing all columns update in Monday.com

---

**Documentation Version:** 1.0  
**Last Updated:** November 20, 2025  
**Configuration Complexity:** Advanced
