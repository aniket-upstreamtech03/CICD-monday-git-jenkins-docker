# 👨‍💻 Developer Guide - First Time Setup

## 📋 Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [Testing the Integration](#testing-the-integration)
7. [Troubleshooting](#troubleshooting)
8. [Common Use Cases](#common-use-cases)

---

## 🎯 Introduction

Welcome! This guide will help you set up the **GitHub-Jenkins-Docker-Monday.com Integration Server** from scratch. Even if you're new to some of these technologies, this guide will walk you through everything step by step.

### **What This System Does**
This integration automatically tracks your entire development workflow:
- When you push code to GitHub → It creates/updates a Monday.com item
- When you create a Pull Request → It tracks the review process
- When PR is merged → It triggers Jenkins to build and deploy
- When Docker container deploys → It updates Monday.com with deployment status

**Think of it as:** An automated project manager that watches your code and keeps everyone updated!

---

## ✅ Prerequisites

Before starting, make sure you have these installed:

### **Required Software**

| Software | Minimum Version | Purpose | Download Link |
|----------|----------------|---------|---------------|
| **Node.js** | 18.x or higher | Run the integration server | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x or higher | Install packages | Comes with Node.js |
| **Git** | 2.x or higher | Clone the repository | [git-scm.com](https://git-scm.com/) |
| **Docker** | 20.x or higher | Run containers | [docker.com](https://www.docker.com/) |
| **Jenkins** | 2.x or higher | CI/CD automation | [jenkins.io](https://www.jenkins.io/) |

### **Required Accounts**

1. **GitHub Account** - Free tier is fine
2. **Monday.com Account** - Free trial works
3. **Jenkins Server** - Can run locally or on a server

### **Check Your Setup**

Run these commands to verify everything is installed:

```bash
# Check Node.js version (should show 18.x or higher)
node --version

# Check npm version (should show 9.x or higher)
npm --version

# Check Git version (should show 2.x or higher)
git --version

# Check Docker version (should show 20.x or higher)
docker --version

# Check if Docker is running
docker ps
```

If any command fails, install the missing software from the links above.

---

## 🚀 Installation Steps

### **Step 1: Clone the Repository**

Open your terminal (Command Prompt, PowerShell, or Terminal) and run:

```bash
# Navigate to where you want to store the project
cd C:\Your\Projects\Folder

# Clone the repository
git clone https://github.com/aniket-upstreamtech03/integration-server.git

# Go into the project folder
cd integration-server

# You should see all project files now
dir   # Windows
ls    # Mac/Linux
```

### **Step 2: Install Dependencies**

This will download all the required packages:

```bash
# Install all Node.js packages
npm install

# Wait for installation to complete (might take 2-3 minutes)
# You should see "added XXX packages" when done
```

**What just happened?** npm read the `package.json` file and installed all required libraries like Express, Axios, etc.

### **Step 3: Create Environment Configuration**

Create a file named `.env` in the root folder:

```bash
# Create the file
touch .env    # Mac/Linux
type nul > .env    # Windows
```

Now open `.env` file in any text editor and add this content:

```env
# ============================================
# APPLICATION CONFIGURATION
# ============================================
NODE_ENV=development
PORT=5000

# ============================================
# JENKINS CONFIGURATION
# ============================================
# Your Jenkins server URL (use localhost if running locally)
JENKINS_URL=http://localhost:8080

# Your Jenkins username
JENKINS_USERNAME=your-jenkins-username

# Jenkins API Token (NOT your password!)
# Get it from: Jenkins → User → Configure → API Token → Add new Token
JENKINS_API_TOKEN=your-jenkins-api-token

# Jenkins job name (default job, can be overridden dynamically)
JENKINS_JOB_NAME=Sample-Test-API

# ============================================
# MONDAY.COM CONFIGURATION
# ============================================
# Monday.com API Key
# Get it from: Monday.com → Profile Picture → Developers → API
MONDAY_API_KEY=your-monday-api-key

# Your Monday.com Board ID
# Get it from: Open your board → Look at URL
# Example URL: https://yourcompany.monday.com/boards/5024820979
# Board ID is: 5024820979
MONDAY_BOARD_ID=your-board-id

# ============================================
# GITHUB CONFIGURATION
# ============================================
# GitHub Webhook Secret (you'll set this when creating webhook)
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# GitHub Personal Access Token (optional, for GitHub API calls)
GITHUB_ACCESS_TOKEN=your-github-token

# ============================================
# DOCKER CONFIGURATION
# ============================================
# Default Docker container name
DOCKER_CONTAINER_NAME=integration-server

# Integration server URL (for Jenkins to call back)
INTEGRATION_SERVER_URL=http://localhost:5000
```

**Don't worry!** We'll get all these values in the next section.

---

## ⚙️ Configuration

### **Part 1: Get Jenkins API Token**

1. Open Jenkins in your browser: `http://localhost:8080`
2. Click on your username (top right)
3. Click **"Configure"**
4. Scroll down to **"API Token"** section
5. Click **"Add new Token"**
6. Give it a name like "integration-server"
7. Click **"Generate"**
8. **IMPORTANT:** Copy the token immediately and paste it in your `.env` file
9. Update `.env`:
   ```env
   JENKINS_USERNAME=your-actual-username
   JENKINS_API_TOKEN=11a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5
   ```

### **Part 2: Get Monday.com API Key**

1. Log in to Monday.com
2. Click your profile picture (bottom left)
3. Click **"Developers"**
4. Click **"My Access Tokens"** tab
5. Click **"Show"** next to "API v2 Token"
6. Copy the token
7. Update `.env`:
   ```env
   MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...your-token-here
   ```

### **Part 3: Get Monday.com Board ID**

1. Open your Monday.com board in browser
2. Look at the URL: `https://yourcompany.monday.com/boards/5024820979`
3. The number after `/boards/` is your Board ID
4. Update `.env`:
   ```env
   MONDAY_BOARD_ID=5024820979
   ```

### **Part 4: Setup GitHub Webhook**

1. Go to your GitHub repository
2. Click **"Settings"** tab
3. Click **"Webhooks"** in left sidebar
4. Click **"Add webhook"**
5. Fill in:
   - **Payload URL:** `http://localhost:5000/api/webhooks/github`
     - **Note:** For testing locally, you'll need a tunnel (explained below)
   - **Content type:** `application/json`
   - **Secret:** Create a random string (e.g., `my-super-secret-key-123`)
   - **Which events:** Select "Let me select individual events"
     - ☑ Pushes
     - ☑ Pull requests
     - ☑ Pull request reviews
6. Click **"Add webhook"**
7. Update `.env`:
   ```env
   GITHUB_WEBHOOK_SECRET=my-super-secret-key-123
   ```

### **Part 5: Setup Monday.com Columns**

Your Monday.com board needs these columns. Go to your board and add them:

| Column Name | Column Type | Purpose |
|------------|-------------|---------|
| Name | Text | Item name (already exists) |
| GitHub Status | Status | Tracks GitHub activity |
| Jenkins Status | Status | Tracks build status |
| PR URL | Text | Link to Pull Request |
| Build URL | Text | Link to Jenkins build |
| Developer | Text | Who wrote the code |
| Last Updated | Date | Last update time |
| Commit Message | Text | Commit description |
| Build Number | Text | Jenkins build number |
| **Docker Status** | Status | Container status |
| **Container ID** | Text | Docker container ID |
| **Docker Image Version** | Text | Image tag |
| **Exposed Ports** | Text | Port mappings |
| **Health Status** | Text | Container health |
| **Resource Usage** | Text | CPU/Memory usage |
| **Deployment Timestamp** | Text | When deployed |
| **Repo Name** | Text | Repository name |
| **Repo URL** | Text | Repository URL |
| **Jenkins Job Name** | Text | Jenkins job name |

**After creating columns:**
1. Click any column header → **"Column settings"**
2. Look at the URL, you'll see something like: `pulseId=...&columnId=text_abc123`
3. The `columnId` is important - you'll need to update `config/constants.js` with actual IDs

---

## 🏃 Running the Application

### **Method 1: Run Locally (Development)**

```bash
# Start the server
npm run dev

# You should see:
# 🚀 Integration Server running on port 5000
# 📊 Health check: http://localhost:5000/health
# 🔗 Ready to receive GitHub webhooks
```

**Test it's working:**
Open browser and go to: `http://localhost:5000/health`

You should see:
```json
{
  "status": "OK",
  "service": "GitHub-Jenkins-Monday Integration Server",
  "timestamp": "2025-11-20T13:25:05.000Z"
}
```

### **Method 2: Run with Docker**

```bash
# Build the Docker image
docker build -t integration-server .

# Run the container
docker run -d \
  --name integration-server \
  -p 5000:5000 \
  --env-file .env \
  integration-server

# Check if it's running
docker ps

# View logs
docker logs integration-server
```

### **Method 3: Run with Docker Compose**

```bash
# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up

# Production mode
docker-compose -f docker-compose.prod.yml up -d
```

### **Expose Local Server to Internet (for GitHub Webhooks)**

Since GitHub can't reach `localhost`, we need a tunnel:

**Option A: Using LocalTunnel (Already Integrated)**

The server automatically creates a tunnel when you run it:

```bash
npm run dev

# You'll see:
# 🌐 LocalTunnel URL: https://upstream-mondaysession-98223080.loca.lt
# Use this URL in GitHub webhook!
```

Copy this URL and update your GitHub webhook Payload URL to:
`https://upstream-mondaysession-98223080.loca.lt/api/webhooks/github`

**Option B: Using ngrok**

```bash
# Install ngrok (if not installed)
# Download from: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 5000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update GitHub webhook to: https://abc123.ngrok.io/api/webhooks/github
```

---

## 🧪 Testing the Integration

### **Test 1: Health Check**

```bash
# Test if server is running
curl http://localhost:5000/health

# Expected response:
# {"status":"OK","service":"GitHub-Jenkins-Monday Integration Server"}
```

### **Test 2: Monday.com Connection**

```bash
# Get boards
curl http://localhost:5000/api/monday/boards

# Expected: List of your Monday boards
```

### **Test 3: Jenkins Connection**

```bash
# Get Jenkins status
curl http://localhost:5000/api/jenkins/status

# Expected: Jenkins server information
```

### **Test 4: Simulate GitHub Webhook**

Create a file `test-webhook.json`:

```json
{
  "ref": "refs/heads/test-branch",
  "repository": {
    "full_name": "your-username/your-repo",
    "html_url": "https://github.com/your-username/your-repo"
  },
  "head_commit": {
    "id": "abc123def456",
    "message": "Test commit",
    "author": {
      "username": "your-username"
    }
  }
}
```

Send it to your server:

```bash
# Send test webhook
curl -X POST http://localhost:5000/api/webhooks/simulate/github \
  -H "Content-Type: application/json" \
  -d @test-webhook.json

# Check Monday.com - you should see a new item created!
```

### **Test 5: Complete Flow Test**

1. **Make a real commit:**
   ```bash
   git checkout -b test-feature
   echo "Test" > test.txt
   git add test.txt
   git commit -m "Test integration"
   git push origin test-feature
   ```

2. **Check Monday.com:**
   - New item should appear with name "test-feature"
   - GitHub Status should be "In Progress"
   - Developer should be your username

3. **Create a Pull Request on GitHub**
   - Go to your repository on GitHub
   - Click "Compare & pull request"
   - Create the PR

4. **Check Monday.com again:**
   - Same item should update
   - GitHub Status → "In Review"
   - PR URL should be filled

5. **Merge the PR:**
   - Approve and merge the PR on GitHub

6. **Check Monday.com final:**
   - GitHub Status → "Merged"
   - Jenkins Status → "Building" → "Success"
   - Docker columns should fill with deployment info

---

## 🐛 Troubleshooting

### **Problem: "Cannot GET /"**

**Solution:** Server is running but you're accessing wrong URL. Try:
- `http://localhost:5000/health` ✅
- `http://localhost:5000/` shows available endpoints

### **Problem: "ECONNREFUSED" to Jenkins**

**Causes:**
1. Jenkins not running
2. Wrong Jenkins URL in `.env`
3. Jenkins firewall blocking connection

**Solution:**
```bash
# Check if Jenkins is accessible
curl http://localhost:8080

# If not, start Jenkins
# Windows: Start Jenkins service
# Linux: sudo systemctl start jenkins
```

### **Problem: Monday.com "Unauthorized"**

**Causes:**
1. Wrong API key
2. API key expired
3. Missing API key in `.env`

**Solution:**
1. Get new API key from Monday.com
2. Update `.env` file
3. Restart the server

### **Problem: GitHub webhook not working**

**Causes:**
1. LocalTunnel/ngrok not running
2. Wrong webhook URL
3. Wrong webhook secret

**Solution:**
1. Make sure tunnel is running
2. Update GitHub webhook URL with tunnel URL
3. Verify webhook secret matches `.env`

### **Problem: "Module not found"**

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Or on Windows
rmdir /s node_modules
npm install
```

### **Problem: Port 5000 already in use**

**Solution:**
```bash
# Change port in .env file
PORT=5001

# Or kill process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <process-id> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

---

## 💡 Common Use Cases

### **Use Case 1: Track Feature Development**

**Scenario:** You're developing a new feature

**Steps:**
1. Create feature branch: `git checkout -b feature-new-login`
2. Make commits and push
3. Monday.com automatically tracks progress
4. Create PR when ready
5. After merge, Jenkins builds and deploys automatically

### **Use Case 2: Monitor Multiple Repositories**

**Scenario:** You have multiple projects to track

**Steps:**
1. Add webhook to each repository
2. Create Jenkins job with same name as each repository
3. All projects appear in same Monday.com board
4. Each tracked separately

### **Use Case 3: Manual Jenkins Trigger**

**Scenario:** Need to rebuild without new commits

**Steps:**
```bash
# Trigger Jenkins build manually
curl -X POST http://localhost:5000/api/jenkins/build/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "featureName": "manual-build",
    "branch": "main"
  }'
```

### **Use Case 4: Check Docker Container Status**

**Scenario:** Want to see if deployment is healthy

**Steps:**
```bash
# Check container status
curl http://localhost:5000/api/docker/status/your-container-name

# Response includes:
# - Container status (running/stopped)
# - Health check status
# - CPU/Memory usage
# - Port mappings
```

---

## 📚 Next Steps

Now that you have the system running:

1. **Read the API documentation:** Check `Developer-Logic-API-Docs.md` for API details
2. **Understand the workflows:** Read `Integration-DevOps.md` for complete flows
3. **Configure Jenkins:** Read `Jenkins-GitHub-Docker-Configuration.md` for Jenkins setup
4. **Customize:** Modify `config/constants.js` to match your Monday.com columns

---

## 🆘 Getting Help

- **Check logs:** The server prints detailed logs in the terminal
- **Monday.com API:** [Monday.com API docs](https://developer.monday.com/api-reference)
- **Jenkins API:** [Jenkins REST API docs](https://www.jenkins.io/doc/book/using/remote-access-api/)
- **Docker commands:** [Docker CLI reference](https://docs.docker.com/engine/reference/commandline/cli/)

---

**Congratulations!** 🎉 You've successfully set up the integration server. Happy coding!

---

**Documentation Version:** 1.0  
**Last Updated:** November 20, 2025  
**Difficulty Level:** Beginner-Friendly
