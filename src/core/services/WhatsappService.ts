import { Client, LocalAuth } from 'whatsapp-web.js';
import type { Message as WAMessage } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { EventEmitter } from 'events';

// Performance optimizations
class OptimizedMap<K, V> extends Map<K, V> {
  private maxSize: number;
  
  constructor(maxSize = 1000) {
    super();
    this.maxSize = maxSize;
  }
  
  set(key: K, value: V): this {
    if (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      }
    }
    return super.set(key, value);
  }
}

interface ClientInfo {
  client: Client;
  qrCode?: string;
  lastActivity: Date;
  status: 'initializing' | 'ready' | 'disconnected';
}

interface MessageCache {
  id: string;
  timestamp: number;
  processed: boolean;
}

class WhatsappService extends EventEmitter {
  private clients = new OptimizedMap<string, ClientInfo>(100);
  private messageCache = new OptimizedMap<string, MessageCache>(10000);
  private connectionPool = new Map<string, Promise<void>>();
  
  // Performance monitoring
  private metrics = {
    messagesProcessed: 0,
    connectionsActive: 0,
    errorsCount: 0
  };

  constructor() {
    super();
    this.setMaxListeners(1000); // Increase for high concurrency
    this.startCleanupInterval();
  }

  public async initializeClient(accountId: string): Promise<void> {
    // Prevent duplicate initializations
    if (this.connectionPool.has(accountId)) {
      return this.connectionPool.get(accountId);
    }

    const initPromise = this._performInitialization(accountId);
    this.connectionPool.set(accountId, initPromise);
    
    try {
      await initPromise;
    } finally {
      this.connectionPool.delete(accountId);
    }
  }

