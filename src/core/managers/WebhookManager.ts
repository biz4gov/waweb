// Versão 6
import { webhookQueue } from '../queues/webhookQueue';
import pool from '../../database/db';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  signature?: string;
}

class WebhookManager {
  /**
   * Dispara um evento para ser processado e enviado via webhook.
   * @param accountId O ID da conta dona do evento.
   * @param eventType O tipo do evento (ex: 'MESSAGE_CREATED').
   * @param data O payload do evento.
   */
  public async dispatch(accountId: string, eventType: string, data: object) {
    // 1. Busca no banco todos os webhooks ativos para esta conta e evento.
    const query = `
      SELECT id, target_url, secret_key FROM webhooks
      WHERE account_id = $1 AND event_type = $2 AND is_active = TRUE
    `;
    const res = await pool.query(query, [accountId, eventType]);

    if (res.rowCount === 0) {
      // Sem webhooks configurados, não faz nada.
      return;
    }

    // 2. Para cada webhook encontrado, adiciona um job na fila.
    for (const webhook of res.rows) {
      const payload: WebhookPayload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: data,
      };

      // 3. Gera a assinatura HMAC se houver uma chave secreta
      if (webhook.secret_key) {
        const signature = crypto
          .createHmac('sha256', webhook.secret_key)
          .update(JSON.stringify(payload))
          .digest('hex');
        payload.signature = signature;
      }
      
      const jobName = `${eventType}:${webhook.id}`;
      const jobData = { targetUrl: webhook.target_url, payload };
      
      await webhookQueue.add(jobName, jobData);
      console.log(`[WebhookManager] Job ${jobName} adicionado à fila para ${webhook.target_url}`);
    }
  }
}

export const webhookManager = new WebhookManager();