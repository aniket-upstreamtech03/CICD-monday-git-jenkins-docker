const express = require('express');
const router = express.Router();
const dockerController = require('../controllers/dockerController');

// POST /api/docker/deploy-notification
// Called by Jenkins after successful Docker deployment
router.post('/deploy-notification', dockerController.handleDeploymentNotification);

// POST /api/docker/deploy-failure
// Called by Jenkins when Docker deployment fails
router.post('/deploy-failure', dockerController.handleDeploymentFailure);

// GET /api/docker/containers
// List all Docker containers
router.get('/containers', dockerController.listContainers);

// GET /api/docker/status/:containerName
// Get status of a specific container
router.get('/status/:containerName', dockerController.getContainerStatus);

// POST /api/docker/update-monday
// Update Monday.com with current Docker status
router.post('/update-monday', dockerController.updateMondayWithDockerStatus);

// Container control endpoints
router.post('/start/:containerName', dockerController.startContainer);
router.post('/stop/:containerName', dockerController.stopContainer);
router.post('/restart/:containerName', dockerController.restartContainer);
router.get('/logs/:containerName', dockerController.getContainerLogs);

module.exports = router;
