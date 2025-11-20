const express = require('express');
const router = express.Router();
const jenkinsController = require('../controllers/jenkinsController');

// Get Jenkins status
router.get('/status', jenkinsController.getJenkinsStatus);

// Get all jobs
router.get('/jobs', jenkinsController.getAllJobs);

// Get specific build information
router.get('/build/:buildNumber', jenkinsController.getBuildInfo);

// Get last build information
router.get('/build/last', jenkinsController.getLastBuild);

// Get build console output
router.get('/build/:buildNumber/console', jenkinsController.getConsoleOutput);

// Trigger a build
router.post('/build/trigger', jenkinsController.triggerBuild);

module.exports = router;