import { Express } from 'express';
import { setupTestApp, testRequest } from './setup';
import accountRoutes from '../api/routes/accountRoutes';
import messageRoutes from '../api/routes/messageRoutes';

describe('API Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = setupTestApp();
    app.use('/accounts', accountRoutes);
    app.use('/api', messageRoutes);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await testRequest(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Account and Message Flow', () => {
    it('should create account and send message', async () => {
      // Create account
      const accountResponse = await testRequest(app)
        .post('/accounts')
        .send({ phoneNumber: '5511999999999' });

      expect(accountResponse.status).toBe(201);
      expect(accountResponse.body).toHaveProperty('id');

      // Send message
      const messageResponse = await testRequest(app)
        .post('/api/send-message')
        .send({
          to: accountResponse.body.phoneNumber,
          message: 'Integration test message'
        });

      expect(messageResponse.status).toBe(200);
      expect(messageResponse.body).toHaveProperty('success', true);
    });
  });
});