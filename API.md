# 🛠️ Documentação das APIs

Esta documentação detalha todas as APIs REST disponíveis no WaWeb para integração com aplicações externas.

## 📋 Índice

- [Autenticação](#-autenticação)
- [Gestão de Usuários](#-gestão-de-usuários)
- [Gestão de Contatos](#-gestão-de-contatos)
- [Gestão de Agentes](#-gestão-de-agentes)
- [Canais de Comunicação](#-canais-de-comunicação)
- [Mensagens](#-mensagens)
- [IA e Chatbot](#-ia-e-chatbot)
- [Estatísticas](#-estatísticas)
- [Webhooks](#-webhooks)

## 🔐 Autenticação

Todas as APIs (exceto registro inicial) requerem autenticação via token JWT no header:
```
Authorization: Bearer SEU_TOKEN_JWT
```

### Base URL
```
https://sua-api.waweb.com
```

## 👤 Gestão de Usuários

### Registrar Usuário
Registra um novo usuário da aplicação externa no WaWeb.

```http
POST /omnichannel/users?accountId={accountId}
Content-Type: application/json

{
  "externalUserId": "user-123",
  "email": "usuario@empresa.com",
  "name": "João Silva",
  "permissions": ["contacts:read", "contacts:write", "messages:send"],
  "metadata": {
    "department": "Atendimento",
    "role": "Supervisor"
  }
}
```

**Resposta (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "externalUserId": "user-123",
      "accountId": "empresa-456",
      "email": "usuario@empresa.com",
      "name": "João Silva",
      "permissions": ["contacts:read", "contacts:write", "messages:send"],
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### Gerar Novo Token
Gera um novo token JWT para usuário existente.

```http
POST /omnichannel/users/{externalUserId}/token?accountId={accountId}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "permissions": ["contacts:read", "contacts:write", "messages:send"]
  }
}
```

## 👥 Gestão de Contatos

### Registrar/Atualizar Contato
Registra ou atualiza um contato no sistema.

```http
POST /omnichannel/contacts
Authorization: Bearer {token}
Content-Type: application/json

{
  "externalContactId": "cliente-789",
  "name": "Maria Cliente",
  "email": "maria@cliente.com",
  "phone": "+5511999999999",
  "metadata": {
    "segment": "VIP",
    "preferredChannel": "whatsapp"
  }
}
```

**Resposta (201):**
```json
{
  "success": true,
  "data": {
    "id": "contact_1642258200_abc123",
    "externalContactId": "cliente-789",
    "accountId": "empresa-456",
    "name": "Maria Cliente",
    "email": "maria@cliente.com",
    "phone": "+5511999999999",
    "channelSpecificIds": {},
    "metadata": {
      "segment": "VIP",
      "preferredChannel": "whatsapp"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Consultar Contato
Busca contato por ID externo.

```http
GET /omnichannel/contacts/{externalContactId}
Authorization: Bearer {token}
```

### Buscar Contatos
Busca contatos por termo de pesquisa.

```http
GET /omnichannel/contacts?q={termo}&limit=10
Authorization: Bearer {token}
```

### Histórico de Conversas do Contato
Recupera conversas anteriores de um contato.

```http
GET /omnichannel/contacts/{externalContactId}/conversations?limit=10&offset=0
Authorization: Bearer {token}
```

**Parâmetros de Query:**
- `limit`: Número máximo de conversas (padrão: 10)
- `offset`: Deslocamento para paginação (padrão: 0)
- `startDate`: Data inicial (ISO 8601)
- `endDate`: Data final (ISO 8601)
- `status`: Status das conversas (open,assigned,resolved,closed)

## 👨‍💼 Gestão de Agentes

### Registrar/Atualizar Agente
Registra ou atualiza um agente no sistema.

```http
POST /omnichannel/agents
Authorization: Bearer {token}
Content-Type: application/json

{
  "externalAgentId": "agent-001",
  "name": "João Atendente",
  "email": "joao@empresa.com",
  "type": "human",
  "isActive": true,
  "maxConcurrentChats": 5,
  "skills": ["vendas", "suporte_tecnico"],
  "metadata": {
    "department": "Atendimento",
    "shift": "morning"
  }
}
```

**Resposta (201):**
```json
{
  "success": true,
  "data": {
    "id": "agent_1642258200_xyz789",
    "externalAgentId": "agent-001",
    "accountId": "empresa-456",
    "name": "João Atendente",
    "email": "joao@empresa.com",
    "type": "human",
    "isOnline": false,
    "isActive": true,
    "maxConcurrentChats": 5,
    "currentChatCount": 0,
    "skills": ["vendas", "suporte_tecnico"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Atualizar Status do Agente
Atualiza status ativo/inativo do agente.

```http
PUT /omnichannel/agents/{externalAgentId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "isActive": false,
  "metadata": {
    "reason": "Pausa para almoço"
  }
}
```

### Consultar Fila de Atendimento
Consulta status atual da fila de agentes.

```http
GET /omnichannel/agents/queue
Authorization: Bearer {token}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "externalAgentId": "agent-001",
      "name": "João Atendente",
      "type": "human",
      "isActive": true,
      "isOnline": true,
      "currentChats": 2,
      "maxChats": 5,
      "isAvailable": true,
      "lastActivity": "2024-01-15T11:45:00Z"
    }
  ]
}
```

## 📱 Canais de Comunicação

### Listar Canais
Lista todos os canais configurados.

```http
GET /channels
Authorization: Bearer {token}
```

### Criar Canal
Cria um novo canal de comunicação.

```http
POST /channels
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountId": "empresa-456",
  "type": "whatsapp",
  "name": "Atendimento WhatsApp",
  "configuration": {
    "whatsapp": {
      "phoneNumber": "+5511999999999"
    }
  },
  "webhookUrl": "https://empresa.com/webhooks/whatsapp"
}
```

### Configurar Canal Telegram
```http
POST /channels
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountId": "empresa-456",
  "type": "telegram",
  "name": "Bot Telegram Suporte",
  "configuration": {
    "telegram": {
      "botToken": "123456789:ABCDEF...",
      "useWebhook": true
    }
  },
  "webhookUrl": "https://empresa.com/webhooks/telegram"
}
```

### Configurar Canal E-mail
```http
POST /channels
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountId": "empresa-456",
  "type": "email",
  "name": "Suporte E-mail",
  "configuration": {
    "email": {
      "imap": {
        "host": "imap.gmail.com",
        "port": 993,
        "secure": true,
        "user": "suporte@empresa.com",
        "password": "senha_app"
      },
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "user": "suporte@empresa.com",
        "password": "senha_app"
      }
    }
  }
}
```

### Ativar/Desativar Canal
```http
PUT /channels/{channelId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "isActive": true
}
```

## 💬 Mensagens

### Enviar Mensagem
Envia mensagem através de um canal específico.

```http
POST /channels/{channelId}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "recipientId": "+5511999999999",
  "content": "Olá! Como posso ajudá-lo hoje?",
  "contentType": "text",
  "options": {
    "externalAgentId": "agent-001",
    "priority": "normal"
  }
}
```

**Resposta (201):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_1642258200_def456",
    "channelMessageId": "whatsapp_msg_789",
    "status": "sent",
    "sentAt": "2024-01-15T10:30:00Z"
  }
}
```

### Enviar Mensagem com Mídia
```http
POST /channels/{channelId}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "recipientId": "+5511999999999",
  "content": "Aqui está o documento solicitado",
  "contentType": "file",
  "media": {
    "url": "https://empresa.com/docs/contrato.pdf",
    "filename": "contrato.pdf",
    "mimeType": "application/pdf"
  }
}
```

### Histórico de Mensagens
```http
GET /channels/{channelId}/messages?conversationId={conversationId}&limit=50
Authorization: Bearer {token}
```

## 🤖 IA e Chatbot

### Chat com IA
Gera resposta da IA para uma conversa.

```http
POST /ai/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "conversationId": "conv-123",
  "message": "Preciso de informações sobre contratos públicos",
  "promptId": "didi-biz4gov",
  "providerId": "gemini"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
  "content": "Olá! Sou DiDi, Assistente Executiva da Biz4Gov. Posso ajudá-lo com informações sobre contratos administrativos...",
    "model": "gemini-2.0-flash-exp",
    "provider": "gemini",
    "usage": {
      "promptTokens": 150,
      "completionTokens": 200,
      "totalTokens": 350
    }
  }
}
```

### Verificar Escalação
Verifica se mensagem deve ser escalada para humano.

```http
POST /ai/escalation-check
Authorization: Bearer {token}
Content-Type: application/json

{
  "conversationId": "conv-123",
  "message": "Quero falar com um atendente humano!"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "shouldEscalate": true,
    "reason": "Solicitação explícita de atendente humano",
    "confidence": 0.95
  }
}
```

### Listar Prompts Disponíveis
```http
GET /ai/prompts
Authorization: Bearer {token}
```

### Recarregar Prompt
```http
POST /ai/prompts/{promptId}/reload
Authorization: Bearer {token}
```

### Testar Provedor de IA
```http
POST /ai/providers/{providerId}/test
Authorization: Bearer {token}
```

## 📊 Estatísticas

### Estatísticas Gerais
Consulta estatísticas consolidadas do sistema.

```http
GET /omnichannel/stats
Authorization: Bearer {token}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "contacts": {
      "total": 1250,
      "active24h": 85,
      "mapped": 1250
    },
    "agents": {
      "total": 15,
      "active": 12,
      "online": 8,
      "totalCurrentChats": 23,
      "averageChatsPerAgent": 1.92
    },
    "authentication": {
      "totalUsers": 45,
      "activeUsers": 42,
      "accountsWithUsers": 5
    },
    "timestamp": "2024-01-15T11:45:00Z"
  }
}
```

### Estatísticas de Canal
```http
GET /channels/{channelId}/stats
Authorization: Bearer {token}
```

### Relatório de Performance
```http
GET /reports/performance?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

## 🔔 Webhooks

### Registrar Webhook
Registra URL para receber notificações de eventos.

```http
POST /webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventType": "message.received",
  "targetUrl": "https://empresa.com/webhooks/messages",
  "secret": "chave_secreta_webhook"
}
```

### Eventos de Webhook Suportados

#### message.received
Disparado quando uma nova mensagem é recebida.

```json
{
  "eventType": "message.received",
  "message": {
    "id": "msg_123",
    "conversationId": "conv_456",
    "channelId": "ch_789",
    "direction": "inbound",
    "content": "Olá, preciso de ajuda",
    "contentType": "text",
    "sentAt": "2024-01-15T10:30:00Z"
  },
  "contact": {
    "externalContactId": "cliente-789",
    "name": "Maria Cliente"
  },
  "channel": {
    "type": "whatsapp",
    "name": "Atendimento Principal"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### message.sent
Disparado quando uma mensagem é enviada com sucesso.

#### conversation.assigned
Disparado quando uma conversa é atribuída a um agente.

#### agent.status.changed
Disparado quando status de um agente é alterado.

### Verificar Webhooks
```http
GET /webhooks
Authorization: Bearer {token}
```

### Remover Webhook
```http
DELETE /webhooks/{webhookId}
Authorization: Bearer {token}
```

## 🧪 Teste das APIs

### Health Check
Verifica se o serviço está funcionando.

```http
GET /status
```

**Resposta (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai": "available"
  }
}
```

### Exemplo de Uso Completo

```javascript
// 1. Registrar usuário
const userResponse = await fetch('/omnichannel/users?accountId=empresa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    externalUserId: 'user123',
    email: 'user@empresa.com',
    name: 'Usuário Teste',
    permissions: ['contacts:read', 'messages:send']
  })
});

const { token } = userResponse.data;

// 2. Registrar contato
await fetch('/omnichannel/contacts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    externalContactId: 'cliente001',
    name: 'Cliente Teste',
    phone: '+5511999999999'
  })
});

// 3. Enviar mensagem
await fetch('/channels/ch_123/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipientId: '+5511999999999',
    content: 'Olá! Como posso ajudá-lo?'
  })
});
```

## 🚨 Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido ou ausente |
| 403 | Forbidden - Permissões insuficientes |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Conflito com estado atual |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro interno |

## 📝 Notas Importantes

1. **Rate Limiting**: Máximo de 100 requisições por minuto por token
2. **Tamanho de Payload**: Máximo de 10MB para uploads
3. **Timeout**: Timeout de 30 segundos para requisições
4. **Webhooks**: Máximo de 3 tentativas com backoff exponencial
5. **Tokens**: Expiram em 24 horas (configurável)

Para mais detalhes, consulte a [documentação completa](./OMNICHANNEL.md).