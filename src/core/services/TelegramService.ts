import { EventEmitter } from 'events';
import axios from 'axios';
import type { 
  Channel, 
  Contact, 
  Conversation, 
  OmnichannelMessage 
} from '../../types/index.js';

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  voice?: TelegramVoice;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

interface BotInfo {
  id: string;
  token: string;
  username: string;
  isActive: boolean;
  webhookUrl?: string;
}

class TelegramService extends EventEmitter {
  private bots = new Map<string, BotInfo>();
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private apiUrl = 'https://api.telegram.org';

  constructor() {
    super();
    this.setMaxListeners(1000);
  }

  public async initializeBot(channelId: string, botToken: string, webhookUrl?: string): Promise<void> {
    try {
      console.log(`🤖 Initializing Telegram bot for channel: ${channelId}`);

      // Get bot info
      const botInfo = await this.getBotInfo(botToken);
      
      this.bots.set(channelId, {
        id: botInfo.id.toString(),
        token: botToken,
        username: botInfo.username,
        isActive: true,
        webhookUrl
      });

      if (webhookUrl) {
        await this.setWebhook(botToken, webhookUrl);
        console.log(`✅ Webhook set for bot @${botInfo.username}`);
      } else {
        this.startPolling(channelId, botToken);
        console.log(`✅ Polling started for bot @${botInfo.username}`);
      }

      this.emit('botReady', channelId, botInfo);
    } catch (error) {
      console.error(`❌ Failed to initialize Telegram bot for channel ${channelId}:`, error);
      throw error;
    }
  }

  private async getBotInfo(botToken: string): Promise<any> {
    const response = await axios.get(`${this.apiUrl}/bot${botToken}/getMe`);
    if (!response.data.ok) {
      throw new Error(`Failed to get bot info: ${response.data.description}`);
    }
    return response.data.result;
  }

  private async setWebhook(botToken: string, webhookUrl: string): Promise<void> {
    const response = await axios.post(`${this.apiUrl}/bot${botToken}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query']
    });
    
    if (!response.data.ok) {
      throw new Error(`Failed to set webhook: ${response.data.description}`);
    }
  }

  private startPolling(channelId: string, botToken: string): void {
    let lastUpdateId = 0;

    const poll = async () => {
      try {
        const response = await axios.get(`${this.apiUrl}/bot${botToken}/getUpdates`, {
          params: {
            offset: lastUpdateId + 1,
            timeout: 30,
            allowed_updates: ['message', 'callback_query']
          }
        });

        if (response.data.ok && response.data.result.length > 0) {
          for (const update of response.data.result) {
            lastUpdateId = update.update_id;
            await this.processUpdate(channelId, update);
          }
        }
      } catch (error) {
        console.error(`Telegram polling error for channel ${channelId}:`, error);
      }
    };

    const intervalId = setInterval(poll, 1000);
    this.pollingIntervals.set(channelId, intervalId);
  }

  public async processWebhookUpdate(channelId: string, update: TelegramUpdate): Promise<void> {
    await this.processUpdate(channelId, update);
  }

  private async processUpdate(channelId: string, update: TelegramUpdate): Promise<void> {
    try {
      if (update.message) {
        await this.handleMessage(channelId, update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(channelId, update.callback_query);
      }
    } catch (error) {
      console.error('Error processing Telegram update:', error);
    }
  }

  private async handleMessage(channelId: string, message: TelegramMessage): Promise<void> {
    try {
      // Lazy load dependencies
      const { persistenceService } = await import('./PersistenceService.js');
      const { routingService } = await import('./RoutingService.js');
      const { webhookManager } = await import('../managers/WebhookManager.js');

      const accountId = await this.getAccountIdFromChannel(channelId);
      const contactExternalId = message.from.id.toString();

      // Find or create contact
      const contact = await persistenceService.findOrCreateContact(
        accountId,
        contactExternalId,
        {
          name: `${message.from.first_name} ${message.from.last_name || ''}`.trim(),
          username: message.from.username,
          platform: 'telegram'
        }
      );

      // Get assigned agent
      const agentId = await routingService.getAssignedAgent(
        accountId,
        contact.id,
        channelId
      );

      // Find or create conversation
      const conversation = await persistenceService.findOrCreateConversation(
        accountId,
        channelId,
        contact.id,
        agentId
      );

      // Determine content and type
      let content = '';
      let contentType = 'text';
      const channelSpecificData: any = {
        messageId: message.message_id,
        chatId: message.chat.id,
        userId: message.from.id,
        username: message.from.username
      };

      if (message.text) {
        content = message.text;
        contentType = 'text';
      } else if (message.photo) {
        content = 'Photo';
        contentType = 'image';
        channelSpecificData.fileId = message.photo[message.photo.length - 1].file_id;
      } else if (message.document) {
        content = message.document.file_name || 'Document';
        contentType = 'file';
        channelSpecificData.fileId = message.document.file_id;
        channelSpecificData.mimeType = message.document.mime_type;
      } else if (message.voice) {
        content = 'Voice message';
        contentType = 'audio';
        channelSpecificData.fileId = message.voice.file_id;
        channelSpecificData.duration = message.voice.duration;
      }

      // Insert message
      const insertedMessage = await persistenceService.insertMessage({
        conversationId: conversation.id,
        channelMessageId: message.message_id.toString(),
        direction: 'inbound',
        content,
        contentType: contentType as any,
        sentAt: new Date(message.date * 1000),
        channelSpecificData
      });

      console.log(`📱 Telegram message processed: ${insertedMessage.id}`);

      // Dispatch webhook
      await webhookManager.dispatch(accountId, 'MESSAGE_CREATED', {
        message: insertedMessage,
        conversation,
        contact,
        direction: 'inbound',
        channel: 'telegram'
      });

    } catch (error) {
      console.error('Error handling Telegram message:', error);
    }
  }

  private async handleCallbackQuery(channelId: string, callbackQuery: TelegramCallbackQuery): Promise<void> {
    // Handle inline keyboard button presses
    console.log('Callback query received:', callbackQuery.data);
    
    const bot = this.bots.get(channelId);
    if (bot) {
      // Answer the callback query to remove loading state
      await axios.post(`${this.apiUrl}/bot${bot.token}/answerCallbackQuery`, {
        callback_query_id: callbackQuery.id,
        text: 'Received!'
      });
    }
  }

  public async sendMessage(
    channelId: string, 
    chatId: string, 
    text: string, 
    options?: any
  ): Promise<any> {
    const bot = this.bots.get(channelId);
    if (!bot || !bot.isActive) {
      throw new Error(`No active Telegram bot found for channel ${channelId}`);
    }

    try {
      const response = await axios.post(`${this.apiUrl}/bot${bot.token}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      });

