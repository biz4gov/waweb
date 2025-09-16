import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { AIProviderManager, type AIProvider, type ChatMessage, type AIResponse } from './AIProviderManager.js';
import type { AIPrompt, AIConversationContext } from '../../types/index.js';

interface AIConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

class AIService extends EventEmitter {
  private providerManager: AIProviderManager;
  private prompts = new Map<string, AIPrompt>();
  private conversations = new Map<string, AIConversationContext>();
  private promptsDirectory = './prompts';

  constructor() {
    super();
    this.providerManager = new AIProviderManager();
    this.initializePromptsDirectory();
    this.loadPrompts();
  }

  private async initializePromptsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.promptsDirectory, { recursive: true });
      
  // Create default DiDi prompt if it doesn't exist
  const didiPromptPath = path.join(this.promptsDirectory, 'didi-biz4gov.md');
      
      try {
  await fs.access(didiPromptPath);
      } catch {
  console.log('DiDi prompt already exists, skipping creation');
      }

      // Create default customer service prompt
      const defaultPromptPath = path.join(this.promptsDirectory, 'customer-service.md');
      
      try {
        await fs.access(defaultPromptPath);
      } catch {
        await this.createDefaultPrompt(defaultPromptPath);
      }
    } catch (error) {
      console.error('Failed to initialize prompts directory:', error);
    }
  }

  private async createDefaultPrompt(filePath: string): Promise<void> {
    const defaultPrompt = `# Assistente de Atendimento ao Cliente

## Identidade
Você é um assistente virtual especializado em atendimento ao cliente. Seu nome é Alex e você trabalha para uma empresa de tecnologia inovadora.

## Personalidade
- Profissional, mas amigável
- Paciente e empático
- Proativo em oferecer soluções
- Sempre disposto a ajudar

## Diretrizes de Atendimento

### Saudação
- Sempre cumprimente o cliente de forma cordial
- Identifique-se como Alex, o assistente virtual
- Pergunte como pode ajudar

### Durante a Conversa
- Mantenha um tom respeitoso e profissional
- Faça perguntas esclarecedoras quando necessário
- Ofereça soluções práticas e claras
- Se não souber algo, seja honesto e ofereça alternativas

### Limitações
- Não forneça informações sensíveis da empresa
- Não faça promessas que não pode cumprir
- Sempre escale para um atendente humano quando necessário

### Escalação para Humano
Escale para um atendente humano nos seguintes casos:
- Reclamações complexas ou graves
- Solicitações que envolvam dados sensíveis
- Quando o cliente especificamente solicitar
- Problemas técnicos que você não consegue resolver

## Configurações
- Temperatura: 0.7
- Máximo de tokens: 500
- Sempre responda em português brasileiro
`;

    await fs.writeFile(filePath, defaultPrompt, 'utf-8');
    console.log('✅ Default customer service prompt created');
  }

  private async loadPrompts(): Promise<void> {
    try {
      const files = await fs.readdir(this.promptsDirectory);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      for (const file of markdownFiles) {
        await this.loadPromptFromFile(file);
      }

      console.log(`📝 Loaded ${markdownFiles.length} AI prompts`);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }

  private async loadPromptFromFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.promptsDirectory, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      
      const promptId = path.basename(filename, '.md');
      const prompt = this.parsePromptFile(promptId, content);
      
      this.prompts.set(promptId, prompt);
      console.log(`✅ Loaded prompt: ${promptId}`);
    } catch (error) {
      console.error(`Failed to load prompt ${filename}:`, error);
    }
  }

  private parsePromptFile(id: string, content: string): AIPrompt {
    // Extract title from first # heading
    const titleMatch = content.match(/^# (.+)$/m);
    const name = titleMatch ? titleMatch[1] : id;

    // Extract configuration if present
    let temperature = 0.7;
    let maxTokens = 500;

    const tempMatch = content.match(/Temperatura:\s*([\d.]+)/i);
    if (tempMatch) {
      temperature = parseFloat(tempMatch[1]);
    }

    const tokensMatch = content.match(/tokens:\s*(\d+)/i);
    if (tokensMatch) {
      maxTokens = parseInt(tokensMatch[1]);
    }

    return {
      id,
      name,
      systemPrompt: content,
      temperature,
      maxTokens,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  public async addProvider(name: string, config: Omit<AIProvider, 'name'>): Promise<void> {
    this.providerManager.addProvider(name, config);
    console.log(`🤖 AI provider added: ${name}`);
  }

  public async generateResponse(
    conversationId: string,
    userMessage: string,
  promptId = 'didi-biz4gov',
    providerId?: string
  ): Promise<AIResponse> {
    try {
      const prompt = this.prompts.get(promptId);
      if (!prompt || !prompt.isActive) {
        throw new Error(`Prompt ${promptId} not found or inactive`);
      }

      // Use default provider if not specified
      if (!providerId) {
        providerId = this.providerManager.getDefaultProvider();
      }

      if (!providerId) {
        throw new Error('No active AI provider available');
      }

      // Get or create conversation context
      let context = this.conversations.get(conversationId);
      if (!context) {
        context = {
          conversationId,
          messages: [
            {
              role: 'system',
              content: prompt.systemPrompt.replace('{{ $now }}', new Date().toLocaleString('pt-BR')),
              timestamp: new Date()
            }
          ],
          currentPromptId: promptId,
          metadata: {}
        };
        this.conversations.set(conversationId, context);
      }

      // Add user message to context
      context.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Convert to ChatMessage format for provider
      const chatMessages: ChatMessage[] = context.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Generate AI response
      const response = await this.providerManager.generateResponse(
        providerId,
        chatMessages,
        {
          temperature: prompt.temperature,
          maxTokens: prompt.maxTokens
        }
      );

      // Add AI response to context
      context.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      });

      // Limit conversation history to prevent token overflow
      if (context.messages.length > 20) {
        context.messages = [
          context.messages[0], // Keep system prompt
          ...context.messages.slice(-19) // Keep last 19 messages
        ];
      }

      console.log(`🤖 AI response generated for conversation ${conversationId} using ${response.provider}`);
      return response;

    } catch (error) {
      console.error('Failed to generate AI response:', error);
      throw error;
    }
  }

  public async shouldEscalateToHuman(conversationId: string, message: string): Promise<boolean> {
    // Simple keyword-based escalation logic
    const escalationKeywords = [
      'falar com atendente',
      'atendente humano',
      'gerente',
      'supervisor',
      'reclamação',
      'cancelar',
      'reembolso',
      'advogado',
      'processo',
      'muito irritado',
      'péssimo atendimento',
      'call.received'
    ];

    const lowerMessage = message.toLowerCase();
    const hasEscalationKeyword = escalationKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    if (hasEscalationKeyword) {
      console.log(`🚨 Escalation triggered for conversation ${conversationId}`);
      return true;
    }

    // Check conversation length - escalate after many back-and-forth messages
    const context = this.conversations.get(conversationId);
    if (context && context.messages.length > 15) {
      console.log(`🚨 Escalation triggered due to long conversation ${conversationId}`);
      return true;
    }

    return false;
  }

  public async reloadPrompt(promptId: string): Promise<void> {
    const filename = `${promptId}.md`;
    await this.loadPromptFromFile(filename);
    console.log(`🔄 Reloaded prompt: ${promptId}`);
  }

  public async reloadAllPrompts(): Promise<void> {
    this.prompts.clear();
    await this.loadPrompts();
    console.log('🔄 All prompts reloaded');
  }

  public listPrompts(): AIPrompt[] {
    return Array.from(this.prompts.values());
  }

  public getPrompt(promptId: string): AIPrompt | undefined {
    return this.prompts.get(promptId);
  }

  public listProviders(): AIProvider[] {
    return this.providerManager.listProviders();
  }

  public getConversationContext(conversationId: string): AIConversationContext | undefined {
    return this.conversations.get(conversationId);
  }

  public clearConversationContext(conversationId: string): void {
    this.conversations.delete(conversationId);
    console.log(`🗑️ Cleared conversation context: ${conversationId}`);
  }

  public async testProvider(providerId: string): Promise<boolean> {
    return this.providerManager.testProvider(providerId);
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down AI service...');
    this.conversations.clear();
    console.log('✅ AI service shutdown complete');
  }
}

export const aiService = new AIService();