import express from 'express';
import accountRoutes from './api/routes/accountRoutes';
import messageRoutes from './api/routes/messageRoutes';
export function setupServer() {
    const app = express();
    app.use(express.json());
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    app.use('/accounts', accountRoutes);
    app.use('/api', messageRoutes);
    return app;
}
//# sourceMappingURL=server.js.map