import dotenv from 'dotenv';
dotenv.config();
export const redisConnection = {
    host: process.env.REDIS_URL?.split('//')[1].split(':')[0] || 'localhost',
    port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
};
//# sourceMappingURL=connection.js.map