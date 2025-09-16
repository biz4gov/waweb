// Versão 7
import { Request, Response } from 'express';
import { persistenceService } from '../../core/services/PersistenceService';

class WebhookController {
  public async create(req: Request, res: Response): Promise<Response> {
    const { event_type, target_url } = req.body;
    const accountId = req.user!.accountId; // Exclamacão (!) pois o middleware garante que existe

    if (!event_type || !target_url) {
      return res.status(400).json({ error: 'event_type e target_url são obrigatórios.' });
    }

    try {
      const webhook = await persistenceService.createWebhook(accountId, event_type, target_url);
      return res.status(201).json(webhook);
    } catch (error) {
      console.error('Erro ao criar webhook:', error);
      return res.status(500).json({ error: 'Falha ao criar webhook.' });
    }
  }

  public async list(req: Request, res: Response): Promise<Response> {
    const accountId = req.user!.accountId;
    const webhooks = await persistenceService.listWebhooksByAccount(accountId);
    return res.status(200).json(webhooks);
  }

  public async update(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { target_url, is_active } = req.body;
    const accountId = req.user!.accountId;

    const updatedWebhook = await persistenceService.updateWebhook(id, accountId, {
      targetUrl: target_url,
      isActive: is_active,
    });

    if (!updatedWebhook) {
      return res.status(404).json({ error: 'Webhook não encontrado ou não pertence à sua conta.' });
    }
    return res.status(200).json(updatedWebhook);
  }

  public async delete(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const accountId = req.user!.accountId;

    const success = await persistenceService.deleteWebhook(id, accountId);
    if (!success) {
      return res.status(404).json({ error: 'Webhook não encontrado ou não pertence à sua conta.' });
    }
    return res.status(204).send(); // 204 No Content é a resposta padrão para delete com sucesso
  }
}

export const webhookController = new WebhookController();