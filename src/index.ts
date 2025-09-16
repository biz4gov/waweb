// Versão 3
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { cpus } from 'os';
import cluster from 'cluster';

// Load environment variables
config();

// Performance optimizations
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Cluster for production
if (isProduction && cluster.isPrimary) {
  const numWorkers = cpus().length;
  console.log(`Master process ${process.pid} is setting up ${numWorkers} workers`);
  
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Worker process or development
  setupApp();
}

function setupApp() {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  
  // Rate limiting with memory store optimization
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '127.0.0.1' // Skip localhost in development
  });
  
  app.use(limiter);
  
  // Parse JSON with size limit for performance
  app.use(express.json({ 
    limit: '1mb',
    type: ['application/json', 'text/plain']
  }));
  
  // Compression for responses
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'uSaaS-WaWeb');
    next();
  });

  // Health check endpoint (lightweight)
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Lazy load routes for better startup performance
  app.use('/auth', async (req, res, next) => {
    const { default: authRoutes } = await import('./api/routes/authRoutes.js');
    authRoutes(req, res, next);
  });

  app.use('/accounts', async (req, res, next) => {
    const { default: accountRoutes } = await import('./api/routes/accountRoutes.js');
    accountRoutes(req, res, next);
  });

  app.use('/api', async (req, res, next) => {
    const { default: messageRoutes } = await import('./api/routes/messageRoutes.js');
    messageRoutes(req, res, next);
  });

  app.use('/webhooks', async (req, res, next) => {
    const { default: webhookRoutes } = await import('./api/routes/webhookRoutes.js');
    webhookRoutes(req, res, next);
  });

  // New omnichannel routes
  app.use('/channels', async (req, res, next) => {
    const { default: channelRoutes } = await import('./api/routes/channelRoutes.js');
    channelRoutes(req, res, next);
  });

  app.use('/ai', async (req, res, next) => {
    const { default: aiRoutes } = await import('./api/routes/aiRoutes.js');
    aiRoutes(req, res, next);
  });

  // Main omnichannel API - External applications integration
  app.use('/omnichannel', async (req, res, next) => {
    const { default: omnichannelRoutes } = await import('./api/routes/omnichannelRoutes.js');
    omnichannelRoutes(req, res, next);
  });

  // Global error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error:', err);
    res.status(500).json({ 
      error: isProduction ? 'Internal server error' : err.message 
    });
  });

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`🚀 Worker ${process.pid} running on http://localhost:${PORT}`);
    
    // Initialize background services after server start
    initializeBackgroundServices();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
}

async function initializeBackgroundServices() {
  try {
    // Lazy initialize worker for better startup performance
    const { initializeWebhookWorker } = await import('./core/queues/worker.js');
    await initializeWebhookWorker();
    console.log('✅ Background services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize background services:', error);
  }
}
