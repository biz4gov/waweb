// Versão 9
import { Router } from 'express';
import { statusController } from '../controllers/StatusController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Protegemos o endpoint de status, pois ele pode conter informações sensíveis.
router.get('/', authMiddleware, statusController.getStatus);

export default router;