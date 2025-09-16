// Versão 5
import { Request, Response } from 'express';
import { whatsappService } from '../../core/services/WhatsappService';
import { persistenceService } from '../../core/services/PersistenceService';
import { webhookManager } from '../../core/managers/WebhookManager';
import pool from '../../database/db';

class MessageController {
  public async send(req: Request, res: Response): Promise<Response> {
    const { conversationId } = req.params;
    const { text, agentId } = req.body; // O agentId viria de um token JWT, por exemplo.

    if (!text || !agentId) {
      return res.status(400).json({ error: 'Os campos text e agentId são obrigatórios.' });
    }

    try {
      // 1. Buscar dados da conversa e contato para saber para quem enviar.
      const query = `
        SELECT
          c.id AS "contactId",
          c.identifiers->>'phone' AS "contactPhone",
          conv.channel_id AS "channelId"
        FROM conversations conv
        JOIN contacts c ON conv.contact_id = c.id
        WHERE conv.id = $1
      `;
      const convRes = await pool.query(query, [conversationId]);

      if (convRes.rowCount === 0) {
        return res.status(404).json({ error: 'Conversa não encontrada.' });
      }
      const { contactPhone, channelId } = convRes.rows[0];

      // 2. Enviar a mensagem pelo canal apropriado (usando o WhatsappService)
      const sentMessage = await whatsappService.sendMessage(channelId, contactPhone, text);

      // 3. Persistir a mensagem de saída no banco
      const savedMessage = await persistenceService.insertMessage({
        conversationId: conversationId,
        channelMessageId: sentMessage.id._serialized,
        direction: 'OUTBOUND',
        content: text,
        sentAt: new Date(sentMessage.timestamp * 1000),
        channelSpecificData: {
          ack: sentMessage.ack, // Status de envio inicial
          agentId: agentId, // Registra qual agente enviou
        }
      });
      
      // Dispara o webhook após o envio e persistência
      await webhookManager.dispatch(convRes.rows[0].accountId, 'MESSAGE_CREATED', {
        message: savedMessage,
        direction: 'OUTBOUND',
        agentId,
      });

      return res.status(201).json({ success: true, messageId: sentMessage.id._serialized });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return res.status(500).json({ error: 'Falha ao enviar mensagem.' });
    }
  }
}

export const messageController = new MessageController();
