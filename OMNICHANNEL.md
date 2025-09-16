# Documentação do Sistema Omnichannel WaWeb

## Visão Geral

O WaWeb é uma **plataforma omnichannel de comunicação baseada em API** que funciona como um microsserviço sem interface visual. Aplicações externas consomem os serviços através de requisições na API REST, sendo responsáveis pela interface visual e gestão de usuários.

## Arquitetura de Integração

### Fluxo de Integração
1. **Aplicação Externa** registra usuários no WaWeb
2. **Usuários** recebem tokens JWT únicos para autenticação
3. **Contatos e Agentes** são gerenciados pela aplicação externa
4. **Mensagens** fluem através dos canais e são entregues via webhooks
5. **Interface Visual** é responsabilidade da aplicação externa

## Entidades Principais

### 📱 Contato
- **Definição**: Código de cliente gerenciado pela aplicação externa
- **Identificação**: `externalContactId` único por account
- **Canais**: Pode comunicar por WhatsApp, Telegram, E-mail, Chat Web
- **Conversas**: Mantém histórico independente do canal utilizado

### 👨‍💼 Atendente
- **Definição**: Operador (humano ou robô) gerenciado pela aplicação externa
- **Identificação**: `externalAgentId` único por account
- **Status**: Ativo/Inativo controlado pela aplicação externa
- **Fila**: Distribuição automática baseada em disponibilidade

### 💬 Conversa
- **Definição**: Thread de comunicação entre contato e atendente
- **Persistência**: Independente do canal de comunicação
- **Histórico**: Recuperação de N conversas anteriores via API
- **Multi-canal**: Suporte a múltiplos canais na mesma conversa

### 📨 Mensagem
- **Definição**: Comunicação enviada em uma conversa
- **Direção**: Inbound (contato) ou Outbound (atendente)
- **Canal**: Meio de comunicação (WhatsApp, Telegram, etc.)
- **Webhook**: Entrega automática para aplicação externa

### 🔗 Canal
- **Definição**: Meio de interação entre atendente e contato
- **Tipos**: WhatsApp, Telegram, E-mail, Chat Web com IA
- **Configuração**: Credenciais e configurações específicas
- **Webhooks**: URLs para notificações de eventos

## Autenticação JWT

### Registro de Usuário
Cada usuário da aplicação externa deve ser registrado no WaWeb:

```javascript
POST /omnichannel/users?accountId=empresa-123
{
  "externalUserId": "user-456",
  "email": "usuario@empresa.com",
  "name": "João Silva",
  "permissions": ["contacts:read", "contacts:write", "messages:send"]
}
```

### Geração de Token
```javascript
POST /omnichannel/users/user-456/token?accountId=empresa-123
// Retorna JWT válido por 24h
```

### Uso do Token
```javascript
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Fluxo de Mensagens

### 1. Configuração Inicial
```javascript
// 1. Registrar usuário
POST /omnichannel/users?accountId=empresa-123

// 2. Criar canal WhatsApp
POST /channels
{
  "accountId": "empresa-123",
  "type": "whatsapp",
  "name": "Atendimento Principal",
  "configuration": {
    "whatsapp": {
      "phoneNumber": "+5511999999999"
    }
  }
}

// 3. Registrar agente
POST /omnichannel/agents
{
  "externalAgentId": "agent-001",
  "name": "Maria Atendente",
  "email": "maria@empresa.com",
  "type": "human",
  "isActive": true
}

