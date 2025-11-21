# Simple Docker API Test Script
# Test individual APIs step by step

param(
    [string]$ContainerName = "sample-test-api-container",
    [string]$ServerUrl = "http://localhost:5000"
)

function Show-Menu {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Docker API Testing Menu" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "1. Test Health Check" -ForegroundColor White
    Write-Host "2. Get Container Status" -ForegroundColor White
    Write-Host "3. List All Containers" -ForegroundColor White
    Write-Host "4. Send Deployment Notification (Updates Monday.com)" -ForegroundColor Yellow
    Write-Host "5. Run All Tests" -ForegroundColor Green
    Write-Host "6. Show Jenkins Parameters Guide" -ForegroundColor Magenta
    Write-Host "0. Exit" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
}

function Test-HealthCheck {
    Write-Host "`n🏥 Testing Health Check..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/health" -Method GET -ErrorAction Stop
        Write-Host "✅ Server is healthy!" -ForegroundColor Green
        Write-Host "   Service: $($response.service)" -ForegroundColor Gray
        Write-Host "   Version: $($response.version)" -ForegroundColor Gray
        Write-Host "   Uptime: $($response.uptime)" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "❌ Health check failed!" -ForegroundColor Red
        Write-Host "   Make sure integration server is running: npm start" -ForegroundColor Yellow
        Write-Host "   Error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-ContainerStatus {
    Write-Host "`n📊 Getting Container Status..." -ForegroundColor Yellow
    Write-Host "   Container: $ContainerName" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/docker/status/$ContainerName" -Method GET -ErrorAction Stop
        
        if ($response.success) {
            Write-Host "✅ Container found!" -ForegroundColor Green
            Write-Host "`n   Docker Details:" -ForegroundColor Cyan
            Write-Host "   Status:        $($response.data.status)" -ForegroundColor White
            Write-Host "   Container ID:  $($response.data.containerId)" -ForegroundColor White
            Write-Host "   Image:         $($response.data.imageVersion)" -ForegroundColor White
            Write-Host "   Ports:         $($response.data.ports)" -ForegroundColor White
            Write-Host "   Health:        $($response.data.health)" -ForegroundColor White
            Write-Host "   Resources:     $($response.data.resourceUsage)" -ForegroundColor White
            Write-Host "   Deployed:      $($response.data.deploymentTimestamp)" -ForegroundColor White
            return $response.data
        } else {
            Write-Host "❌ Container not found or error" -ForegroundColor Red
            Write-Host "   Error: $($response.error)" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "❌ Failed to get container status" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        return $null
    }
}

