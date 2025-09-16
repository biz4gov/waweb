import { Client } from 'whatsapp-web.js';
import type { Message as WAMessage } from 'whatsapp-web.js';
interface Message extends WAMessage {
    id: {
        _serialized: string;
    };
    timestamp: number;
    from: string;
    body: string;
    fromMe: boolean;
    hasMedia: boolean;
}
declare class WhatsappService {
    initializeClient: (accountId: string) => Promise<void>;
    private handleIncomingMessage;
    /**
     * NOVO MÉTODO: Envia uma mensagem para um contato através de um canal.
     */
    sendMessage(channelId: string, contactPhone: string, text: string): Promise<Message>;
    /**
   * NOVO: Retorna o status de todos os clientes de WhatsApp gerenciados.
   */
    getClientsStatus(): Promise<{
        connected_clients: number;
        details: {
            accountId: string;
            state: string;
            status: string;
        }[];
    }>;
    getQRCode: (accountId: string) => Promise<string | null>;
    getClient(accountId: string): Client | undefined;
}
export declare const whatsappService: WhatsappService;
export {};
