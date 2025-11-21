#!/bin/bash

# Docker Deployment Script with Rollback Support
# Usage: ./deploy-docker.sh [environment] [version]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="integration-server"
DOCKER_IMAGE="${APP_NAME}"
CONTAINER_NAME="${APP_NAME}"
APP_PORT="${PORT:-5000}"
ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"
INTEGRATION_SERVER_URL="${INTEGRATION_SERVER_URL:-http://localhost:5000}"

# Deployment configuration files
case $ENVIRONMENT in
    "dev"|"development")
        COMPOSE_FILE="docker-compose.dev.yml"
        CONTAINER_NAME="${APP_NAME}-dev"
        ;;
    "staging")
        COMPOSE_FILE="docker-compose.yml"
        CONTAINER_NAME="${APP_NAME}-staging"
        ;;
    "prod"|"production")
        COMPOSE_FILE="docker-compose.prod.yml"
        CONTAINER_NAME="${APP_NAME}-prod"
        ;;
    *)
        echo -e "${RED}❌ Invalid environment: ${ENVIRONMENT}${NC}"
        echo "Usage: $0 [dev|staging|prod] [version]"
        exit 1
        ;;
esac

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Docker Deployment Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}Environment:${NC} ${ENVIRONMENT}"
echo -e "${GREEN}Version:${NC} ${VERSION}"
echo -e "${GREEN}Container:${NC} ${CONTAINER_NAME}"
echo -e "${GREEN}Compose File:${NC} ${COMPOSE_FILE}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

# Function to check if Docker is running
check_docker() {
    echo -e "\n${YELLOW}🔍 Checking Docker...${NC}"
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to backup current container
backup_container() {
    if docker ps -a | grep -q "${CONTAINER_NAME}"; then
        echo -e "\n${YELLOW}💾 Backing up current container...${NC}"
        
        # Get current image
        CURRENT_IMAGE=$(docker inspect --format='{{.Config.Image}}' ${CONTAINER_NAME} 2>/dev/null || echo "none")
        
        if [ "$CURRENT_IMAGE" != "none" ]; then
            # Tag current image as backup
            BACKUP_TAG="${APP_NAME}:backup-$(date +%Y%m%d-%H%M%S)"
            docker tag ${CURRENT_IMAGE} ${BACKUP_TAG}
            echo -e "${GREEN}✅ Backup created: ${BACKUP_TAG}${NC}"
            export BACKUP_IMAGE=${BACKUP_TAG}
        fi
    fi
}

# Function to stop and remove old container
stop_old_container() {
    echo -e "\n${YELLOW}🛑 Stopping old container...${NC}"
    
    if docker ps | grep -q "${CONTAINER_NAME}"; then
        docker stop ${CONTAINER_NAME}
        echo -e "${GREEN}✅ Container stopped${NC}"
    fi
    
    if docker ps -a | grep -q "${CONTAINER_NAME}"; then
        docker rm ${CONTAINER_NAME}
        echo -e "${GREEN}✅ Container removed${NC}"
    fi
}

# Function to pull/build new image
build_image() {
    echo -e "\n${YELLOW}🔨 Building Docker image...${NC}"
    
    docker build \
        -t ${DOCKER_IMAGE}:${VERSION} \
        -t ${DOCKER_IMAGE}:latest \
        -f Dockerfile .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Image built successfully${NC}"
    else
        echo -e "${RED}❌ Image build failed${NC}"
        exit 1
    fi
}

# Function to start new container
start_container() {
    echo -e "\n${YELLOW}🚀 Starting new container...${NC}"
    
    # Use docker-compose if file exists
    if [ -f "${COMPOSE_FILE}" ]; then
        ENV=${ENVIRONMENT} VERSION=${VERSION} docker-compose -f ${COMPOSE_FILE} up -d
    else
        # Fallback to docker run
        docker run -d \
            --name ${CONTAINER_NAME} \
            -p ${APP_PORT}:5000 \
            --env-file .env \
            --restart unless-stopped \
            ${DOCKER_IMAGE}:${VERSION}
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Container started successfully${NC}"
    else
        echo -e "${RED}❌ Container start failed${NC}"
        rollback
        exit 1
    fi
}

# Function to perform health check
health_check() {
    echo -e "\n${YELLOW}🏥 Performing health check...${NC}"
    
    MAX_ATTEMPTS=12
    ATTEMPT=0
    SLEEP_TIME=5
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))
        echo -e "${YELLOW}   Attempt ${ATTEMPT}/${MAX_ATTEMPTS}...${NC}"
        
        if curl -f http://localhost:${APP_PORT}/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed${NC}"
            return 0
        fi
        
        sleep $SLEEP_TIME
    done
    
    echo -e "${RED}❌ Health check failed after ${MAX_ATTEMPTS} attempts${NC}"
    return 1
}

