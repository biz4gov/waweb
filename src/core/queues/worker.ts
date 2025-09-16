// Versão 6
import { Worker } from 'bullmq';
import axios from 'axios';
import { redisConnection } from './connection';

export const initializeWebhookWorker = () => {
  console.log('👷 Iniciando Worker de Webhooks...');
  
  // O Worker escuta a fila 'webhook-sender'
  new Worker('webhook-sender', async (job) => {
    const { targetUrl, payload } = job.data;
    
    console.log(`[Worker] Processando job ${job.id}: Enviando para ${targetUrl}`);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Adiciona a assinatura no header, uma prática comum
      if (payload.signature) {
        headers['X-Webhook-Signature-256'] = `sha256=${payload.signature}`;
      }

      await axios.post(targetUrl, payload, { headers });
      console.log(`[Worker] Job ${job.id} enviado com sucesso!`);
    } catch (error: any) {
      console.error(`[Worker] Falha ao enviar job ${job.id} para ${targetUrl}. Erro: ${error.message}`);
      // Lança o erro novamente para que o BullMQ possa tentar novamente (retry)
      throw error;
    }
  }, { connection: redisConnection });
};