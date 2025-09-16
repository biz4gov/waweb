// Versão 6
import { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_URL?.split('//')[1].split(':')[0] || 'localhost',
  port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
};