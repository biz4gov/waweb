import { Express } from 'express';
import { setupTestApp, testRequest } from './setup';
import accountRoutes from '../api/routes/accountRoutes';

describe('Account Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = setupTestApp();
    app.use('/accounts', accountRoutes);
  });

  describe('GET /accounts', () => {
    it('should return 200 and list of accounts', async () => {
      const response = await testRequest(app).get('/accounts');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  describe('POST /accounts', () => {
    it('should create a new account', async () => {
      const newAccount = {
        phoneNumber: '5511999999999'
      };

      const response = await testRequest(app)
        .post('/accounts')
        .send(newAccount);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.phoneNumber).toBe(newAccount.phoneNumber);
    });
  });
});