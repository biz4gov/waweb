import express, { Express } from 'express';
import accountRoutes from './api/routes/accountRoutes';
import messageRoutes from './api/routes/messageRoutes';

export function setupServer(): Express {
  const app = express();
  
  app.use(express.json());
  
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/accounts', accountRoutes);
  app.use('/api', messageRoutes);

  return app;
}