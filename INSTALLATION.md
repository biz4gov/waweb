# 📋 Instalação e Configuração

Este guia fornece instruções detalhadas para configurar e executar o WaWeb em diferentes ambientes.

## 📋 Pré-requisitos

### Sistema Operacional
- **Linux**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **macOS**: 10.15+ (Catalina)
- **Windows**: 10/11 com WSL2

### Software Necessário
- **Node.js**: 18.0.0 ou superior
- **npm**: 8.0.0 ou superior
- **Docker**: 20.10.0 ou superior
- **Docker Compose**: 2.0.0 ou superior
- **Git**: Para clonagem do repositório

## 🚀 Instalação Rápida com Docker

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/waweb.git
cd waweb
```

### 2. Configure as Variáveis de Ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo com suas configurações
nano .env
```

### 3. Inicie os Serviços
```bash
# Construa e inicie todos os serviços
docker-compose up -d

# Verifique o status
docker-compose ps

# Acompanhe os logs
docker-compose logs -f app
```

### 4. Verifique a Instalação
```bash
# Health check
curl http://localhost:3000/status

# Deve retornar: {"status":"ok","timestamp":"..."}
```

## ⚙️ Configuração Manual

### 1. Instalação das Dependências
```bash
# Instale as dependências do Node.js
npm install

# Instale dependências de desenvolvimento (opcional)
npm install --only=dev
```

### 2. Configuração do Banco de Dados

#### PostgreSQL
```bash
# Instale PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Crie o banco de dados
sudo -u postgres createdb whatsapp

# Configure usuário e senha
sudo -u postgres psql
postgres=# CREATE USER waweb WITH PASSWORD 'sua_senha';
postgres=# GRANT ALL PRIVILEGES ON DATABASE whatsapp TO waweb;
postgres=# \q
```

#### Redis
```bash
# Instale Redis (Ubuntu/Debian)
sudo apt install redis-server

# Configure para iniciar automaticamente
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Teste a conexão
redis-cli ping
# Deve retornar: PONG
```

### 3. Configuração do Ambiente

Edite o arquivo `.env` com suas configurações:

```bash
# Configurações Básicas
NODE_ENV=production
PORT=3000
APP_NAME=WaWeb

# Banco de Dados
DATABASE_URL=postgresql://waweb:sua_senha@localhost:5432/whatsapp

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura

# IA e Gemini
GEMINI_API_KEY=sua_chave_do_google_ai_studio
AI_DEFAULT_PROVIDER=gemini
AI_DEFAULT_MODEL=gemini-2.0-flash-exp

# WhatsApp
WHATSAPP_SESSION_PATH=./.wwebjs_auth

# Telegram
TELEGRAM_BOT_TOKEN=seu_token_do_bot_telegram

# E-mail
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USER=seu_email@gmail.com
EMAIL_IMAP_PASSWORD=sua_senha_app

EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=seu_email@gmail.com
EMAIL_SMTP_PASSWORD=sua_senha_app

# Webhooks
WEBHOOK_SECRET=chave_secreta_webhooks
```

### 4. Inicialização do Banco
```bash
# Execute as migrações (se existirem)
npm run migrate

# Ou execute o script de inicialização
npm run init-db
```

### 5. Execução da Aplicação
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start

# Com PM2 (recomendado para produção)
npm install -g pm2
pm2 start ecosystem.config.js
```

## 🔧 Configuração Avançada

### Clustering para Alta Disponibilidade
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'waweb',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### Nginx como Proxy Reverso
```nginx
# /etc/nginx/sites-available/waweb
server {
    listen 80;
    server_name sua-api.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL com Let's Encrypt
```bash
# Instale o Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenha certificado SSL
sudo certbot --nginx -d sua-api.com

# Configure renovação automática
sudo crontab -e
# Adicione: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🧪 Configuração para Desenvolvimento

### 1. Ambiente de Desenvolvimento
```bash
# Clone em modo desenvolvimento
git clone https://github.com/seu-usuario/waweb.git
cd waweb

# Instale dependências de desenvolvimento
npm install

# Configure ambiente de desenvolvimento
cp .env.example .env.development

# Inicie serviços de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Execute em modo watch
npm run dev
```

### 2. Debugging
```bash
# Debug mode
npm run debug

# Com VS Code, configure launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug WaWeb",
  "program": "${workspaceFolder}/src/index.ts",
  "env": {
    "NODE_ENV": "development"
  },
  "runtimeArgs": ["-r", "ts-node/register"]
}
```

### 3. Testes
```bash
# Execute todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes de integração
npm run test:integration

# Testes end-to-end
npm run test:e2e
```

## 📊 Monitoramento e Logs

### Configuração de Logs
```bash
# Logs estruturados com Winston
npm install winston

# PM2 logs
pm2 logs waweb

# Docker logs
docker-compose logs -f app
```

### Métricas
```bash
# Instale ferramentas de monitoramento
npm install prometheus-client

# Configure Grafana (opcional)
docker run -d -p 3001:3000 grafana/grafana
```

## 🔒 Segurança

### Configurações de Segurança
```bash
# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Rate limiting (já configurado no código)
# Autenticação JWT (já implementada)
# Validação de input (já implementada)
```

### Backup
```bash
# Script de backup do PostgreSQL
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U waweb whatsapp > backup_$DATE.sql

# Backup do Redis
redis-cli BGSAVE
```

## 🚨 Solução de Problemas

### Problemas Comuns

#### 1. Erro de Conexão com Banco
```bash
# Verifique se o PostgreSQL está rodando
sudo systemctl status postgresql

# Teste conexão
psql -h localhost -U waweb -d whatsapp
```

#### 2. Erro de Memória
```bash
# Aumente limite de memória do Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### 3. WhatsApp não Conecta
```bash
# Limpe cache do WhatsApp
rm -rf .wwebjs_auth/
rm -rf .wwebjs_cache/

# Reinicie a aplicação
```

#### 4. Permissões de Arquivo
```bash
# Ajuste permissões
sudo chown -R $USER:$USER ./
chmod -R 755 ./
```

### Logs de Debug
```bash
# Habilite logs detalhados
export DEBUG=waweb:*

# Ou no .env
DEBUG=waweb:*
LOG_LEVEL=debug
```

## 📞 Suporte

### Contatos
- **Issues**: GitHub Issues para bugs e problemas
- **Discussions**: GitHub Discussions para dúvidas
- **Email**: suporte@waweb.com

### Recursos Úteis
- [Documentação do WhatsApp Web.js](https://wwebjs.dev/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Gemini API](https://ai.google.dev/)
- [Docker Documentation](https://docs.docker.com/)

---

## ✅ Checklist de Instalação

- [ ] Node.js 18+ instalado
- [ ] Docker e Docker Compose configurados
- [ ] Repositório clonado
- [ ] Arquivo `.env` configurado
- [ ] Banco PostgreSQL rodando
- [ ] Redis rodando
- [ ] Aplicação iniciada com sucesso
- [ ] Health check retornando OK
- [ ] Primeiro usuário registrado
- [ ] Webhook configurado (se aplicável)

**Parabéns! 🎉 Sua instalação do WaWeb está completa e pronta para uso.**