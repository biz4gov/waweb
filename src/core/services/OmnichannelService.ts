import { EventEmitter } from 'events';
import type { 
  Channel, 
  ChannelType, 
  ChannelConfiguration, 
  OmnichannelMessage, 
  Contact, 
  Conversation 
} from '../../types/index.js';

// Import channel services
import { whatsappService } from './WhatsappService.js';
import { telegramService } from './TelegramService.js';
import { emailService } from './EmailService.js';
import { aiService } from './AIService.js';

interface ChannelServiceInterface {
  initializeChannel(channelId: string, config: any): Promise<void>;
  sendMessage(channelId: string, ...args: any[]): Promise<any>;
  shutdown(): Promise<void>;
}

class OmnichannelService extends EventEmitter {
  private channels = new Map<string, Channel>();
  private serviceMap = new Map<ChannelType, ChannelServiceInterface>();

  constructor() {
    super();
    this.initializeServices();
  }

  private initializeServices(): void {
    // Map channel types to their respective services
    this.serviceMap.set('whatsapp', whatsappService as any);
    this.serviceMap.set('telegram', telegramService as any);
    this.serviceMap.set('email', emailService as any);
    // webchat would use internal AI service
  }

  public async createChannel(
    accountId: string,
    type: ChannelType,
    name: string,
    configuration: ChannelConfiguration
  ): Promise<Channel> {
    try {
      console.log(`🔗 Creating ${type} channel: ${name}`);

      const channelId = this.generateChannelId();
      const channel: Channel = {
        id: channelId,
        type,
        name,
        accountId,
        configuration,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Initialize the specific service
      await this.initializeChannelService(channel);

      // Store channel
      this.channels.set(channelId, channel);
      channel.isActive = true;

      console.log(`✅ ${type} channel created: ${channelId}`);
      this.emit('channelCreated', channel);

      return channel;
    } catch (error) {
      console.error(`❌ Failed to create ${type} channel:`, error);
      throw error;
    }
  }

  private async initializeChannelService(channel: Channel): Promise<void> {
    const service = this.serviceMap.get(channel.type);
    if (!service) {
      throw new Error(`No service found for channel type: ${channel.type}`);
    }

    switch (channel.type) {
      case 'whatsapp':
        if (channel.configuration.whatsapp?.phoneNumber) {
          await whatsappService.initializeClient(channel.id);
        }
        break;

      case 'telegram':
        if (channel.configuration.telegram?.botToken) {
          await telegramService.initializeBot(
            channel.id,
            channel.configuration.telegram.botToken,
            channel.configuration.telegram.webhookUrl
          );
        }
        break;

      case 'email':
        if (channel.configuration.email) {
          await emailService.addEmailAccount(
            channel.id,
            channel.configuration.email
          );
        }
        break;

      case 'webchat':
        // WebChat uses internal AI - no external service needed
        await this.initializeWebChat(channel);
        break;

      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  private async initializeWebChat(channel: Channel): Promise<void> {
    // Set up AI service for webchat if needed
    if (!aiService.listProviders().length) {
      // Add a default AI provider (you would configure this properly)
      await aiService.addProvider('internal', {
        apiKey: process.env.AI_API_KEY || 'your-api-key',
        baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        isActive: true
      });
    }
    console.log(`💬 WebChat channel initialized: ${channel.id}`);
  }

  public async sendMessage(
    channelId: string,
    recipientId: string,
    content: string,
    options?: any
  ): Promise<any> {
    const channel = this.channels.get(channelId);
    if (!channel || !channel.isActive) {
      throw new Error(`Channel ${channelId} not found or inactive`);
    }

    try {
      let result;

      switch (channel.type) {
        case 'whatsapp':
          result = await whatsappService.sendMessage(channelId, recipientId, content);
          break;

        case 'telegram':
          result = await telegramService.sendMessage(channelId, recipientId, content, options);
          break;

        case 'email':
          const emailOptions = {
            to: recipientId,
            subject: options?.subject || 'Message from Support',
            text: content,
            ...options
          };
          result = await emailService.sendEmail(channelId, emailOptions);
          break;

        case 'webchat':
          result = await this.handleWebChatMessage(channelId, recipientId, content);
          break;

        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }

      console.log(`📤 Message sent via ${channel.type} channel ${channelId}`);
      this.emit('messageSent', { channelId, recipientId, content, result });

      return result;
    } catch (error) {
      console.error(`❌ Failed to send message via ${channel.type}:`, error);
      throw error;
    }
  }

  private async handleWebChatMessage(
    channelId: string,
    conversationId: string,
    userMessage: string
  ): Promise<any> {
    try {
      // Check if message should be escalated to human
      const shouldEscalate = await aiService.shouldEscalateToHuman(conversationId, userMessage);
      
      if (shouldEscalate) {
        return {
          content: 'Vou transferir você para um de nossos atendentes humanos. Aguarde um momento.',
          escalated: true,
          type: 'escalation'
        };
      }

      // Generate AI response
      const aiResponse = await aiService.generateResponse(
        conversationId,
        userMessage,
        'customer-service' // Default prompt
      );

      return {
        content: aiResponse.content,
        type: 'ai_response',
        model: aiResponse.model,
        provider: aiResponse.provider
      };
    } catch (error) {
      console.error('Error handling webchat message:', error);
      return {
        content: 'Desculpe, estou enfrentando dificuldades técnicas. Um atendente humano irá ajudá-lo em breve.',
        type: 'fallback'
      };
    }
  }

  public async processIncomingMessage(
    channelId: string,
    rawMessage: any
  ): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      console.warn(`Received message for unknown channel: ${channelId}`);
      return;
    }

    try {
      // Channel-specific processing is handled by individual services
      // This method is for additional omnichannel processing
      console.log(`📨 Processing incoming message from ${channel.type} channel`);
      
      this.emit('messageReceived', { channelId, channel, rawMessage });
    } catch (error) {
      console.error(`Error processing incoming message from ${channel.type}:`, error);
    }
  }

  public getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  public getChannelsByType(type: ChannelType): Channel[] {
    return Array.from(this.channels.values()).filter(channel => channel.type === type);
  }

  public getChannelsByAccount(accountId: string): Channel[] {
    return Array.from(this.channels.values()).filter(channel => channel.accountId === accountId);
  }

  public getAllChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  public async updateChannelConfiguration(
    channelId: string,
    configuration: Partial<ChannelConfiguration>
  ): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    try {
      // Update configuration
      channel.configuration = { ...channel.configuration, ...configuration };
      channel.updatedAt = new Date();

      // Reinitialize if needed
      if (channel.isActive) {
        await this.deactivateChannel(channelId);
        await this.activateChannel(channelId);
      }

      console.log(`🔄 Channel configuration updated: ${channelId}`);
      this.emit('channelUpdated', channel);
    } catch (error) {
      console.error(`Failed to update channel ${channelId}:`, error);
      throw error;
    }
  }