      if (!response.data.ok) {
        throw new Error(`Failed to send message: ${response.data.description}`);
      }

      console.log(`📤 Telegram message sent to ${chatId}`);
      return response.data.result;
    } catch (error) {
      console.error(`❌ Failed to send Telegram message:`, error);
      throw error;
    }
  }

  public async sendPhoto(
    channelId: string, 
    chatId: string, 
    photo: string, 
    caption?: string
  ): Promise<any> {
    const bot = this.bots.get(channelId);
    if (!bot || !bot.isActive) {
      throw new Error(`No active Telegram bot found for channel ${channelId}`);
    }

    try {
      const response = await axios.post(`${this.apiUrl}/bot${bot.token}/sendPhoto`, {
        chat_id: chatId,
        photo,
        caption,
        parse_mode: 'HTML'
      });

      if (!response.data.ok) {
        throw new Error(`Failed to send photo: ${response.data.description}`);
      }

      return response.data.result;
    } catch (error) {
      console.error(`❌ Failed to send Telegram photo:`, error);
      throw error;
    }
  }

  public async getFileUrl(channelId: string, fileId: string): Promise<string> {
    const bot = this.bots.get(channelId);
    if (!bot) {
      throw new Error(`No bot found for channel ${channelId}`);
    }

    const response = await axios.get(`${this.apiUrl}/bot${bot.token}/getFile`, {
      params: { file_id: fileId }
    });

    if (!response.data.ok) {
      throw new Error(`Failed to get file: ${response.data.description}`);
    }

    const filePath = response.data.result.file_path;
    return `${this.apiUrl}/file/bot${bot.token}/${filePath}`;
  }

  private async getAccountIdFromChannel(channelId: string): Promise<string> {
    // This would typically query the database to get the account ID
    // For now, return a mock value
    return 'default-account-id';
  }

  public getBotInfo(channelId: string): BotInfo | undefined {
    return this.bots.get(channelId);
  }

  public async stopBot(channelId: string): Promise<void> {
    const bot = this.bots.get(channelId);
    if (bot) {
      bot.isActive = false;
      
      // Stop polling if active
      const interval = this.pollingIntervals.get(channelId);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(channelId);
      }

      // Remove webhook
      if (bot.webhookUrl) {
        await axios.post(`${this.apiUrl}/bot${bot.token}/deleteWebhook`);
      }

      this.bots.delete(channelId);
      console.log(`🛑 Telegram bot stopped for channel: ${channelId}`);
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Telegram service...');
    
    const shutdownPromises = [];
    for (const [channelId] of this.bots) {
      shutdownPromises.push(this.stopBot(channelId));
    }
    
    await Promise.all(shutdownPromises);
    console.log('✅ Telegram service shutdown complete');
  }
}

export const telegramService = new TelegramService();