# Function to get container info
get_container_info() {
    echo -e "\n${YELLOW}📊 Getting container information...${NC}"
    
    CONTAINER_ID=$(docker inspect --format='{{.Id}}' ${CONTAINER_NAME} | cut -c1-12)
    IMAGE_VERSION=$(docker inspect --format='{{.Config.Image}}' ${CONTAINER_NAME})
    EXPOSED_PORTS=$(docker port ${CONTAINER_NAME} | tr '\n' ', ' | sed 's/,$//')
    DEPLOYMENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${GREEN}   Container ID:${NC} ${CONTAINER_ID}"
    echo -e "${GREEN}   Image Version:${NC} ${IMAGE_VERSION}"
    echo -e "${GREEN}   Exposed Ports:${NC} ${EXPOSED_PORTS}"
    echo -e "${GREEN}   Deployment Time:${NC} ${DEPLOYMENT_TIME}"
}

# Function to update Monday.com
update_monday() {
    echo -e "\n${YELLOW}📝 Updating Monday.com...${NC}"
    
    PAYLOAD=$(cat <<EOF
{
    "containerName": "${CONTAINER_NAME}",
    "featureName": "Manual Deployment",
    "branchName": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
    "buildNumber": "$(date +%s)",
    "imageTag": "${VERSION}"
}
EOF
)
    
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "${PAYLOAD}" \
        ${INTEGRATION_SERVER_URL}/api/docker/deploy-notification)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Monday.com updated successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Failed to update Monday.com${NC}"
    fi
}

# Function to rollback to previous version
rollback() {
    echo -e "\n${RED}⏪ Rolling back to previous version...${NC}"
    
    if [ -z "${BACKUP_IMAGE}" ]; then
        echo -e "${RED}❌ No backup image found. Cannot rollback.${NC}"
        return 1
    fi
    
    # Stop failed container
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rm ${CONTAINER_NAME} 2>/dev/null || true
    
    # Start backup container
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${APP_PORT}:5000 \
        --env-file .env \
        --restart unless-stopped \
        ${BACKUP_IMAGE}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Rollback successful${NC}"
    else
        echo -e "${RED}❌ Rollback failed${NC}"
    fi
}

# Function to show container logs
show_logs() {
    echo -e "\n${YELLOW}📋 Recent container logs:${NC}"
    docker logs --tail 50 ${CONTAINER_NAME}
}

# Function to cleanup old images
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up old images...${NC}"
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old backup images (keep last 3)
    docker images ${APP_NAME} --format "{{.Tag}}" | grep "backup-" | sort -r | tail -n +4 | while read tag; do
        docker rmi ${APP_NAME}:${tag} 2>/dev/null || true
    done
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Main deployment process
main() {
    echo -e "\n${BLUE}Starting deployment process...${NC}\n"
    
    # Pre-deployment checks
    check_docker
    
    # Backup and stop old container
    backup_container
    stop_old_container
    
    # Build and start new container
    build_image
    start_container
    
    # Verify deployment
    if health_check; then
        get_container_info
        update_monday
        cleanup
        
        echo -e "\n${BLUE}═══════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════${NC}"
        echo -e "${GREEN}Container:${NC} ${CONTAINER_NAME}"
        echo -e "${GREEN}Image:${NC} ${DOCKER_IMAGE}:${VERSION}"
        echo -e "${GREEN}URL:${NC} http://localhost:${APP_PORT}"
        echo -e "${BLUE}═══════════════════════════════════════════${NC}\n"
    else
        echo -e "\n${RED}❌ Deployment failed. Initiating rollback...${NC}"
        rollback
        show_logs
        exit 1
    fi
}

# Run main function
main