  public async activateChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (channel.isActive) {
      console.warn(`Channel ${channelId} is already active`);
      return;
    }

    await this.initializeChannelService(channel);
    channel.isActive = true;
    channel.updatedAt = new Date();

    console.log(`✅ Channel activated: ${channelId}`);
    this.emit('channelActivated', channel);
  }

  public async deactivateChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!channel.isActive) {
      console.warn(`Channel ${channelId} is already inactive`);
      return;
    }

    // Stop the specific service
    const service = this.serviceMap.get(channel.type);
    if (service && 'stopChannel' in service) {
      await (service as any).stopChannel(channelId);
    }

    channel.isActive = false;
    channel.updatedAt = new Date();

    console.log(`⏹️ Channel deactivated: ${channelId}`);
    this.emit('channelDeactivated', channel);
  }

  public async deleteChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (channel.isActive) {
      await this.deactivateChannel(channelId);
    }

    this.channels.delete(channelId);
    console.log(`🗑️ Channel deleted: ${channelId}`);
    this.emit('channelDeleted', channelId);
  }

  private generateChannelId(): string {
    return `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getChannelStats() {
    const stats = {
      total: this.channels.size,
      active: 0,
      byType: {} as Record<ChannelType, number>
    };

    for (const channel of this.channels.values()) {
      if (channel.isActive) {
        stats.active++;
      }
      
      stats.byType[channel.type] = (stats.byType[channel.type] || 0) + 1;
    }

    return stats;
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Omnichannel service...');
    
    const shutdownPromises = [];
    
    // Shutdown all services
    for (const service of this.serviceMap.values()) {
      shutdownPromises.push(service.shutdown());
    }
    
    // Shutdown AI service
    shutdownPromises.push(aiService.shutdown());
    
    await Promise.all(shutdownPromises);
    
    this.channels.clear();
    console.log('✅ Omnichannel service shutdown complete');
  }
}

export const omnichannelService = new OmnichannelService();