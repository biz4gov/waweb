import request from 'supertest';
import { Express } from 'express';
import { setupServer } from '../server';

describe('Account Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = setupServer();
  });

  describe('GET /accounts', () => {
    it('should return list of accounts', async () => {
      const response = await request(app).get('/accounts');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /accounts', () => {
    it('should create new account', async () => {
      const response = await request(app)
        .post('/accounts')
        .send({ phoneNumber: '5511999999999' });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.phoneNumber).toBe('5511999999999');
    });
  });
});