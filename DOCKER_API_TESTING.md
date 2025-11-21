# 🧪 Docker API Testing Guide

## Quick Test - Is Integration Server Working?

### 1. Start Integration Server (if not running)

```bash
cd C:\Aniket\CODE\JENKINS x Github\integration-server
npm install
npm start
```

You should see:
```
🚀 Integration Server running on port 5000
📊 Health check: http://localhost:5000/health
🔗 Ready to receive GitHub webhooks
```

---

## 2. Test Health Endpoint

```bash
curl http://localhost:5000/health
```

Expected output:
```json
{
  "status": "OK",
  "service": "GitHub-Jenkins-Monday Integration Server",
  "timestamp": "2025-11-20T14:22:31.417Z",
  "version": "1.0.0",
  "container_id": "...",
  "environment": "development",
  "uptime": 123.45
}
```

---

## 3. Test Docker API - Get Your Container Info

Based on your Jenkins log:
- Container Name: `sample-test-api-container`
- Container ID: `6fe2cdb1179d`
- Image: `sample-test-api:59`

### Test Container Status Endpoint:

```bash
curl http://localhost:5000/api/docker/status/sample-test-api-container
```

Expected output:
```json
{
  "success": true,
  "data": {
    "status": "Running",
    "containerId": "6fe2cdb1179d",
    "imageVersion": "sample-test-api:59",
    "ports": "0.0.0.0:3000->3000/tcp",
    "health": "healthy",
    "resourceUsage": "CPU: 2.5% | Memory: 57.17MB",
    "deploymentTimestamp": "2025-11-20 14:22:18"
  }
}
```

---

## 4. Test Monday.com Update (MAIN TEST)

### Manual trigger to update Monday.com with Docker info:

```bash
curl -X POST http://localhost:5000/api/docker/deploy-notification ^
  -H "Content-Type: application/json" ^
  -d "{\"containerName\":\"sample-test-api-container\",\"featureName\":\"Sample-Test-API\",\"branchName\":\"main\",\"buildNumber\":\"59\",\"imageTag\":\"59\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Docker deployment tracked successfully",
  "containerInfo": {
    "status": "Running",
    "containerId": "6fe2cdb1179d",
    "imageVersion": "sample-test-api:59",
    "ports": "0.0.0.0:3000->3000/tcp",
    "health": "healthy",
    "resourceUsage": "CPU: 2.5% | Memory: 57.17MB",
    "deploymentTimestamp": "2025-11-20 14:22:18"
  },
  "mondayUpdate": true
}
```

### Check Integration Server Logs:

You should see:
```
🐳 Docker deployment notification received for: sample-test-api-container
📦 Feature: Sample-Test-API, Branch: main
📊 Container Info: { status: 'Running', ... }
✅ Monday.com updated with Docker deployment info
```

### Check Monday.com Board:

Go to your board and check these columns are populated:

| Column | Expected Value |
|--------|----------------|
| Docker Status | 🟢 Running |
| Container ID | 6fe2cdb1179d |
| Docker Image Version | sample-test-api:59 |
| Exposed Ports | 0.0.0.0:3000->3000/tcp |
| Health Status | healthy |
| Resource Usage | CPU: X% \| Memory: 57.17MB |
| Deployment Timestamp | 2025-11-20 14:22:18 |

---

## 5. Troubleshooting

### Problem: "Cannot connect to Docker daemon"

**Solution:** Make sure Docker Desktop is running.

```bash
# Test Docker is accessible
docker ps

# If this works, Docker is fine
```

### Problem: "Container not found"

**Solution:** Check container name is correct.

```bash
# List all containers
docker ps -a

# Find your container name (should be: sample-test-api-container)
```

### Problem: "Monday.com not updating"

**Check 1: Integration server can reach Monday.com**
```bash
curl http://localhost:5000/api/monday/boards
```

Should return your boards.

**Check 2: Environment variables are set**
```bash
# In integration-server directory
# Check .env file has:
MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...
MONDAY_BOARD_ID=5024820979
```

**Check 3: Column IDs are correct**

Open `config/constants.js` and verify:
```javascript
DOCKER_STATUS: 'color_mkxwnrwk',
CONTAINER_ID: 'text_mkxw8jf6',
DOCKER_IMAGE_VERSION: 'text_mkxwjwx7',
EXPOSED_PORTS: 'text_mkxw4nkd',
HEALTH_STATUS: 'text_mkxwtatd',
RESOURCE_USAGE: 'text_mkxwhj7v',
DEPLOYMENT_TIMESTAMP: 'text_mkxwpw82'
```

