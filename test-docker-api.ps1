# PowerShell Test Script for Docker API Integration
# Run this to test if Monday.com Docker tracking is working

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Docker API Integration Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Check Docker is running
Write-Host "Test 1: Checking Docker..." -ForegroundColor Yellow
try {
    $dockerCheck = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker is not running. Please start Docker Desktop!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker command failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Check if container exists
Write-Host "`nTest 2: Checking container..." -ForegroundColor Yellow
$containerName = "sample-test-api-container"
$containerCheck = docker ps -a --filter "name=$containerName" --format "{{.Names}}"

if ($containerCheck -eq $containerName) {
    Write-Host "✅ Container '$containerName' found" -ForegroundColor Green
    
    # Get container details
    $containerId = docker inspect --format="{{.Id}}" $containerName
    $containerStatus = docker inspect --format="{{.State.Status}}" $containerName
    $containerImage = docker inspect --format="{{.Config.Image}}" $containerName
    
    Write-Host "   Container ID: $($containerId.Substring(0,12))" -ForegroundColor Gray
    Write-Host "   Status: $containerStatus" -ForegroundColor Gray
    Write-Host "   Image: $containerImage" -ForegroundColor Gray
} else {
    Write-Host "❌ Container '$containerName' not found" -ForegroundColor Red
    Write-Host "   Available containers:" -ForegroundColor Gray
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    exit 1
}

# Test 3: Check Integration Server
Write-Host "`nTest 3: Checking Integration Server..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -UseBasicParsing -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "✅ Integration Server is running" -ForegroundColor Green
        $healthData = $healthCheck.Content | ConvertFrom-Json
        Write-Host "   Service: $($healthData.service)" -ForegroundColor Gray
        Write-Host "   Version: $($healthData.version)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Integration Server is not responding" -ForegroundColor Red
    Write-Host "   Make sure to run: npm start" -ForegroundColor Yellow
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Test Docker API endpoint
Write-Host "`nTest 4: Testing Docker API..." -ForegroundColor Yellow
try {
    $dockerApiUrl = "http://localhost:5000/api/docker/status/$containerName"
    $dockerStatus = Invoke-WebRequest -Uri $dockerApiUrl -Method GET -UseBasicParsing -ErrorAction Stop
    
    if ($dockerStatus.StatusCode -eq 200) {
        Write-Host "✅ Docker API is working" -ForegroundColor Green
        $dockerData = $dockerStatus.Content | ConvertFrom-Json
        
        if ($dockerData.success) {
            Write-Host "   Docker Status: $($dockerData.data.status)" -ForegroundColor Gray
            Write-Host "   Container ID: $($dockerData.data.containerId)" -ForegroundColor Gray
            Write-Host "   Image: $($dockerData.data.imageVersion)" -ForegroundColor Gray
            Write-Host "   Ports: $($dockerData.data.ports)" -ForegroundColor Gray
            Write-Host "   Health: $($dockerData.data.health)" -ForegroundColor Gray
            Write-Host "   Resources: $($dockerData.data.resourceUsage)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Docker API returned error: $($dockerData.error)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Docker API test failed: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Test Monday.com connection
Write-Host "`nTest 5: Testing Monday.com connection..." -ForegroundColor Yellow
try {
    $mondayCheck = Invoke-WebRequest -Uri "http://localhost:5000/api/monday/boards" -Method GET -UseBasicParsing -ErrorAction Stop
    if ($mondayCheck.StatusCode -eq 200) {
        Write-Host "✅ Monday.com API is working" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Monday.com API test failed" -ForegroundColor Red
    Write-Host "   Check your MONDAY_API_KEY and MONDAY_BOARD_ID in .env" -ForegroundColor Yellow
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Test 6: Update Monday.com with Docker info
Write-Host "`nTest 6: Updating Monday.com with Docker info..." -ForegroundColor Yellow
try {
    $payload = @{
        containerName = $containerName
        featureName = "PowerShell-Test"
        branchName = "main"
        buildNumber = "999"
        imageTag = "test"
    } | ConvertTo-Json

    $updateResult = Invoke-WebRequest `
        -Uri "http://localhost:5000/api/docker/deploy-notification" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -UseBasicParsing `
        -ErrorAction Stop

    if ($updateResult.StatusCode -eq 200) {
        Write-Host "✅ Monday.com update successful!" -ForegroundColor Green
        $updateData = $updateResult.Content | ConvertFrom-Json
        
        Write-Host "`n📊 Data sent to Monday.com:" -ForegroundColor Cyan
        Write-Host "   Docker Status: $($updateData.containerInfo.status)" -ForegroundColor Gray
        Write-Host "   Container ID: $($updateData.containerInfo.containerId)" -ForegroundColor Gray
        Write-Host "   Image Version: $($updateData.containerInfo.imageVersion)" -ForegroundColor Gray
        Write-Host "   Ports: $($updateData.containerInfo.ports)" -ForegroundColor Gray
        Write-Host "   Health: $($updateData.containerInfo.health)" -ForegroundColor Gray
        Write-Host "   Resources: $($updateData.containerInfo.resourceUsage)" -ForegroundColor Gray
        Write-Host "   Timestamp: $($updateData.containerInfo.deploymentTimestamp)" -ForegroundColor Gray
        
        Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. Go to your Monday.com board" -ForegroundColor White
        Write-Host "   2. Look for item named 'main' or 'PowerShell-Test'" -ForegroundColor White
        Write-Host "   3. Check these columns are filled:" -ForegroundColor White
        Write-Host "      - Docker Status" -ForegroundColor Gray
        Write-Host "      - Container ID" -ForegroundColor Gray
        Write-Host "      - Docker Image Version" -ForegroundColor Gray
        Write-Host "      - Exposed Ports" -ForegroundColor Gray
        Write-Host "      - Health Status" -ForegroundColor Gray
        Write-Host "      - Resource Usage" -ForegroundColor Gray
        Write-Host "      - Deployment Timestamp" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Monday.com update failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ All Tests Completed!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "If all tests passed, Monday.com should now show:" -ForegroundColor Yellow
Write-Host "  • Docker Status: Running" -ForegroundColor White
Write-Host "  • Container ID: $(docker inspect --format='{{.Id}}' $containerName | Select-Object -First 1 | ForEach-Object { $_.Substring(0,12) })" -ForegroundColor White
Write-Host "  • All other Docker columns populated" -ForegroundColor White
Write-Host "`nCheck your Monday.com board now! 🎉`n" -ForegroundColor Green
