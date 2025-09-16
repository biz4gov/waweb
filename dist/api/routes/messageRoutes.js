// Versão 5
import { Router } from 'express';
import { messageController } from '../controllers/MessageController';
const router = Router();
router.post('/conversations/:conversationId/messages', messageController.send);
export default router;
//# sourceMappingURL=messageRoutes.js.map