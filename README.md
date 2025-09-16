# WaWeb - Plataforma Omnichannel de Comunicação

![Node.js](https://img.shields.io/badge/Node.js-18.x-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-blue) ![Redis](https://img.shields.io/badge/Redis-7-red) ![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## 🎯 Visão Geral

O **WaWeb** é uma **plataforma omnichannel de comunicação baseada em API** que funciona como microsserviço especializado em gestão de conversas multi-canal. Foi projetado para ser consumido por aplicações externas através de APIs REST, oferecendo comunicação unificada via WhatsApp, Telegram, E-mail e Chat Web com IA.

### Características Principais

- 🔌 **API-First**: Microsserviço sem interface visual, totalmente baseado em APIs REST
- 🌐 **Omnichannel**: Suporte nativo a WhatsApp, Telegram, E-mail e Chat Web
- 🤖 **IA Integrada**: Assistente virtual Rosie com Gemini Flash 2.5
- 📨 **Sistema de Webhooks**: Notificações em tempo real para aplicações externas
- 🎯 **Gestão de Filas**: Distribuição inteligente de conversas para atendentes
- 🔐 **Autenticação JWT**: Sistema de tokens para usuários de aplicações externas
- ⚡ **Alta Performance**: Otimizado com cache, clustering e processamento assíncrono

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Aplicação     │◄───┤    WaWeb API     │◄───┤   Canais de     │
│   Externa       │    │   (Microsserviço)│    │   Comunicação   │
│                 │    │                  │    │                 │
│ • Interface UI  │    │ • Gestão         │    │ • WhatsApp      │
│ • Usuários      │    │   Contatos       │    │ • Telegram      │
│ • Lógica de     │    │ • Filas de       │    │ • E-mail        │
│   Negócio       │    │   Atendimento    │    │ • Chat Web + IA │
│                 │    │ • Conversas      │    │                 │
└─────────────────┘    │ • Mensagens      │    └─────────────────┘
                       │ • Webhooks       │
                       └──────────────────┘
```

## 📚 Documentação Completa

### 📖 Guias Principais
- **[📋 Instalação e Configuração](./INSTALLATION.md)** - Setup completo do ambiente
- **[🔗 Sistema Omnichannel](./OMNICHANNEL.md)** - Arquitetura e integração
- **[🛠️ APIs e Rotas](./API.md)** - Documentação completa das APIs

### 🔧 Documentação Técnica
- **[🤖 Serviço de IA](./docs/AI.md)** - Rosie e integração com Gemini
- **[📱 Canais de Comunicação](./docs/CHANNELS.md)** - WhatsApp, Telegram, E-mail
- **[🔐 Autenticação](./docs/AUTH.md)** - Sistema JWT e permissões

## 🚀 Início Rápido

### 1. Instalação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/waweb.git
cd waweb

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite o .env com suas configurações
```

### 2. Configuração Docker
```bash
# Inicie os serviços
docker-compose up -d

# Verifique o status
docker-compose ps
```

### 3. Primeiro Uso
```bash
# Registre um usuário
curl -X POST "http://localhost:3000/omnichannel/users?accountId=sua-empresa" \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "user-001",
    "email": "usuario@empresa.com",
    "name": "João Silva",
    "permissions": ["contacts:read", "messages:send"]
  }'

# Use o token retornado para autenticar outras requisições
```

## 🎮 Funcionalidades

### 📱 **Canais Suportados**
| Canal | Status | Recursos Principais |
|-------|--------|-------------------|
| 📱 WhatsApp | ✅ Ativo | QR Code, Mensagens, Mídia, Grupos |
| 🤖 Telegram | ✅ Ativo | Bots, Keyboards, Arquivos, Webhooks |
| 📧 E-mail | ✅ Ativo | IMAP/SMTP, Anexos, HTML, Threading |
| 💬 Chat Web | ✅ Ativo | IA Rosie, Escalação, Widget |

### 🤖 **Assistente IA Rosie**
- **Especialidade**: Gestão de contratos administrativos (Biz4Gov)
- **Modelo**: Gemini Flash 2.5
- **Escalação**: Transferência inteligente para atendentes humanos
- **Prompts**: Configuráveis via arquivos Markdown

### 🔄 **Gestão de Filas**
- **Distribuição Automática**: Baseada em disponibilidade e carga
- **Preferência de Atendente**: Manutenção de contexto por contato
- **Status Dinâmico**: Controle em tempo real pela aplicação externa

## 📊 Monitoramento

### Health Check
```bash
GET /status
```

### Métricas em Tempo Real
```bash
GET /omnichannel/stats
```

### Logs Estruturados
- Performance monitoring
- Error tracking
- Usage analytics

## 🔧 Tecnologias

### Backend
- **Node.js 18+** com TypeScript
- **Express.js** para APIs REST
- **PostgreSQL** para persistência
- **Redis** para cache e filas
- **BullMQ** para processamento assíncrono

### Integrações
- **WhatsApp Web.js** para WhatsApp
- **Telegram Bot API** para Telegram  
- **Nodemailer + IMAP** para E-mail
- **Google Gemini API** para IA

### DevOps
- **Docker & Docker Compose**
- **GitHub Actions** para CI/CD
- **Clustering** para alta disponibilidade
- **Rate Limiting** e segurança

## 🤝 Integração com Aplicações Externas

### Requisitos da Aplicação Externa
1. **Interface de Usuário**: Responsável por toda interface visual
2. **Gestão de Usuários**: Controle de acesso e permissões
3. **Webhooks**: Endpoint para receber notificações do WaWeb
4. **Autenticação**: Gerenciamento de tokens JWT

### Exemplo de Integração
```javascript
// Registrar usuário no WaWeb
const response = await fetch('/omnichannel/users?accountId=empresa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    externalUserId: 'user123',
    email: 'user@empresa.com',
    name: 'Usuário Teste',
    permissions: ['contacts:read', 'messages:send']
  })
});

const { token } = response.data;

// Usar token para autenticar requisições
const messages = await fetch('/channels/ch_123/messages', {
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  method: 'POST',
  body: JSON.stringify({
    recipientId: '+5511999999999',
    content: 'Olá! Como posso ajudá-lo?'
  })
});
```

## 📝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## 🆘 Suporte

- **Documentação**: Consulte os arquivos `.md` na raiz do projeto
- **Issues**: Reporte bugs via GitHub Issues
- **Discussões**: Use GitHub Discussions para dúvidas gerais

---

**WaWeb** - Transformando comunicação em experiências conectadas 🚀
