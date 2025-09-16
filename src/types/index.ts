// Base types for external system integration
export interface ExternalContact {
  externalContactId: string; // ID gerenciado pela aplicação externa
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface ExternalAgent {
  externalAgentId: string; // ID gerenciado pela aplicação externa
  name: string;
  email: string;
  type: 'human' | 'bot';
  isActive: boolean; // Status controlado pela aplicação externa
  maxConcurrentChats?: number;
  skills?: string[];
  metadata?: Record<string, any>;
}

// Internal WaWeb entities
export interface Contact {
  id: string; // ID interno do WaWeb
  externalContactId: string; // Referência ao sistema externo
  accountId: string;
  channelSpecificIds: Record<string, string>; // IDs específicos por canal (phone, telegram_id, email)
  name?: string;
  email?: string;
  phone?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastInteractionAt?: Date;
}

export interface Agent {
  id: string; // ID interno do WaWeb
  externalAgentId: string; // Referência ao sistema externo
  accountId: string;
  name: string;
  email: string;
  type: 'human' | 'bot';
  isOnline: boolean; // Status da sessão no WaWeb
  isActive: boolean; // Status controlado pela aplicação externa
  maxConcurrentChats: number;
  currentChatCount: number;
  skills: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date;
}

export interface Conversation {
  id: string;
  accountId: string;
  contactId: string; // ID interno do contato
  externalContactId: string; // Para facilitar consultas da aplicação externa
  agentId?: string; // ID interno do agente
  externalAgentId?: string; // Para facilitar consultas da aplicação externa
  status: 'open' | 'assigned' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: string[]; // Lista de canais utilizados nesta conversa
  primaryChannelId: string; // Canal principal da conversa
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  closedAt?: Date;
}

export interface OmnichannelMessage {
  id: string;
  conversationId: string;
  channelId: string;
  channelMessageId: string; // ID da mensagem no canal específico
  direction: 'inbound' | 'outbound';
  senderId?: string; // ID interno (contactId ou agentId)
  externalSenderId?: string; // ID externo para facilitar consultas
  senderType: 'contact' | 'agent';
  content: string;
  contentType: 'text' | 'image' | 'file' | 'audio' | 'video';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata: Record<string, any>;
  channelSpecificData?: Record<string, any>;
}

// API Request/Response types
export interface ContactRegistrationRequest {
  externalContactId: string;
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface AgentRegistrationRequest {
  externalAgentId: string;
  name: string;
  email: string;
  type: 'human' | 'bot';
  isActive: boolean;
  maxConcurrentChats?: number;
  skills?: string[];
  metadata?: Record<string, any>;
}

export interface AgentStatusUpdateRequest {
  externalAgentId: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface ConversationHistoryRequest {
  externalContactId: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string[];
}

export interface SendMessageRequest {
  externalContactId: string;
  channelId: string;
  content: string;
  contentType?: 'text' | 'image' | 'file' | 'audio' | 'video';
  externalAgentId?: string; // Se não informado, usar IA ou auto-assign
  metadata?: Record<string, any>;
}

// Webhook payload types
export interface WebhookMessagePayload {
  eventType: 'message.received' | 'message.sent' | 'message.delivered' | 'message.read';
  message: OmnichannelMessage;
  conversation: Conversation;
  contact: ExternalContact;
  agent?: ExternalAgent;
  channel: Channel;
  timestamp: Date;
}

// JWT Authentication types
export interface JWTPayload {
  sub: string; // External user ID from the consuming application
  accountId: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface UserRegistrationRequest {
  externalUserId: string;
  email: string;
  name: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

// Legacy types (maintaining compatibility)
export interface Account {
  id: string;
  phoneNumber: string;
  status: 'pending' | 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  to: string;
  from: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Omnichannel Types
export type ChannelType = 'whatsapp' | 'telegram' | 'email' | 'webchat';

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  accountId: string;
  configuration: ChannelConfiguration;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelConfiguration {
  whatsapp?: {
    phoneNumber: string;
    webhookUrl?: string;
  };
  telegram?: {
    botToken: string;
    webhookUrl?: string;
  };
  email?: {
    smtpHost: string;
    smtpPort: number;
    imapHost: string;
    imapPort: number;
    username: string;
    password: string;
    secure: boolean;
  };
  webchat?: {
    domain: string;
    widgetColor: string;
    welcomeMessage: string;
  };
}

export interface Contact {
  id: string;
  accountId: string;
  externalId: string; // Phone, telegram ID, email, etc.
  name?: string;
  email?: string;
  phone?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  accountId: string;
  channelId: string;
  contactId: string;
  agentId?: string;
  status: 'open' | 'assigned' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

export interface OmnichannelMessage {
  id: string;
  conversationId: string;
  channelMessageId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  contentType: 'text' | 'image' | 'file' | 'audio' | 'video';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata: Record<string, any>;
  channelSpecificData?: Record<string, any>;
}

export interface Agent {
  id: string;
  accountId: string;
  name: string;
  email: string;
  type: 'human' | 'bot';
  isOnline: boolean;
  maxConcurrentChats: number;
  skills: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// AI Chat Types
export interface AIPrompt {
  id: string;
  name: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIConversationContext {
  conversationId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentPromptId: string;
  metadata: Record<string, any>;
}