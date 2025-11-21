pipeline {
    agent any
    
    environment {
        // Docker configuration
        DOCKER_IMAGE = "integration-server"
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        CONTAINER_NAME = "integration-server-${env.BRANCH_NAME}"
        DOCKER_REGISTRY = "" // Add your registry if needed
        
        // Application configuration
        APP_PORT = "5000"
        
        // Get environment variables for deployment
        FEATURE_NAME = "${env.GIT_COMMIT?.take(8) ?: 'unknown'}-${env.BRANCH_NAME}"
        
        // Integration Server URL (for callbacks)
        INTEGRATION_SERVER_URL = "${env.INTEGRATION_SERVER_URL ?: 'http://localhost:5000'}"
    }
    
    stages {
        stage('Cleanup Old Containers') {
            steps {
                script {
                    echo "🧹 Cleaning up old containers and images..."
                    sh '''
                        # Stop and remove old container if exists
                        if docker ps -a | grep -q ${CONTAINER_NAME}; then
                            echo "Stopping existing container: ${CONTAINER_NAME}"
                            docker stop ${CONTAINER_NAME} || true
                            docker rm ${CONTAINER_NAME} || true
                        fi
                        
                        # Remove dangling images
                        docker image prune -f || true
                    '''
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo "🔨 Building Docker image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
                    sh """
                        docker build \
                            -t ${DOCKER_IMAGE}:${DOCKER_TAG} \
                            -t ${DOCKER_IMAGE}:latest \
                            -f Dockerfile .
                    """
                    echo "✅ Docker image built successfully"
                }
            }
        }
        
        stage('Test Docker Image') {
            steps {
                script {
                    echo "🧪 Testing Docker image..."
                    sh """
                        # Run container in test mode
                        docker run --rm ${DOCKER_IMAGE}:${DOCKER_TAG} node --version
                        docker run --rm ${DOCKER_IMAGE}:${DOCKER_TAG} npm --version
                    """
                    echo "✅ Docker image test passed"
                }
            }
        }
        
        stage('Deploy Container') {
            steps {
                script {
                    echo "🚀 Deploying Docker container: ${CONTAINER_NAME}"
                    
                    // Load environment variables from .env file
                    def envVars = ""
                    if (fileExists('.env')) {
                        envVars = sh(script: "cat .env | grep -v '^#' | grep '=' | sed 's/^/-e /' | tr '\\n' ' '", returnStdout: true).trim()
                    }
                    
                    sh """
                        docker run -d \
                            --name ${CONTAINER_NAME} \
                            -p ${APP_PORT}:5000 \
                            --restart unless-stopped \
                            -e NODE_ENV=production \
                            -e BUILD_NUMBER=${BUILD_NUMBER} \
                            -e GIT_COMMIT=${GIT_COMMIT} \
                            -e GIT_BRANCH=${BRANCH_NAME} \
                            ${envVars} \
                            ${DOCKER_IMAGE}:${DOCKER_TAG}
                    """
                    
                    echo "✅ Container deployed successfully"
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    echo "🏥 Performing health check..."
                    
                    // Wait for container to start
                    sleep(time: 10, unit: 'SECONDS')
                    
                    def healthCheckPassed = false
                    def maxRetries = 6
                    def retryCount = 0
                    
                    while (!healthCheckPassed && retryCount < maxRetries) {
                        try {
                            sh """
                                curl -f http://localhost:${APP_PORT}/health || exit 1
                            """
                            healthCheckPassed = true
                            echo "✅ Health check passed"
                        } catch (Exception e) {
                            retryCount++
                            echo "⏳ Health check attempt ${retryCount}/${maxRetries} failed, retrying..."
                            sleep(time: 5, unit: 'SECONDS')
                        }
                    }
                    
                    if (!healthCheckPassed) {
                        error("❌ Health check failed after ${maxRetries} attempts")
                    }
                }
            }
        }
        
        stage('Get Container Info') {
            steps {
                script {
                    echo "📊 Gathering container information..."
                    
                    // Get container details
                    env.CONTAINER_ID = sh(
                        script: "docker inspect --format='{{.Id}}' ${CONTAINER_NAME} | cut -c1-12",
                        returnStdout: true
                    ).trim()
                    
                    env.IMAGE_VERSION = sh(
                        script: "docker inspect --format='{{.Config.Image}}' ${CONTAINER_NAME}",
                        returnStdout: true
                    ).trim()
                    
                    env.EXPOSED_PORTS = sh(
                        script: "docker port ${CONTAINER_NAME} | tr '\\n' ', ' | sed 's/,\$//'",
                        returnStdout: true
                    ).trim()
                    
                    env.DEPLOYMENT_TIME = sh(
                        script: "date '+%Y-%m-%d %H:%M:%S'",
                        returnStdout: true
                    ).trim()
                    
                    echo "Container ID: ${env.CONTAINER_ID}"
                    echo "Image Version: ${env.IMAGE_VERSION}"
                    echo "Exposed Ports: ${env.EXPOSED_PORTS}"
                    echo "Deployment Time: ${env.DEPLOYMENT_TIME}"
                }
            }
        }
        
        stage('Update Monday.com') {
            steps {
                script {
                    echo "📝 Updating Monday.com with deployment information..."
                    
                    def payload = """
                    {
                        "containerName": "${CONTAINER_NAME}",
                        "featureName": "${FEATURE_NAME}",
                        "branchName": "${BRANCH_NAME}",
                        "buildNumber": "${BUILD_NUMBER}",
                        "imageTag": "${DOCKER_TAG}",
                        "repositoryName": "${JOB_NAME}"
                    }
                    """
                    
                    try {
                        sh """
                            curl -X POST \
                                -H "Content-Type: application/json" \
                                -d '${payload}' \
                                ${INTEGRATION_SERVER_URL}/api/docker/deploy-notification
                        """
                        echo "✅ Monday.com updated successfully"
                    } catch (Exception e) {
                        echo "⚠️ Warning: Failed to update Monday.com: ${e.message}"
                        // Don't fail the build if Monday.com update fails
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo """
            ═══════════════════════════════════════════
            ✅ DOCKER DEPLOYMENT SUCCESSFUL
            ═══════════════════════════════════════════
            Container: ${CONTAINER_NAME}
            Image: ${DOCKER_IMAGE}:${DOCKER_TAG}
            Build Number: ${BUILD_NUMBER}
            Branch: ${BRANCH_NAME}
            Port: ${APP_PORT}
            ═══════════════════════════════════════════
            """
        }
        
        failure {
            script {
                echo "❌ Docker deployment failed!"
                
                // Notify Monday.com about failure
                def failurePayload = """
                {
                    "featureName": "${FEATURE_NAME}",
                    "branchName": "${BRANCH_NAME}",
                    "buildNumber": "${BUILD_NUMBER}",
                    "errorMessage": "Docker deployment failed at stage: ${env.STAGE_NAME}"
                }
                """
                
                try {
                    sh """
                        curl -X POST \
                            -H "Content-Type: application/json" \
                            -d '${failurePayload}' \
                            ${INTEGRATION_SERVER_URL}/api/docker/deploy-failure
                    """
                } catch (Exception e) {
                    echo "⚠️ Warning: Failed to notify Monday.com about failure"
                }
                
                // Cleanup failed container
                sh """
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true
                """
            }
        }
        
        always {
            echo "🧹 Cleaning up workspace..."
            cleanWs()
        }
    }
}
