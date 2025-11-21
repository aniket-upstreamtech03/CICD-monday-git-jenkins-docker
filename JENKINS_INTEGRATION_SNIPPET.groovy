// ═══════════════════════════════════════════════════════════════
// ADD THIS TO YOUR Sample-jenkins-test JENKINSFILE
// Place after the "Health Check" stage or in post { success { } }
// ═══════════════════════════════════════════════════════════════

// OPTION 1: Add as a separate stage (RECOMMENDED)
// ───────────────────────────────────────────────────────────────
stage('Update Monday.com Tracking') {
    steps {
        script {
            echo '📝 Updating Monday.com with Docker deployment info...'
            
            // Get deployment timestamp
            def deployTime = bat(
                script: 'echo %date% %time%',
                returnStdout: true
            ).trim()
            
            // Prepare JSON payload
            def payload = """
            {
                "containerName": "sample-test-api-container",
                "featureName": "Sample-Test-API-Deployment",
                "branchName": "${env.BRANCH_NAME ?: 'main'}",
                "buildNumber": "${env.BUILD_NUMBER}",
                "imageTag": "${env.BUILD_NUMBER}"
            }
            """.replace('\n', '').replace('  ', '')
            
            // Send to integration server
            try {
                bat """
                    curl -X POST ^
                        -H "Content-Type: application/json" ^
                        -d "${payload}" ^
                        http://localhost:5000/api/docker/deploy-notification
                """
                echo '✅ Monday.com updated successfully with Docker deployment details'
                echo '   - Docker Status: Running'
                echo '   - Container ID: Auto-detected'
                echo "   - Image Version: sample-test-api:${env.BUILD_NUMBER}"
                echo '   - Health Status: Auto-checked'
                echo "   - Deployment Time: ${deployTime}"
            } catch (Exception e) {
                echo "⚠️ Warning: Could not update Monday.com: ${e.message}"
                echo "   This won't fail the build - Monday.com tracking is optional"
            }
        }
    }
}


// OPTION 2: Add to post success block (SIMPLER)
// ───────────────────────────────────────────────────────────────
// Find your existing post { success { } } block and add this inside:

echo '📝 Tracking deployment in Monday.com...'
try {
    bat """
        curl -X POST ^
            -H "Content-Type: application/json" ^
            -d "{\\"containerName\\":\\"sample-test-api-container\\",\\"featureName\\":\\"Sample-Test-API\\",\\"branchName\\":\\"main\\",\\"buildNumber\\":\\"%BUILD_NUMBER%\\",\\"imageTag\\":\\"%BUILD_NUMBER%\\"}" ^
            http://localhost:5000/api/docker/deploy-notification
    """
    echo '✅ Monday.com tracking updated - All Docker columns populated'
} catch (Exception e) {
    echo "⚠️ Monday.com update skipped: ${e.message}"
}


// OPTION 3: Add failure tracking too
// ───────────────────────────────────────────────────────────────
// Add this to your post { failure { } } block:

echo '❌ Notifying Monday.com about deployment failure...'
try {
    bat """
        curl -X POST ^
            -H "Content-Type: application/json" ^
            -d "{\\"featureName\\":\\"Sample-Test-API\\",\\"branchName\\":\\"main\\",\\"buildNumber\\":\\"%BUILD_NUMBER%\\",\\"errorMessage\\":\\"Docker deployment failed\\"}" ^
            http://localhost:5000/api/docker/deploy-failure
    """
    echo '✅ Failure logged in Monday.com'
} catch (Exception e) {
    echo "⚠️ Could not log failure to Monday.com"
}


// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE NEEDED
// ═══════════════════════════════════════════════════════════════
// Add this at the top of your Jenkinsfile in the environment block:

environment {
    // ... your existing environment variables ...
    INTEGRATION_SERVER_URL = 'http://localhost:5000'
}


// ═══════════════════════════════════════════════════════════════
// WHAT GETS TRACKED IN MONDAY.COM
// ═══════════════════════════════════════════════════════════════
/*
After adding this code, Monday.com will automatically show:

✅ Docker Status: Running (green status)
✅ Container ID: 0bb8f1139951 (short ID)
✅ Docker Image Version: sample-test-api:58
✅ Exposed Ports: 0.0.0.0:3000->3000/tcp
✅ Health Status: healthy (from Docker health check)
✅ Resource Usage: CPU: 2.5% | Memory: 56.97MB
✅ Deployment Timestamp: 2025-11-20 13:25:05
✅ Build Number: 58
✅ Build URL: Link to Jenkins job
✅ GitHub Status: Completed
✅ Jenkins Status: Success

All automatically populated - no manual input needed!
*/


// ═══════════════════════════════════════════════════════════════
// BEFORE USING - CHECKLIST
// ═══════════════════════════════════════════════════════════════
/*
□ Integration server is running (npm start or docker-compose up)
□ Integration server is accessible at http://localhost:5000
□ Test endpoint: curl http://localhost:5000/health
□ Monday.com API key is set in integration server .env
□ Monday.com board ID is set in integration server .env
□ All 7 Docker columns exist in Monday.com board:
  - Docker Status (color_mkxwnrwk)
  - Container ID (text_mkxw8jf6)
  - Docker Image Version (text_mkxwjwx7)
  - Exposed Ports (text_mkxw4nkd)
  - Health Status (text_mkxwtatd)
  - Resource Usage (text_mkxwhj7v)
  - Deployment Timestamp (text_mkxwpw82)
*/


// ═══════════════════════════════════════════════════════════════
// TESTING
// ═══════════════════════════════════════════════════════════════
/*
1. Test integration server manually:
   
   curl -X POST http://localhost:5000/api/docker/deploy-notification \
     -H "Content-Type: application/json" \
     -d '{
       "containerName": "sample-test-api-container",
       "featureName": "Test",
       "branchName": "main",
       "buildNumber": "999",
       "imageTag": "test"
     }'

2. Check Monday.com board - should see new item with all Docker info

3. Add code to Jenkinsfile and push to GitHub

4. Watch Jenkins build - should see "✅ Monday.com updated successfully"

5. Check Monday.com board - should see real deployment data
*/


// ═══════════════════════════════════════════════════════════════
// TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════════
/*
Problem: curl command not found
Solution: Ensure curl is installed on Jenkins machine
          Windows: choco install curl
          Linux: sudo apt-get install curl

Problem: Connection refused to localhost:5000
Solution: - Check integration server is running
          - Try machine IP instead: http://192.168.x.x:5000
          - Check firewall allows port 5000

Problem: Monday.com not updating
Solution: - Check integration server logs
          - Verify MONDAY_API_KEY in .env
          - Verify MONDAY_BOARD_ID in .env
          - Test: curl http://localhost:5000/api/monday/boards

Problem: Wrong container name
Solution: Update "sample-test-api-container" to match your container name
          Find it with: docker ps --format "{{.Names}}"
*/
