declare class PersistenceService {
    findOrCreateContact(accountId: string, phoneNumber: string, name?: string): Promise<any>;
    updateAgentAssignmentTimestamp(agentId: string): Promise<void>;
    findOrCreateConversation(accountId: string, channelId: string, contactId: string, agentId: string): Promise<any>;
    insertMessage(data: {
        conversationId: string;
        channelMessageId: string;
        direction: 'INBOUND' | 'OUTBOUND';
        content: string | null;
        sentAt: Date;
        attachment?: object;
        channelSpecificData?: object;
    }): Promise<any>;
    createWebhook(accountId: string, eventType: string, targetUrl: string): Promise<any>;
    listWebhooksByAccount(accountId: string): Promise<any[]>;
    findWebhookById(webhookId: string, accountId: string): Promise<any>;
    updateWebhook(webhookId: string, accountId: string, data: {
        targetUrl?: string;
        isActive?: boolean;
    }): Promise<any>;
    deleteWebhook(webhookId: string, accountId: string): Promise<boolean>;
    findAgentByEmail(accountId: string, email: string): Promise<any>;
    createAgent(data: {
        accountId: string;
        name: string;
        email: string;
        password_plain: string;
    }): Promise<any>;
    getDatabaseStatus(): Promise<{
        status: string;
        message: any;
    }>;
    getMessageCounts(): Promise<{
        total: number;
        last_24_hours: number;
        last_hour: number;
    } | null>;
}
export declare const persistenceService: PersistenceService;
export {};