function Test-ListContainers {
    Write-Host "`n📦 Listing All Containers..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/docker/containers" -Method GET -ErrorAction Stop
        
        if ($response.success -and $response.containers.Count -gt 0) {
            Write-Host "✅ Found $($response.containers.Count) container(s)" -ForegroundColor Green
            
            foreach ($container in $response.containers) {
                Write-Host "`n   Container:" -ForegroundColor Cyan
                Write-Host "   Name:     $($container.name)" -ForegroundColor White
                Write-Host "   ID:       $($container.id)" -ForegroundColor Gray
                Write-Host "   Status:   $($container.status)" -ForegroundColor Gray
                Write-Host "   Image:    $($container.image)" -ForegroundColor Gray
                Write-Host "   Ports:    $($container.ports)" -ForegroundColor Gray
            }
            return $true
        } else {
            Write-Host "⚠️  No containers found" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "❌ Failed to list containers" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-DeploymentNotification {
    Write-Host "`n🚀 Sending Deployment Notification..." -ForegroundColor Yellow
    Write-Host "   This will update Monday.com!" -ForegroundColor Cyan
    
    # First get current container info
    $containerInfo = Test-ContainerStatus
    if (-not $containerInfo) {
        Write-Host "❌ Cannot send notification - container not found" -ForegroundColor Red
        return $false
    }
    
    Write-Host "`n   Building payload..." -ForegroundColor Gray
    $payload = @{
        containerName = $ContainerName
        featureName = "PowerShell API Test"
        branchName = "main"
        buildNumber = "PS-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        imageTag = $containerInfo.imageVersion
    } | ConvertTo-Json
    
    Write-Host "   Payload:" -ForegroundColor Gray
    Write-Host $payload -ForegroundColor DarkGray
    
    try {
        $response = Invoke-RestMethod `
            -Uri "$ServerUrl/api/docker/deploy-notification" `
            -Method POST `
            -ContentType "application/json" `
            -Body $payload `
            -ErrorAction Stop
        
        Write-Host "`n✅ Deployment notification sent!" -ForegroundColor Green
        Write-Host "   Monday.com updated: $($response.mondayUpdate)" -ForegroundColor Cyan
        
        Write-Host "`n   📊 Data sent to Monday.com:" -ForegroundColor Yellow
        Write-Host "   Docker Status:     $($response.containerInfo.status)" -ForegroundColor White
        Write-Host "   Container ID:      $($response.containerInfo.containerId)" -ForegroundColor White
        Write-Host "   Image Version:     $($response.containerInfo.imageVersion)" -ForegroundColor White
        Write-Host "   Ports:             $($response.containerInfo.ports)" -ForegroundColor White
        Write-Host "   Health:            $($response.containerInfo.health)" -ForegroundColor White
        Write-Host "   Resources:         $($response.containerInfo.resourceUsage)" -ForegroundColor White
        Write-Host "   Timestamp:         $($response.containerInfo.deploymentTimestamp)" -ForegroundColor White
        
        Write-Host "`n   🎯 Next: Check your Monday.com board!" -ForegroundColor Cyan
        Write-Host "   Look for item: 'main' or 'PowerShell API Test'" -ForegroundColor Gray
        Write-Host "   All Docker columns should be filled!" -ForegroundColor Gray
        
        return $true
    } catch {
        Write-Host "`n❌ Failed to send deployment notification" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Response: $responseBody" -ForegroundColor Red
        }
        return $false
    }
}

function Show-JenkinsGuide {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Jenkins Integration Parameters" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "`n📋 Parameters Jenkins needs to send:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. containerName (REQUIRED)" -ForegroundColor White
    Write-Host "   Example: 'sample-test-api-container'" -ForegroundColor Gray
    Write-Host "   Source: Fixed value or from docker ps" -ForegroundColor Gray
    
    Write-Host "`n2. buildNumber (OPTIONAL)" -ForegroundColor White
    Write-Host "   Example: '123'" -ForegroundColor Gray
    Write-Host "   Source: env.BUILD_NUMBER" -ForegroundColor Gray
    
    Write-Host "`n3. branchName (OPTIONAL)" -ForegroundColor White
    Write-Host "   Example: 'main'" -ForegroundColor Gray
    Write-Host "   Source: env.BRANCH_NAME" -ForegroundColor Gray
    
    Write-Host "`n4. imageTag (OPTIONAL)" -ForegroundColor White
    Write-Host "   Example: 'sample-test-api:59'" -ForegroundColor Gray
    Write-Host "   Source: Docker image tag you just built" -ForegroundColor Gray
    
    Write-Host "`n5. featureName (OPTIONAL)" -ForegroundColor White
    Write-Host "   Example: 'Add new feature'" -ForegroundColor Gray
    Write-Host "   Source: Git commit message or custom text" -ForegroundColor Gray
    
    Write-Host "`n🔧 Jenkins Stage Example:" -ForegroundColor Yellow
    Write-Host @"

stage('Update Monday.com') {
    steps {
        script {
            def payload = '''
            {
                "containerName": "sample-test-api-container",
                "buildNumber": "${env.BUILD_NUMBER}",
                "branchName": "${env.BRANCH_NAME}",
                "imageTag": "sample-test-api:${env.BUILD_NUMBER}",
                "featureName": "Docker Deployment"
            }
            '''
            
            sh """
                curl -X POST http://localhost:5000/api/docker/deploy-notification \
                    -H 'Content-Type: application/json' \
                    -d '\${payload}'
            """
        }
    }
}
"@ -ForegroundColor Gray
    
    Write-Host "`n💡 The API will automatically get:" -ForegroundColor Cyan
    Write-Host "   • Container ID (from docker inspect)" -ForegroundColor White
    Write-Host "   • Container Status (running/stopped/etc)" -ForegroundColor White
    Write-Host "   • Exposed Ports (from docker port)" -ForegroundColor White
    Write-Host "   • Health Status (from docker inspect)" -ForegroundColor White
    Write-Host "   • Resource Usage (from docker stats)" -ForegroundColor White
    Write-Host "   • Deployment Timestamp (current time)" -ForegroundColor White
    
    Write-Host "`n📄 See full guide in: README/DOCKER_API_REFERENCE.md" -ForegroundColor Yellow
}

function Run-AllTests {
    Write-Host "`n🚀 Running All Tests..." -ForegroundColor Cyan
    Write-Host "========================================"
    
    $results = @{
        health = Test-HealthCheck
        status = $false
        list = $false
        deploy = $false
    }
    
    if ($results.health) {
        Start-Sleep -Seconds 1
        $containerInfo = Test-ContainerStatus
        $results.status = ($null -ne $containerInfo)
        
        if ($results.status) {
            Start-Sleep -Seconds 1
            $results.list = Test-ListContainers
            
            Start-Sleep -Seconds 1
            Write-Host "`n⚠️  About to send deployment notification (will update Monday.com)" -ForegroundColor Yellow
            $confirm = Read-Host "Continue? (Y/N)"
            if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                $results.deploy = Test-DeploymentNotification
            }
        }
    }
    
    Write-Host "`n========================================"
    Write-Host "Test Results Summary:" -ForegroundColor Cyan
    Write-Host "========================================"
    Write-Host "Health Check:          $(if($results.health){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($results.health){'Green'}else{'Red'})
    Write-Host "Container Status:      $(if($results.status){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($results.status){'Green'}else{'Red'})
    Write-Host "List Containers:       $(if($results.list){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($results.list){'Green'}else{'Red'})
    Write-Host "Deployment Notify:     $(if($results.deploy){'✅ PASS'}else{'⏭️  SKIP'})" -ForegroundColor $(if($results.deploy){'Green'}else{'Yellow'})
    Write-Host "========================================"
}

# Main Loop
$running = $true
while ($running) {
    Show-Menu
    $choice = Read-Host "`nEnter your choice"
    
    switch ($choice) {
        "1" { Test-HealthCheck }
        "2" { Test-ContainerStatus }
        "3" { Test-ListContainers }
        "4" { Test-DeploymentNotification }
        "5" { Run-AllTests }
        "6" { Show-JenkinsGuide }
        "0" { 
            Write-Host "`n👋 Goodbye!" -ForegroundColor Cyan
            $running = $false 
        }
        default { 
            Write-Host "`n⚠️  Invalid choice. Please try again." -ForegroundColor Yellow 
        }
    }
    
    if ($running) {
        Write-Host "`nPress any key to continue..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}
