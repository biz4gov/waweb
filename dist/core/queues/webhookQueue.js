// Versão 6
import { Queue } from 'bullmq';
import { redisConnection } from './connection';
// Dica: Usar um nome de fila específico ajuda a organizar múltiplos tipos de jobs no futuro.
export const webhookQueue = new Queue('webhook-sender', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 5, // Tenta reenviar até 5 vezes em caso de falha
        backoff: {
            type: 'exponential', // Aumenta o tempo de espera a cada tentativa
            delay: 1000, // Começa com 1 segundo
        },
    },
});
//# sourceMappingURL=webhookQueue.js.map