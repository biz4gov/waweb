// Versão 2
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { persistenceService } from './PersistenceService';
import { routingService } from './RoutingService';
import { webhookManager } from '../managers/WebhookManager';
puppeteer.use(StealthPlugin());
// Usamos um Map para gerenciar múltiplos clientes, onde a chave é o accountId.
const clients = new Map();
// Mock: Em um sistema real, esses IDs viriam do banco ou de uma requisição autenticada.
// Por enquanto, vamos fixá-los para o teste.
const MOCK_ACCOUNT_ID = 'a2b1f3c5-e8d7-4a6b-9c1d-0f2e3d4c5b6a';
const MOCK_CHANNEL_ID = 'b3c2g4d6-f9e8-5b7c-a1d2-1g3f4e5d6c7b';
class WhatsappService {
    initializeClient = async (accountId) => {
        console.log(`Iniciando cliente para a conta: ${accountId}`);
        // Prevenção de erro comum: Não inicializar o mesmo cliente duas vezes.
        if (clients.has(accountId)) {
            console.warn(`Cliente para a conta ${accountId} já está inicializado.`);
            // O ideal aqui seria verificar o status do cliente antes de retornar.
            // Por agora, vamos apenas evitar a reinicialização.
            return;
        }
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-setuid-sandbox'
            ]
        });
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: accountId }),
            puppeteer: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ],
                headless: true
            }
        });
        client.on('qr', (qr) => {
            console.log(`[${accountId}] QR Code recebido`);
            // Armazenamos o QR code no nosso objeto de cliente para ser recuperado pela API.
            const clientEntry = clients.get(accountId);
            if (clientEntry) {
                clientEntry.qrCode = qr;
            }
        });
        client.on('ready', () => {
            console.log(`[${accountId}] Cliente está pronto!`);
            const clientEntry = clients.get(accountId);
            if (clientEntry) {
                // Limpamos o QR Code depois que o cliente está pronto.
                clientEntry.qrCode = undefined;
            }
        });
        client.on('disconnected', (reason) => {
            console.log(`[${accountId}] Cliente foi desconectado. Motivo: ${reason}`);
            // Removemos o cliente do gerenciador para permitir uma nova inicialização.
            clients.delete(accountId);
            // Aqui, futuramente, poderíamos adicionar uma lógica de notificação via webhook.
        });
        // Adicionamos o cliente ao nosso Map antes de inicializar.
        clients.set(accountId, { client });
        // NOVO: Listener de mensagens para persistência
        client.on('message', this.handleIncomingMessage);
        await client.initialize();
    };
    // Dica de Ouro: Sempre que um método de classe for usado como callback de evento,
    // use uma arrow function para garantir que o 'this' se refira à instância da classe.
    handleIncomingMessage = async (message) => {
        try {
            // Passo 0 (ATUALIZADO): Usar o motor de roteamento para decidir o agente
            const agentId = await routingService.getAssignedAgent(MOCK_ACCOUNT_ID, message.from, // Aqui usaríamos o ID do contato
            MOCK_CHANNEL_ID);
            // Passo 1: Encontrar ou criar o contato
            const contact = await persistenceService.findOrCreateContact(MOCK_ACCOUNT_ID, message.from);
            // Passo 2: Encontrar ou criar a conversa
            const conversation = await persistenceService.findOrCreateConversation(MOCK_ACCOUNT_ID, MOCK_CHANNEL_ID, contact.id, agentId);
            // NOVO: Atualiza o timestamp do agente que recebeu a conversa
            await persistenceService.updateAgentAssignmentTimestamp(agentId);
            // Passo 3: Inserir a mensagem
            const insertedMessage = await persistenceService.insertMessage({
                conversationId: conversation.id,
                channelMessageId: message.id._serialized,
                direction: 'INBOUND',
                content: message.body,
                sentAt: new Date(message.timestamp * 1000), // O timestamp do WA vem em segundos
                channelSpecificData: {
                    fromMe: message.fromMe,
                    hasMedia: message.hasMedia,
                }
            });
            console.log(`Mensagem ${insertedMessage.id} salva no banco de dados.`);
            // Dispara o Webhook após salvar no banco.
            await webhookManager.dispatch(MOCK_ACCOUNT_ID, 'MESSAGE_CREATED', {
                message: insertedMessage, // O objeto da mensagem que foi salva
                conversation: conversation,
                contact: contact,
                direction: 'INBOUND'
            });
        }
        catch (error) {
            console.error('Erro ao persistir a mensagem:', error);
        }
    };
    /**
     * NOVO MÉTODO: Envia uma mensagem para um contato através de um canal.
     */
    async sendMessage(channelId, contactPhone, text) {
        // Em um sistema multi-client, buscaríamos o cliente correto associado ao channelId.
        // Por simplicidade, vamos usar o primeiro cliente do nosso Map.
        const client = clients.values().next().value?.client;
        if (!client) {
            throw new Error('Nenhum cliente de WhatsApp está ativo para enviar a mensagem.');
        }
        // O whatsapp-web.js usa o formato [numero]@c.us
        const chatId = `${contactPhone.replace(/\D/g, '')}@c.us`;
        console.log(`[SendMessage] Enviando para ${chatId} via cliente...`);
        const sentMessage = await client.sendMessage(chatId, text);
        return sentMessage;
    }
    /**
   * NOVO: Retorna o status de todos os clientes de WhatsApp gerenciados.
   */
    async getClientsStatus() {
        const statuses = [];
        for (const [accountId, clientEntry] of clients.entries()) {
            try {
                // O método getState() pode retornar null se não estiver totalmente conectado
                const state = await clientEntry.client.getState();
                statuses.push({ accountId, state, status: 'CONNECTED' });
            }
            catch (error) {
                statuses.push({ accountId, state: 'DISCONNECTED', status: 'ERROR' });
            }
        }
        return {
            connected_clients: statuses.length,
            details: statuses
        };
    }
    getQRCode = async (accountId) => {
        const clientEntry = clients.get(accountId);
        if (clientEntry && clientEntry.qrCode) {
            // Convertendo o QR Code (string) para uma imagem PNG em base64.
            // Isso facilita o envio na resposta HTTP.
            return qrcode.toDataURL(clientEntry.qrCode);
        }
        return null;
    };
    getClient(accountId) {
        return clients.get(accountId)?.client;
    }
}
export const whatsappService = new WhatsappService();
//# sourceMappingURL=WhatsappService.js.map