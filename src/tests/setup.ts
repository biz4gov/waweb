import dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Mock external services and dependencies here
jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue({ id: 'mock-message-id' }),
  })),
}));

// Global test setup
beforeAll(() => {
  // Add any global setup here
});

// Global test teardown
afterAll(() => {
  // Add any global cleanup here
  jest.clearAllMocks();
});