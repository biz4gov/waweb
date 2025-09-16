import { whatsappService } from '../../core/services/WhatsappService';
import { persistenceService } from '../../core/services/PersistenceService';
import { webhookQueue } from '../../core/queues/webhookQueue';
import { version } from '../../../package.json'; // Importa a versão do package.json
class StatusController {
    async getStatus(req, res) {
        try {
            // Coleta as métricas de cada parte do sistema em paralelo
            const [dbStatus, messageCounts, whatsappStatus, queueJobCounts,] = await Promise.all([
                persistenceService.getDatabaseStatus(),
                persistenceService.getMessageCounts(),
                whatsappService.getClientsStatus(),
                webhookQueue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed'),
            ]);
            const payload = {
                service_status: 'ok',
                timestamp: new Date().toISOString(),
                version: version,
                dependencies: {
                    database: dbStatus,
                    whatsapp_web_js: whatsappStatus,
                    webhook_queue: {
                        ...queueJobCounts,
                        total: Object.values(queueJobCounts).reduce((sum, count) => sum + count, 0),
                    },
                },
                metrics: {
                    messages: messageCounts,
                },
            };
            return res.status(200).json(payload);
        }
        catch (error) {
            console.error('Erro ao gerar status da aplicação:', error);
            return res.status(500).json({ service_status: 'error', message: 'Falha ao obter o status do serviço.' });
        }
    }
}
export const statusController = new StatusController();
//# sourceMappingURL=StatusController.js.map