---

## 6. Test from PowerShell (Windows)

If curl doesn't work, use PowerShell:

```powershell
# Test health
Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET

# Test Docker status
Invoke-WebRequest -Uri "http://localhost:5000/api/docker/status/sample-test-api-container" -Method GET

# Test Monday.com update
$body = @{
    containerName = "sample-test-api-container"
    featureName = "Sample-Test-API"
    branchName = "main"
    buildNumber = "59"
    imageTag = "59"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/docker/deploy-notification" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

---

## 7. Full Test Sequence

Run these commands in order:

```bash
# 1. Check Docker is running
docker ps

# 2. Check integration server is running
curl http://localhost:5000/health

# 3. Get container info
curl http://localhost:5000/api/docker/status/sample-test-api-container

# 4. Test Monday.com connection
curl http://localhost:5000/api/monday/boards

# 5. Update Monday.com with Docker info
curl -X POST http://localhost:5000/api/docker/deploy-notification ^
  -H "Content-Type: application/json" ^
  -d "{\"containerName\":\"sample-test-api-container\",\"featureName\":\"Test-Deployment\",\"branchName\":\"main\",\"buildNumber\":\"999\",\"imageTag\":\"test\"}"

# 6. Check Monday.com board - should see new item or updated Docker columns
```

---

## 8. What .env Needs (Current vs Required)

### ✅ You Already Have (from your .env):
```env
# Required for Monday.com integration
MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...  ✅
MONDAY_BOARD_ID=5024820979              ✅

# Required for Jenkins integration
JENKINS_URL=http://localhost:8080       ✅
JENKINS_USERNAME=aniket3                ✅
JENKINS_API_TOKEN=11b97f1b...           ✅

# Required for GitHub integration
GITHUB_ACCESS_TOKEN=ghp_eycZl5Y33Gx... ✅
GITHUB_WEBHOOK_SECRET=githubTestSecret123 ✅
```

### ❌ NOT Needed for Docker:
- No Docker Desktop API token
- No Docker Hub credentials
- No Docker registry password

**Why?** The integration server uses local Docker CLI commands (`docker inspect`, `docker stats`, etc.) which work without authentication if Docker Desktop is running.

---

## 9. Expected Flow

```
Manual Test:
  You → curl POST /api/docker/deploy-notification
      → Integration Server receives request
      → Integration Server runs: docker inspect sample-test-api-container
      → Integration Server gets: ID, ports, health, CPU, memory
      → Integration Server calls Monday.com API
      → Monday.com updates 7 Docker columns
      → ✅ Success!

Jenkins Automatic (after adding stage):
  Jenkins → curl POST /api/docker/deploy-notification
      → Same flow as above
      → ✅ Monday.com auto-updated
```

---

## 10. Quick Verification Checklist

Run this to verify everything:

```bash
echo "=== Docker Check ==="
docker ps | findstr sample-test-api

echo ""
echo "=== Integration Server Check ==="
curl http://localhost:5000/health

echo ""
echo "=== Docker API Check ==="
curl http://localhost:5000/api/docker/status/sample-test-api-container

echo ""
echo "=== Monday.com Check ==="
curl http://localhost:5000/api/monday/boards

echo ""
echo "=== Full Test - Update Monday.com ==="
curl -X POST http://localhost:5000/api/docker/deploy-notification ^
  -H "Content-Type: application/json" ^
  -d "{\"containerName\":\"sample-test-api-container\",\"featureName\":\"Manual-Test\",\"branchName\":\"main\",\"buildNumber\":\"999\",\"imageTag\":\"test\"}"

echo ""
echo "=== NOW CHECK MONDAY.COM BOARD ==="
echo "Look for item 'main' or 'Manual-Test'"
echo "All 7 Docker columns should be filled!"
```

---

## Result

If all tests pass:
✅ Integration server is working  
✅ Docker API is working  
✅ Monday.com API is working  
✅ Ready to integrate with Jenkins

**Next:** Add the Monday.com update stage to your Jenkins pipeline (see `JENKINS_INTEGRATION_SNIPPET.groovy`)
