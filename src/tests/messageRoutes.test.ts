import { Express } from 'express';
import { setupTestApp, testRequest } from './setup';
import messageRoutes from '../api/routes/messageRoutes';

describe('Message Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = setupTestApp();
    app.use('/api', messageRoutes);
  });

  describe('POST /api/send-message', () => {
    it('should send a message successfully', async () => {
      const messageData = {
        to: '5511999999999',
        message: 'Test message'
      };

      const response = await testRequest(app)
        .post('/api/send-message')
        .send(messageData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error for invalid phone number', async () => {
      const messageData = {
        to: 'invalid',
        message: 'Test message'
      };

      const response = await testRequest(app)
        .post('/api/send-message')
        .send(messageData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});