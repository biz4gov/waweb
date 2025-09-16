-- Versão 4

-- Habilita a extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TIPOS ENUM
CREATE TYPE channel_type AS ENUM ('WHATSAPP', 'TELEGRAM', 'EMAIL', 'WEBCHAT');
CREATE TYPE channel_status AS ENUM ('CREATED', 'CONNECTED', 'DISCONNECTED', 'ERROR');
CREATE TYPE message_direction AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE message_status AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE conversation_status AS ENUM ('OPEN', 'CLOSED', 'PENDING', 'AWAITING_AGENT');
CREATE TYPE agent_type AS ENUM ('HUMAN', 'BOT'); -- NOVO
CREATE TYPE agent_status AS ENUM ('ONLINE', 'OFFLINE', 'BUSY'); -- NOVO

-- Tabela de contas (sem alterações)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de canais (sem alterações)
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    type channel_type NOT NULL,
    status channel_status NOT NULL DEFAULT 'CREATED',
    credentials JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de contatos (sem alterações)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255),
    identifiers JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, identifiers)
);

-- TABELA: agents (ATUALIZADA)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL, -- NOVO
    password VARCHAR(255) NOT NULL, -- NOVO (armazenará o hash)
    type agent_type NOT NULL,
    status agent_status NOT NULL DEFAULT 'OFFLINE',
    config JSONB,
    last_assignment_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Um email deve ser único por conta
    UNIQUE(account_id, email)
);

-- Tabela de conversas (ATUALIZADA)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    -- NOVO CAMPO: Chave estrangeira para o atendente. Pode ser NULL.
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    status conversation_status NOT NULL DEFAULT 'AWAITING_AGENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, contact_id)
);


-- Tabela de mensagens (sem alterações)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    channel_message_id VARCHAR(255),
    direction message_direction NOT NULL,
    status message_status NOT NULL DEFAULT 'SENT',
    content TEXT,
    attachment JSONB,
    channel_specific_data JSONB,
    sent_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOVA TABELA: Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    -- O evento que dispara este webhook. Ex: 'MESSAGE_CREATED'
    event_type VARCHAR(100) NOT NULL,
    target_url TEXT NOT NULL,
    -- Chave para gerar a assinatura HMAC, garantindo a autenticidade
    secret_key VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTPZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel_id ON conversations(channel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id); -- NOVO
CREATE INDEX idx_webhooks_lookup ON webhooks(account_id, event_type, is_active);