// 4. Registrar contato
POST /omnichannel/contacts
{
  "externalContactId": "cliente-789",
  "name": "Cliente VIP",
  "phone": "+5511888888888"
}
```

### 2. Recebimento de Mensagem
```javascript
// Webhook automático do WaWeb para aplicação externa
POST https://empresa.com/webhook/messages
{
  "eventType": "message.received",
  "message": {
    "id": "msg-123",
    "conversationId": "conv-456",
    "content": "Olá, preciso de ajuda",
    "direction": "inbound",
    "sentAt": "2024-01-15T10:30:00Z"
  },
  "contact": {
    "externalContactId": "cliente-789",
    "name": "Cliente VIP"
  },
  "channel": {
    "type": "whatsapp",
    "name": "Atendimento Principal"
  }
}
```

### 3. Envio de Resposta
```javascript
// Via aplicação externa
POST /channels/ch_123/messages
{
  "recipientId": "+5511888888888",
  "content": "Olá! Como posso ajudá-lo?",
  "options": {
    "externalAgentId": "agent-001"
  }
}
```

## Gestão de Filas

### Status dos Agentes
```javascript
GET /omnichannel/agents/queue
// Retorna disponibilidade e carga atual
[
  {
    "externalAgentId": "agent-001",
    "name": "Maria Atendente",
    "isActive": true,
    "isOnline": true,
    "currentChats": 2,
    "maxChats": 5,
    "isAvailable": true
  }
]
```

### Atualização de Status
```javascript
PUT /omnichannel/agents/agent-001/status
{
  "isActive": false // Retira da fila
}
```

## IA e Automação

### Chat com DiDi (Gemini Flash 2.5)
```javascript
POST /ai/chat
{
  "conversationId": "conv-456",
  "message": "Preciso de informações sobre contratos",
  "promptId": "didi-biz4gov"
}

// Resposta
{
  "content": "Olá! Sou DiDi, Assistente Executiva da Biz4Gov...",
  "model": "gemini-2.0-flash-exp",
  "provider": "gemini"
}
```

### Escalação Automática
```javascript
POST /ai/escalation-check
{
  "conversationId": "conv-456",
  "message": "Quero falar com um atendente humano!"
}

// Resposta
{
  "shouldEscalate": true
}
```

## Webhooks de Sistema

### Configuração
```javascript
POST /webhooks
{
  "event_type": "MESSAGE_CREATED",
  "target_url": "https://empresa.com/webhooks/messages"
}
```

### Eventos Suportados
- `message.received` - Nova mensagem de contato
- `message.sent` - Mensagem enviada por agente
- `conversation.assigned` - Conversa atribuída a agente
- `agent.status.changed` - Status do agente alterado

## Consulta de Histórico

### Conversas do Contato
```javascript
GET /omnichannel/contacts/cliente-789/conversations?limit=10&offset=0
{
  "data": [
    {
      "id": "conv-456",
      "status": "resolved",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastMessageAt": "2024-01-15T11:45:00Z",
      "messageCount": 15
    }
  ],
  "pagination": {
    "total": 25,
    "hasMore": true
  }
}
```

## Permissões de Acesso

### Níveis de Permissão
- `contacts:read` - Consultar contatos
- `contacts:write` - Criar/editar contatos
- `agents:read` - Consultar agentes
- `agents:write` - Gerenciar agentes
- `conversations:read` - Consultar conversas
- `messages:send` - Enviar mensagens
- `stats:read` - Consultar estatísticas
- `admin` - Acesso total

### Controle por Token
Cada token JWT contém as permissões específicas do usuário, verificadas automaticamente em cada requisição.

## Monitoramento

### Estatísticas
```javascript
GET /omnichannel/stats
{
  "contacts": {
    "total": 1250,
    "active24h": 85
  },
  "agents": {
    "total": 15,
    "active": 12,
    "online": 8,
    "totalCurrentChats": 23
  },
  "authentication": {
    "totalUsers": 45,
    "activeUsers": 42
  }
}
```

## Exemplos de Integração

### Frontend React
```javascript
// Hook para comunicação com WaWeb
const useWaWeb = () => {
  const token = localStorage.getItem('waweb-token');
  
  const sendMessage = async (contactId, message) => {
    const response = await fetch('/channels/ch_123/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientId: contactId,
        content: message
      })
    });
    return response.json();
  };
  
  return { sendMessage };
};
```

### Backend Node.js
```javascript
// Middleware para webhook
app.post('/webhook/messages', (req, res) => {
  const { eventType, message, contact } = req.body;
  
  // Processar mensagem recebida
  if (eventType === 'message.received') {
    // Notificar interface
    io.emit('new-message', { message, contact });
    
    // Verificar se precisa de IA
    if (shouldUseAI(message.content)) {
      generateAIResponse(message.conversationId, message.content);
    }
  }
  
  res.status(200).json({ received: true });
});
```

Este sistema garante total separação de responsabilidades: o WaWeb gerencia a comunicação omnichannel, enquanto a aplicação externa cuida da interface e experiência do usuário.