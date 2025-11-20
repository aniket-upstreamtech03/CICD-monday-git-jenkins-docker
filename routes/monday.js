const express = require('express');
const router = express.Router();
const mondayController = require('../controllers/mondayController');

// Get boards information
router.get('/boards', mondayController.getBoards);

// Get board items
router.get('/items', mondayController.getBoardItems);

// Create pipeline item
router.post('/items', mondayController.createPipelineItem);

// Update pipeline status
router.put('/items/status', mondayController.updatePipelineStatus);

// Create manual update
router.post('/items/update', mondayController.createManualUpdate);

module.exports = router;