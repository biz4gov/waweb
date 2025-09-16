import request from 'supertest';
import { Express } from 'express';
import { setupServer } from '../server';

describe('Message Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = setupServer();
  });

  describe('POST /api/send-message', () => {
    it('should send a message', async () => {
      const response = await request(app)
        .post('/api/send-message')
        .send({
          to: '5511999999999',
          message: 'Test message'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error for invalid phone', async () => {
      const response = await request(app)
        .post('/api/send-message')
        .send({
          to: 'invalid',
          message: 'Test message'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});