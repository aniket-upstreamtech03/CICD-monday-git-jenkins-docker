# Test Docker Monday.com Column Updates
# This script helps test Docker integration and Monday.com updates

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🐳 Docker Monday.com Update Test Script" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER_URL = "http://localhost:5000"
$CONTAINER_NAME = "integration-server-docker-f-success-2"
$FEATURE_NAME = "docker-f-success-2"
$BRANCH_NAME = "docker-f-success-2"
$BUILD_NUMBER = "60"
$IMAGE_TAG = "60"
$REPOSITORY_NAME = "Sample-jenkins-test"  # Git repository name

# Test 1: Check if server is running
Write-Host "Test 1: Checking if Integration Server is running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$SERVER_URL/health" -Method Get -ErrorAction Stop
    Write-Host "✅ Server is running: $($healthCheck | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not responding at $SERVER_URL" -ForegroundColor Red
    Write-Host "   Make sure to run: npm run dev" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: List Docker containers
Write-Host "Test 2: Listing Docker containers..." -ForegroundColor Yellow
try {
    $containers = docker ps -a --format "table {{.Names}}`t{{.Status}}`t{{.Image}}" | Out-String
    Write-Host $containers -ForegroundColor Gray
    
    # Check if our container exists
    $containerExists = docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}"
    if ($containerExists) {
        Write-Host "✅ Found container: $CONTAINER_NAME" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Container '$CONTAINER_NAME' not found" -ForegroundColor Yellow
        Write-Host "   Available containers:" -ForegroundColor Yellow
        docker ps -a --format "  - {{.Names}}"
        Write-Host ""
        Write-Host "   You can still test the API, but it will return container not found." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Docker is not running or not installed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Test Docker API endpoint
Write-Host "Test 3: Testing /api/docker/deploy-notification endpoint..." -ForegroundColor Yellow

$payload = @{
    containerName = $CONTAINER_NAME
    featureName = $FEATURE_NAME
    branchName = $BRANCH_NAME
    buildNumber = $BUILD_NUMBER
    imageTag = $IMAGE_TAG
    repositoryName = $REPOSITORY_NAME
} | ConvertTo-Json

Write-Host "Payload:" -ForegroundColor Gray
Write-Host $payload -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$SERVER_URL/api/docker/deploy-notification" `
        -Method Post `
        -Body $payload `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ API call successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    
    if ($response.success) {
        Write-Host ""
        Write-Host "📊 Container Info Retrieved:" -ForegroundColor Cyan
        Write-Host "   Status: $($response.containerInfo.status)" -ForegroundColor White
        Write-Host "   Container ID: $($response.containerInfo.containerId)" -ForegroundColor White
        Write-Host "   Image Version: $($response.containerInfo.imageVersion)" -ForegroundColor White
        Write-Host "   Exposed Ports: $($response.containerInfo.ports)" -ForegroundColor White
        Write-Host "   Health: $($response.containerInfo.health)" -ForegroundColor White
        Write-Host "   Resource Usage: $($response.containerInfo.resourceUsage)" -ForegroundColor White
        Write-Host "   Deployed At: $($response.containerInfo.deploymentTimestamp)" -ForegroundColor White
        Write-Host ""
        Write-Host "   Monday.com Updated: $($response.mondayUpdate)" -ForegroundColor $(if($response.mondayUpdate){'Green'}else{'Red'})
    }
} catch {
    Write-Host "❌ API call failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Get container status directly
Write-Host "Test 4: Getting container status via GET endpoint..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "$SERVER_URL/api/docker/status/$CONTAINER_NAME" `
        -Method Get `
        -ErrorAction Stop
    
    Write-Host "✅ Status retrieved:" -ForegroundColor Green
    Write-Host ($statusResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Could not get status: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: List all containers via API
Write-Host "Test 5: Listing all containers via API..." -ForegroundColor Yellow
try {
    $containersResponse = Invoke-RestMethod -Uri "$SERVER_URL/api/docker/containers" `
        -Method Get `
        -ErrorAction Stop
    
    Write-Host "✅ Containers list retrieved:" -ForegroundColor Green
    Write-Host ($containersResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Could not list containers: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Test 6: Check Docker API directly (if available)
Write-Host "Test 6: Testing Docker API directly (http://localhost:2375)..." -ForegroundColor Yellow
try {
    $dockerApiResponse = Invoke-RestMethod -Uri "http://localhost:2375/containers/json?all=true" `
        -Method Get `
        -ErrorAction Stop
    
    Write-Host "✅ Docker API is accessible!" -ForegroundColor Green
    Write-Host "   Found $($dockerApiResponse.Count) containers" -ForegroundColor White
    
    foreach ($container in $dockerApiResponse) {
        Write-Host "   - $($container.Names[0]) ($($container.State))" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Docker API not accessible at localhost:2375" -ForegroundColor Yellow
    Write-Host "   This is normal if Docker API is not exposed." -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 Test Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "1. ✅ Integration Server: Running" -ForegroundColor Green
Write-Host "2. Check Docker container existence above" -ForegroundColor White
Write-Host "3. Check API endpoint response above" -ForegroundColor White
Write-Host "4. Check if Monday.com was updated" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check your Monday.com board for the item: $FEATURE_NAME" -ForegroundColor White
Write-Host "2. Verify Docker columns are populated:" -ForegroundColor White
Write-Host "   - Docker Status" -ForegroundColor Gray
Write-Host "   - Container ID" -ForegroundColor Gray
Write-Host "   - Exposed Ports" -ForegroundColor Gray
Write-Host "   - Health Status" -ForegroundColor Gray
Write-Host "   - Resource Usage" -ForegroundColor Gray
Write-Host "   - Deployment Timestamp" -ForegroundColor Gray
Write-Host ""
Write-Host "If columns are not updated, check:" -ForegroundColor Yellow
Write-Host "- MONDAY_API_KEY in .env" -ForegroundColor Gray
Write-Host "- MONDAY_BOARD_ID in .env" -ForegroundColor Gray
Write-Host "- Column IDs in config/constants.js" -ForegroundColor Gray
Write-Host ""
