import { GeminiProvider } from '../providers/GeminiProvider.js';

interface AIProvider {
  name: string;
  type: 'openai' | 'gemini' | 'claude' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  isActive: boolean;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

class AIProviderManager {
  private providers = new Map<string, AIProvider>();
  private geminiInstances = new Map<string, GeminiProvider>();

  constructor() {
    this.initializeDefaultProviders();
  }

  private async initializeDefaultProviders(): Promise<void> {
    // Initialize Gemini provider
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const geminiProvider = new GeminiProvider(geminiApiKey, 'gemini-2.0-flash-exp');
        
        // Test connection
        const isConnected = await geminiProvider.testConnection();
        
        const provider: AIProvider = {
          name: 'gemini',
          type: 'gemini',
          apiKey: geminiApiKey,
          model: 'gemini-2.0-flash-exp',
          isActive: isConnected
        };

        this.providers.set('gemini', provider);
        this.geminiInstances.set('gemini', geminiProvider);

        if (isConnected) {
          console.log('✅ Gemini provider initialized successfully');
        } else {
          console.warn('⚠️ Gemini provider failed connection test');
        }
      } catch (error) {
        console.error('❌ Failed to initialize Gemini provider:', error);
      }
    }

    // Initialize OpenAI provider
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.providers.set('openai', {
        name: 'openai',
        type: 'openai',
        apiKey: openaiApiKey,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        isActive: true
      });
      console.log('✅ OpenAI provider configured');
    }
  }

  public async generateResponse(
    providerId: string,
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
    } = {}
  ): Promise<AIResponse> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.isActive) {
      throw new Error(`AI provider ${providerId} not found or inactive`);
    }

    try {
      if (provider.type === 'gemini') {
        const geminiInstance = this.geminiInstances.get(providerId);
        if (!geminiInstance) {
          throw new Error(`Gemini instance not found for provider ${providerId}`);
        }

        const response = await geminiInstance.generateContent(messages, options);
        return response;
      } else {
        // OpenAI-compatible provider
        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: provider.model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 500
          })
        });

        if (!response.ok) {
          throw new Error(`AI provider request failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          content: data.choices[0].message.content,
          usage: data.usage,
          model: provider.model,
          provider: provider.name
        };
      }
    } catch (error) {
      console.error(`AI provider ${providerId} call failed:`, error);
      throw error;
    }
  }

  public addProvider(name: string, config: Omit<AIProvider, 'name'>): void {
    this.providers.set(name, { name, ...config });
    
    if (config.type === 'gemini') {
      const geminiInstance = new GeminiProvider(config.apiKey, config.model);
      this.geminiInstances.set(name, geminiInstance);
    }
    
    console.log(`🤖 AI provider added: ${name} (${config.type})`);
  }

  public getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  public listProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  public getActiveProviders(): AIProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isActive);
  }

  public getDefaultProvider(): string {
    const defaultProvider = process.env.AI_DEFAULT_PROVIDER || 'gemini';
    
    if (this.providers.has(defaultProvider) && this.providers.get(defaultProvider)?.isActive) {
      return defaultProvider;
    }

    // Fallback to first active provider
    const activeProviders = this.getActiveProviders();
    return activeProviders.length > 0 ? activeProviders[0].name : '';
  }

  public async testProvider(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return false;
    }

    try {
      const testMessages: ChatMessage[] = [
        { role: 'user', content: 'Teste de conexão' }
      ];
      
      await this.generateResponse(providerId, testMessages, { maxTokens: 10 });
      return true;
    } catch (error) {
      console.error(`Provider ${providerId} test failed:`, error);
      return false;
    }
  }

  public updateProviderStatus(providerId: string, isActive: boolean): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.isActive = isActive;
    }
  }
}

export { AIProviderManager, type AIProvider, type ChatMessage, type AIResponse };