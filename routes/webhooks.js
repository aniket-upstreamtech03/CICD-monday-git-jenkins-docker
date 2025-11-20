const express = require('express');
const router = express.Router();
const githubController = require('../controllers/githubController');

// GitHub webhook endpoint
router.post('/github', githubController.handleWebhook);

// Test webhook endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    instructions: {
      github: 'Configure GitHub webhook to POST to this endpoint',
      payload: 'Webhook will be processed automatically'
    }
  });
});

// Simulate webhook for testing
router.post('/simulate/github', async (req, res) => {
  try {
    const { eventType, payload } = req.body;
    
    // Create mock headers
    const mockHeaders = {
      'x-github-event': eventType || 'push',
      'x-hub-signature-256': 'mock-signature-for-testing'
    };

    // Create mock request
    const mockReq = {
      body: payload,
      headers: mockHeaders
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          res.status(code).json({
            simulated: true,
            ...data
          });
        }
      })
    };

    await githubController.handleWebhook(mockReq, mockRes);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;