# 📱 Canais de Comunicação

Este documento detalha todos os canais de comunicação suportados pelo WaWeb: WhatsApp, Telegram, E-mail e Chat Web.

## 🌐 Visão Geral dos Canais

O WaWeb suporta comunicação omnichannel através de:

| Canal | Status | Protocolo | Recursos Principais |
|-------|--------|-----------|-------------------|
| 📱 WhatsApp | ✅ Ativo | WhatsApp Web API | QR Code, Mídia, Grupos, Status |
| 🤖 Telegram | ✅ Ativo | Telegram Bot API | Bots, Keyboards, Callbacks, Files |
| 📧 E-mail | ✅ Ativo | IMAP/SMTP | Threading, Anexos, HTML, Auto-reply |
| 💬 Chat Web | ✅ Ativo | WebSocket/HTTP | IA, Escalação, Widget embeddable |

## 📱 WhatsApp

### Configuração
```javascript
{
  "type": "whatsapp",
  "name": "Atendimento WhatsApp",
  "configuration": {
    "whatsapp": {
      "phoneNumber": "+5511999999999",
      "sessionPath": "./.wwebjs_auth",
      "puppeteerOptions": {
        "headless": true,
        "args": ["--no-sandbox"]
      }
    }
  }
}
```

### Funcionalidades

#### 1. Autenticação QR Code
```javascript
// Evento de QR Code
whatsappService.on('qr-code', (qrCode) => {
  console.log('QR Code gerado:', qrCode);
  // Exibir QR para escaneamento
});

// Estado da conexão
whatsappService.on('ready', () => {
  console.log('WhatsApp conectado!');
});
```

#### 2. Envio de Mensagens
```javascript
// Texto simples
await whatsappService.sendMessage('+5511999999999', 'Olá!');

// Com formatação
await whatsappService.sendMessage('+5511999999999', '*Negrito* _Itálico_ ~Riscado~');

// Mensagem com mídia
await whatsappService.sendMessage('+5511999999999', {
  caption: 'Documento anexo',
  media: 'https://exemplo.com/arquivo.pdf'
});
```

#### 3. Recebimento de Mensagens
```javascript
whatsappService.on('message', async (message) => {
  console.log('Nova mensagem:', {
    from: message.from,
    body: message.body,
    type: message.type,
    hasMedia: message.hasMedia
  });
  
  // Processar mídia se existir
  if (message.hasMedia) {
    const media = await message.downloadMedia();
    // Salvar arquivo...
  }
});
```

#### 4. Grupos e Listas de Transmissão
```javascript
// Informações de grupo
if (message.fromMe === false && message.from.includes('@g.us')) {
  const chat = await message.getChat();
  console.log('Mensagem do grupo:', chat.name);
}

// Mencionar usuário
await whatsappService.sendMessage(groupId, '@5511999999999 Olá!', {
  mentions: ['+5511999999999@c.us']
});
```

### Status e Estados
- `OPENING`: Iniciando cliente
- `QR_CODE`: Aguardando escaneamento
- `CONNECTED`: Conectado e pronto
- `DISCONNECTED`: Desconectado

## 🤖 Telegram

### Configuração
```javascript
{
  "type": "telegram",
  "name": "Bot Telegram Suporte",
  "configuration": {
    "telegram": {
      "botToken": "123456789:ABCDEF1234567890",
      "useWebhook": true,
      "webhookDomain": "https://api.empresa.com",
      "allowedUpdates": ["message", "callback_query"]
    }
  }
}
```

### Funcionalidades

#### 1. Comandos do Bot
```javascript
// Comando /start
telegramService.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  telegramService.sendMessage(chatId, 'Bem-vindo ao atendimento!', {
    reply_markup: {
      keyboard: [
        ['📞 Falar com Atendente', '🤖 Suporte Automático'],
        ['📋 Consultar Pedido', '📍 Localização']
      ],
      resize_keyboard: true
    }
  });
});

// Comando personalizado
telegramService.onText(/\/pedido (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const pedidoId = match[1];
  // Buscar informações do pedido...
});
```

#### 2. Inline Keyboards
```javascript
const inlineKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: 'Opção 1', callback_data: 'opt_1' },
        { text: 'Opção 2', callback_data: 'opt_2' }
      ],
      [
        { text: 'Voltar', callback_data: 'back' }
      ]
    ]
  }
};

await telegramService.sendMessage(chatId, 'Escolha uma opção:', inlineKeyboard);
```

#### 3. Callback Queries
```javascript
telegramService.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const data = callbackQuery.data;
  
  switch(data) {
    case 'opt_1':
      telegramService.editMessageText('Você escolheu a Opção 1', {
        chat_id: message.chat.id,
        message_id: message.message_id
      });
      break;
  }
  
  // Confirmar callback
  telegramService.answerCallbackQuery(callbackQuery.id);
});
```

