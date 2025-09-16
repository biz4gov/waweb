// Versão 2
import { Router } from 'express';
import { accountController } from '../controllers/AccountController';

const router = Router();

// Rota para iniciar a sessão de uma conta específica
router.post('/:accountId/initialize', accountController.initialize);

// Rota para obter o QR Code de uma conta específica
router.get('/:accountId/qr', accountController.getQRCode);

export default router;