  private async _performInitialization(accountId: string): Promise<void> {
    console.log(`🔄 Initializing client for account: ${accountId}`);

    if (this.clients.has(accountId)) {
      const clientInfo = this.clients.get(accountId)!;
      if (clientInfo.status === 'ready') {
        console.warn(`⚠️ Client for account ${accountId} already ready`);
        return;
      }
    }

    const client = new Client({
      authStrategy: new LocalAuth({ 
        clientId: accountId,
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-software-rasterizer'
        ],
        // Performance optimizations
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
      },
      // Reduce memory usage
      webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${process.env.WA_VERSION || '2.2412.54'}.html`,
      }
    });

    const clientInfo: ClientInfo = {
      client,
      lastActivity: new Date(),
      status: 'initializing'
    };

    this.clients.set(accountId, clientInfo);
    this.metrics.connectionsActive++;

    // Optimized event handlers
    client.on('qr', (qr) => {
      console.log(`📱 QR Code received for ${accountId}`);
      clientInfo.qrCode = qr;
      clientInfo.lastActivity = new Date();
    });

    client.on('ready', () => {
      console.log(`✅ Client ready for ${accountId}`);
      clientInfo.status = 'ready';
      clientInfo.qrCode = undefined;
      clientInfo.lastActivity = new Date();
      this.emit('clientReady', accountId);
    });
    
    client.on('disconnected', (reason) => {
      console.log(`❌ Client disconnected for ${accountId}. Reason: ${reason}`);
      clientInfo.status = 'disconnected';
      this.metrics.connectionsActive--;
      this.emit('clientDisconnected', accountId, reason);
    });

    // Optimized message handler with caching
    client.on('message', (message: WAMessage) => {
      this.handleIncomingMessageOptimized(message, accountId);
    });

    try {
      await client.initialize();
    } catch (error) {
      this.metrics.errorsCount++;
      console.error(`❌ Failed to initialize client for ${accountId}:`, error);
      this.clients.delete(accountId);
      this.metrics.connectionsActive--;
      throw error;
    }
  }

  private handleIncomingMessageOptimized = async (message: WAMessage, accountId: string): Promise<void> => {
    const messageId = message.id._serialized;
    
    // Duplicate message detection
    if (this.messageCache.has(messageId)) {
      return;
    }

    // Cache the message
    this.messageCache.set(messageId, {
      id: messageId,
      timestamp: Date.now(),
      processed: false
    });

    try {
      this.metrics.messagesProcessed++;
      
      // Process message asynchronously to avoid blocking
      setImmediate(async () => {
        try {
          await this.processMessage(message, accountId);
          
          // Mark as processed
          const cached = this.messageCache.get(messageId);
          if (cached) {
            cached.processed = true;
          }
        } catch (error) {
          this.metrics.errorsCount++;
          console.error('Error processing message:', error);
        }
      });
    } catch (error) {
      this.metrics.errorsCount++;
      console.error('Error in message handler:', error);
    }
  };

  private async processMessage(message: WAMessage, accountId: string): Promise<void> {
    // Lazy load dependencies for better performance
    const { persistenceService } = await import('./PersistenceService.js');
    const { routingService } = await import('./RoutingService.js');
    const { webhookManager } = await import('../managers/WebhookManager.js');

    const MOCK_CHANNEL_ID = 'default-channel';

    try {
      // Get assigned agent
      const agentId = await routingService.getAssignedAgent(
        accountId,
        message.from,
        MOCK_CHANNEL_ID
      );

      // Find or create contact
      const contact = await persistenceService.findOrCreateContact(
        accountId,
        message.from
      );

      // Find or create conversation
      const conversation = await persistenceService.findOrCreateConversation(
        accountId,
        MOCK_CHANNEL_ID,
        contact.id,
        agentId
      );

      // Insert message
      const insertedMessage = await persistenceService.insertMessage({
        conversationId: conversation.id,
        channelMessageId: message.id._serialized,
        direction: 'INBOUND',
        content: message.body,
        sentAt: new Date(message.timestamp * 1000),
        channelSpecificData: {
          fromMe: message.fromMe,
          hasMedia: message.hasMedia,
        }
      });

      // Dispatch webhook asynchronously
      webhookManager.dispatch(accountId, 'MESSAGE_CREATED', {
        message: insertedMessage,
        conversation,
        contact,
        direction: 'INBOUND'
      }).catch(error => {
        console.error('Webhook dispatch error:', error);
      });

    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  public async sendMessage(channelId: string, contactPhone: string, text: string): Promise<WAMessage> {
    const client = this.getReadyClient();
    if (!client) {
      throw new Error('No active WhatsApp client available');
    }
    
    const chatId = `${contactPhone.replace(/\D/g, '')}@c.us`;
    
    try {
      const sentMessage = await client.sendMessage(chatId, text);
      console.log(`📤 Message sent to ${chatId}`);
      return sentMessage;
    } catch (error) {
      this.metrics.errorsCount++;
      console.error(`❌ Failed to send message to ${chatId}:`, error);
      throw error;
    }
  }

  public async getQRCode(accountId: string): Promise<string | null> {
    const clientInfo = this.clients.get(accountId);
    if (clientInfo?.qrCode) {
      try {
        return await qrcode.toDataURL(clientInfo.qrCode);
      } catch (error) {
        console.error('Error generating QR code:', error);
        return null;
      }
    }
    return null;
  }

  public getClient(accountId: string): Client | undefined {
    return this.clients.get(accountId)?.client;
  }

  private getReadyClient(): Client | undefined {
    for (const [, clientInfo] of this.clients) {
      if (clientInfo.status === 'ready') {
        return clientInfo.client;
      }
    }
    return undefined;
  }

  // Cleanup inactive clients
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

      for (const [accountId, clientInfo] of this.clients) {
        if (now - clientInfo.lastActivity.getTime() > maxInactiveTime) {
          console.log(`🧹 Cleaning up inactive client: ${accountId}`);
          this.clients.delete(accountId);
          this.metrics.connectionsActive--;
        }
      }

      // Cleanup old message cache
      for (const [messageId, messageInfo] of this.messageCache) {
        if (now - messageInfo.timestamp > 60 * 60 * 1000) { // 1 hour
          this.messageCache.delete(messageId);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  public getMetrics() {
    return {
      ...this.metrics,
      activeClients: this.clients.size,
      cachedMessages: this.messageCache.size
    };
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down WhatsApp service...');
    
    const shutdownPromises = [];
    for (const [accountId, clientInfo] of this.clients) {
      if