#### 4. Envio de Arquivos
```javascript
// Documento
await telegramService.sendDocument(chatId, './arquivo.pdf', {
  caption: 'Documento solicitado'
});

// Foto
await telegramService.sendPhoto(chatId, './imagem.jpg', {
  caption: 'Imagem do produto'
});

// Áudio
await telegramService.sendVoice(chatId, './audio.ogg');
```

### Webhooks vs Polling
```javascript
// Webhook (recomendado para produção)
if (config.useWebhook) {
  await telegramService.setWebHook(`${config.webhookDomain}/webhook/telegram`);
} else {
  // Polling (desenvolvimento)
  telegramService.startPolling();
}
```

## 📧 E-mail

### Configuração
```javascript
{
  "type": "email",
  "name": "Suporte E-mail",
  "configuration": {
    "email": {
      "imap": {
        "host": "imap.gmail.com",
        "port": 993,
        "secure": true,
        "user": "suporte@empresa.com",
        "password": "senha_aplicativo"
      },
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "user": "suporte@empresa.com",
        "password": "senha_aplicativo"
      }
    }
  }
}
```

### Funcionalidades

#### 1. Recebimento via IMAP
```javascript
emailService.on('new-email', (email) => {
  console.log('Novo e-mail:', {
    from: email.from,
    subject: email.subject,
    messageId: email.messageId,
    hasAttachments: email.attachments.length > 0
  });
  
  // Processar anexos
  email.attachments.forEach(attachment => {
    console.log('Anexo:', attachment.filename, attachment.size);
  });
});

// Conectar ao servidor IMAP
await emailService.connect();
```

#### 2. Envio via SMTP
```javascript
// E-mail simples
await emailService.sendEmail({
  to: 'cliente@empresa.com',
  subject: 'Resposta do Suporte',
  text: 'Sua solicitação foi processada.',
  html: '<p>Sua solicitação foi <strong>processada</strong>.</p>'
});

// Com anexos
await emailService.sendEmail({
  to: 'cliente@empresa.com',
  subject: 'Documentos Solicitados',
  html: '<p>Segue documentação em anexo.</p>',
  attachments: [
    {
      filename: 'contrato.pdf',
      path: './docs/contrato.pdf'
    }
  ]
});
```

#### 3. Threading de Conversas
```javascript
// Responder mantendo thread
const originalEmail = await emailService.getEmailById(messageId);
await emailService.sendEmail({
  to: originalEmail.from,
  subject: `Re: ${originalEmail.subject}`,
  inReplyTo: originalEmail.messageId,
  references: originalEmail.messageId,
  html: 'Resposta da thread...'
});
```

#### 4. Processamento de Anexos
```javascript
// Salvar anexos
email.attachments.forEach(async (attachment) => {
  if (attachment.size < 10 * 1024 * 1024) { // 10MB limite
    const filepath = `./uploads/${attachment.filename}`;
    await fs.writeFile(filepath, attachment.content);
  }
});
```

### Auto-reply e Templates
```javascript
// Template de resposta automática
const autoReplyTemplate = `
Olá {customerName},

Recebemos sua mensagem e nossa equipe irá respondê-la em até 24 horas.

Protocolo: {ticketId}

Atenciosamente,
Equipe de Suporte
`;

// Processar template
const response = autoReplyTemplate
  .replace('{customerName}', extractName(email.from))
  .replace('{ticketId}', generateTicketId());
```

## 💬 Chat Web

### Configuração
```javascript
{
  "type": "webchat",
  "name": "Chat Website",
  "configuration": {
    "webchat": {
      "allowedOrigins": ["https://empresa.com"],
      "theme": {
        "primaryColor": "#007bff",
        "botName": "Rosie"
      },
      "features": {
        "fileUpload": true,
        "aiEnabled": true,
        "escalationEnabled": true
      }
    }
  }
}
```

### Funcionalidades

#### 1. Widget Embeddable
```html
<!-- HTML para incorporar o chat -->
<div id="waweb-chat"></div>
<script src="https://api.empresa.com/chat-widget.js"></script>
<script>
  WaWebChat.init({
    channelId: 'ch_webchat_123',
    apiUrl: 'https://api.empresa.com',
    theme: {
      primaryColor: '#007bff',
      position: 'bottom-right'
    }
  });
</script>
```

#### 2. Integração com IA
```javascript
// Processamento automático com IA
webChatService.on('message', async (message) => {
  // Verificar se deve usar IA
  if (shouldUseAI(message)) {
    const aiResponse = await aiService.generateResponse(
      message.conversationId,
      message.content,
      'rosie-biz4gov'
    );
    
    await webChatService.sendMessage(message.conversationId, {
      content: aiResponse.content,
      type: 'bot'
    });
  }
});
```

#### 3. Escalação para Humano
```javascript
// Detectar necessidade de escalação
if (await aiService.shouldEscalateToHuman(conversationId, message.content)) {
  // Transferir para fila humana
  await agentManager.assignAgentToConversation(
    accountId,
    conversationId,
    null, // Auto-assign
    ['atendimento_geral']
  );
  
  await webChatService.sendMessage(conversationId, {
    content: 'Transferindo você para um atendente humano...',
    type: 'system'
  });
}
```

