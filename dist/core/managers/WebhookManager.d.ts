declare class WebhookManager {
    /**
     * Dispara um evento para ser processado e enviado via webhook.
     * @param accountId O ID da conta dona do evento.
     * @param eventType O tipo do evento (ex: 'MESSAGE_CREATED').
     * @param data O payload do evento.
     */
    dispatch(accountId: string, eventType: string, data: object): Promise<void>;
}
export declare const webhookManager: WebhookManager;
export {};
