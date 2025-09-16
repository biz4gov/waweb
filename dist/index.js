// Versão 2
import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import accountRoutes from './api/routes/accountRoutes';
import messageRoutes from './api/routes/messageRoutes';
import { initializeWebhookWorker } from './core/queues/worker';
import webhookRoutes from './api/routes/webhookRoutes';
import authRoutes from './api/routes/authRoutes';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Security middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);
// Rota pública de health check (simples, sem dados sensíveis)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Rotas públicas de autenticação
app.use('/auth', authRoutes);
// Incluindo as rotas de gerenciamento de contas
app.use('/accounts', accountRoutes);
app.use('/api', messageRoutes); // Adicionamos as novas rotas
app.use('/webhooks', webhookRoutes); // Adicionamos as novas rotas
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    // Inicia o worker para processar jobs da fila
    initializeWebhookWorker();
});
// Exportações removidas - arquivos não existem ou caminhos incorretos
//# sourceMappingURL=index.js.map