require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { createTunnel } = require("./Helper/localtunnel");

const webhookRoutes = require('./routes/webhooks');
const jenkinsRoutes = require('./routes/jenkins');
const mondayRoutes = require('./routes/monday');
const dockerRoutes = require('./routes/docker');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json());

// Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/jenkins', jenkinsRoutes);
app.use('/api/monday', mondayRoutes);
app.use('/api/docker', dockerRoutes);

// Enhanced Health check with container info
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    service: 'GitHub-Jenkins-Monday Integration Server',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    container_id: process.env.HOSTNAME || 'local',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  };
  
  res.status(200).json(healthData);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GitHub + Jenkins + Monday.com + Docker Integration Server',
    endpoints: {
      health: 'GET /health',
      webhooks: 'POST /api/webhooks/github',
      jenkins: 'GET /api/jenkins/status',
      monday: 'GET /api/monday/boards',
      docker: {
        deployNotification: 'POST /api/docker/deploy-notification',
        containers: 'GET /api/docker/containers',
        status: 'GET /api/docker/status/:containerName',
        updateMonday: 'POST /api/docker/update-monday'
      }
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Integration Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Ready to receive GitHub webhooks: http://localhost:${PORT}/api/webhooks/github`);
  createTunnel(PORT);
});