#### 4. Upload de Arquivos
```javascript
// Configurar upload
webChatService.configureFileUpload({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/*', 'application/pdf', '.doc', '.docx'],
  uploadPath: './uploads/webchat'
});

// Processar arquivo recebido
webChatService.on('file-upload', (file, conversationId) => {
  console.log('Arquivo recebido:', {
    filename: file.filename,
    size: file.size,
    type: file.mimetype
  });
});
```

## 🔄 Webhook Universal

### Configuração para Todos os Canais
```javascript
// Webhook único para processar eventos de todos os canais
app.post('/webhook/universal', (req, res) => {
  const { eventType, channel, message, contact } = req.body;
  
  switch (channel.type) {
    case 'whatsapp':
      handleWhatsAppMessage(message, contact);
      break;
    case 'telegram':
      handleTelegramMessage(message, contact);
      break;
    case 'email':
      handleEmailMessage(message, contact);
      break;
    case 'webchat':
      handleWebChatMessage(message, contact);
      break;
  }
  
  res.status(200).json({ received: true });
});
```

### Estrutura do Payload
```javascript
{
  "eventType": "message.received",
  "timestamp": "2024-01-15T10:30:00Z",
  "channel": {
    "id": "ch_123",
    "type": "whatsapp",
    "name": "Atendimento WhatsApp"
  },
  "message": {
    "id": "msg_456",
    "conversationId": "conv_789",
    "content": "Olá, preciso de ajuda",
    "contentType": "text",
    "direction": "inbound",
    "sentAt": "2024-01-15T10:30:00Z",
    "metadata": {
      "whatsapp": {
        "messageId": "wamid.123",
        "chatType": "individual"
      }
    }
  },
  "contact": {
    "externalContactId": "cliente-123",
    "name": "João Cliente",
    "channelSpecificId": "+5511999999999"
  }
}
```

## 📊 Monitoramento dos Canais

### Health Check por Canal
```javascript
// Verificar status de todos os canais
app.get('/channels/health', async (req, res) => {
  const health = {
    whatsapp: await whatsappService.isConnected(),
    telegram: await telegramService.isConnected(),
    email: await emailService.isConnected(),
    webchat: webChatService.isRunning()
  };
  
  res.json({
    status: Object.values(health).every(Boolean) ? 'healthy' : 'degraded',
    channels: health,
    timestamp: new Date().toISOString()
  });
});
```

### Métricas por Canal
```javascript
// Estatísticas de uso
app.get('/channels/stats', async (req, res) => {
  res.json({
    whatsapp: {
      messagesReceived: await whatsappService.getMessageCount('received'),
      messagesSent: await whatsappService.getMessageCount('sent'),
      activeChats: await whatsappService.getActiveChatCount()
    },
    telegram: {
      messagesReceived: await telegramService.getMessageCount('received'),
      messagesSent: await telegramService.getMessageCount('sent'),
      activeUsers: await telegramService.getActiveUserCount()
    },
    // ... outros canais
  });
});
```

## 🔧 Configuração de Desenvolvimento

### Docker Compose para Testes
```yaml
version: '3.8'
services:
  # Serviços principais...
  
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
      
  ngrok:
    image: wernight/ngrok
    environment:
      NGROK_PROTOCOL: http
      NGROK_PORT: app:3000
    depends_on:
      - app
```

### Testes Automatizados
```javascript
// Teste do WhatsApp
describe('WhatsApp Service', () => {
  it('should send message', async () => {
    const result = await whatsappService.sendMessage(
      '+5511999999999',
      'Teste automatizado'
    );
    expect(result.success).toBe(true);
  });
});

// Teste do Telegram
describe('Telegram Service', () => {
  it('should handle callback query', async () => {
    const mockCallback = {
      id: 'test_callback',
      data: 'opt_1',
      message: { chat: { id: 123 } }
    };
    
    await telegramService.handleCallbackQuery(mockCallback);
    // Verificar resposta...
  });
});
```

## 🚨 Troubleshooting

### Problemas Comuns

#### WhatsApp
```bash
# QR Code não aparece
# Verificar permissões da pasta de sessão
chmod -R 755 ./.wwebjs_auth

# Erro de autenticação
# Limpar cache
rm -rf ./.wwebjs_auth ./.wwebjs_cache
```

#### Telegram
```bash
# Bot não responde
# Verificar token
curl "https://api.telegram.org/bot$TOKEN/getMe"

# Webhook não funciona
# Verificar SSL
curl "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

#### E-mail
```bash
# Erro de conexão IMAP
# Testar com telnet
telnet imap.gmail.com 993

# Autenticação falha
# Verificar senha de aplicativo (Gmail)
```

### Logs de Debug
```javascript
// Habilitar logs detalhados
process.env.DEBUG = 'waweb:channels:*';

// Logs específicos por canal
process.env.DEBUG = 'waweb:whatsapp,waweb:telegram';
```

---

**Todos os canais configurados e prontos para comunicação omnichannel! 🚀**