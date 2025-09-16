// Versão 7
import { Router } from 'express';
import { webhookController } from '../controllers/WebhookController';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = Router();
// Aplicamos o middleware de autenticação a todas as rotas de webhooks.
router.use(authMiddleware);
router.post('/', webhookController.create);
router.get('/', webhookController.list);
router.put('/:id', webhookController.update);
router.delete('/:id', webhookController.delete);
export default router;
//# sourceMappingURL=webhookRoutes.js.map