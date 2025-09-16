# 🤖 Serviço de IA - DiDi e Integração com Gemini

Este documento detalha o serviço de Inteligência Artificial do WaWeb, incluindo a assistente virtual DiDi e a integração com Google Gemini Flash 2.5.

## 🧠 Visão Geral

O serviço de IA do WaWeb oferece:
- **Assistente Virtual DiDi**: Especializada em gestão de contratos administrativos
- **Múltiplos Provedores**: Suporte a Gemini, OpenAI e provedores customizados
- **Prompts Dinâmicos**: Sistema de prompts editáveis em Markdown
- **Escalação Inteligente**: Transferência automática para atendentes humanos

## 👩‍💼 DiDi - Assistente Executiva

### Identidade e Especialização
DiDi é uma assistente virtual com as seguintes características:

**Perfil Profissional:**
- Assistente Executiva Senior da Biz4Gov Serviços e Consultoria Ltda
- Formação em Direito com 10+ anos de experiência
- Especialista em contratos administrativos (federal, estadual, municipal)
- Expertise em todo ciclo: Editais, Propostas, Documentação, Entregas, Garantias

**Competências Técnicas:**
- Gestão de dados e planilhas de controle
- Elaboração de relatórios gerenciais
- Comunicação multicanal (email, chat, WhatsApp)
- Consultoria em Atas de Registro de Preços
- Pesquisa especializada com AI Agent (ALTER-EGO)

### Configuração do Prompt

O prompt da DiDi está em `/prompts/didi-biz4gov.md` e inclui:

```markdown
## IDENTIDADE E CONTEXTO PROFISSIONAL
Você é **DiDi**, Assistente Executiva Senior da **Biz4Gov**...

## COMPETÊNCIAS TÉCNICAS E FERRAMENTAS
### Capacidades Operacionais
- **Gestão de Dados:** Manutenção e atualização de planilhas...
- **Inteligência Analítica:** Elaboração de relatórios gerenciais...

## PROTOCOLOS DE ATENDIMENTO
### Fluxo de Primeira Interação
1. **Apresentação Profissional**
2. **Confirmação de Entendimento**
3. **Processamento**
4. **Resposta Objetiva**
```

### Substituições Dinâmicas
O sistema substitui automaticamente variáveis no prompt:
- `{{ $now }}`: Data e hora atual em português brasileiro

## 🔧 Integração com Google Gemini

### Configuração
```bash
# .env
GEMINI_API_KEY=sua_chave_do_google_ai_studio
AI_DEFAULT_PROVIDER=gemini
AI_DEFAULT_MODEL=gemini-2.0-flash-exp
```

### Modelos Suportados
- `gemini-2.0-flash-exp` (Recomendado)
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-pro`

### Configurações de Segurança
```javascript
safetySettings: [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  }
]
```

## 🔄 Sistema de Prompts

### Estrutura de Arquivos
```
prompts/
├── didi-biz4gov.md          # Assistente especializada
├── customer-service.md       # Atendimento geral
└── temp/                     # Prompts temporários
```

### Formato dos Prompts
Os prompts são arquivos Markdown com configurações específicas:

```markdown
# Nome do Assistente

## Configurações
- **Temperatura:** 0.3
- **Máximo de tokens:** 800
- **Modelo:** gemini-2.0-flash-exp

## Instruções
[Conteúdo do prompt...]
```

### Parsing Automático
O sistema extrai automaticamente:
- **Título**: Primeira linha com `#`
- **Temperatura**: Extraída de "Temperatura: X.X"
- **Max Tokens**: Extraído de "tokens: XXX"
- **Sistema**: Todo o conteúdo do arquivo

## 🚀 APIs do Serviço de IA

### Chat com IA
```http
POST /ai/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "conversationId": "conv-123",
  "message": "Preciso de informações sobre empenho 2024NE000123",
  "promptId": "didi-biz4gov",
  "providerId": "gemini"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
  "content": "Olá! Sou DiDi, Assistente Executiva da Biz4Gov. Sobre o empenho 2024NE000123, posso verificar o status atual...",
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

### Verificação de Escalação
```http
POST /ai/escalation-check
Authorization: Bearer {token}
Content-Type: application/json

{
  "conversationId": "conv-123",
  "message": "call.received"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "shouldEscalate": true,
    "reason": "Chamada telefônica detectada",
    "confidence": 1.0
  }
}
```

### Gerenciamento de Prompts
```http
# Listar prompts
GET /ai/prompts

# Recarregar prompt específico
POST /ai/prompts/didi-biz4gov/reload

# Recarregar todos os prompts
POST /ai/prompts/reload-all
```

### Teste de Provedores
```http
POST /ai/providers/gemini/test
```

## 🧠 Lógica de Escalação

### Palavras-chave de Escalação
```javascript
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
```

### Critérios Automáticos
1. **Palavras-chave**: Detecção de termos específicos
2. **Comprimento da conversa**: Escalação após 15 mensagens
3. **Sinais especiais**: `call.received` para chamadas
4. **Análise de sentimento**: Frustração alta detectada

### Resposta da DiDi para Escalação
```
"Esta funcionalidade está em desenvolvimento. Posso atendê-lo via mensagem de texto ou áudio transcrito para oferecer o mesmo nível de qualidade."
```

## 🔧 Configuração Avançada

### Multiple Providers
```javascript
// Configurar múltiplos provedores
const providers = {
  gemini: {
    type: 'gemini',
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash-exp'
  },
  openai: {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  }
};
```

### Contexto de Conversa
```javascript
interface ConversationContext {
  conversationId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentPromptId: string;
  metadata: Record<string, any>;
}
```

### Limitação de Tokens
- **Máximo por conversa**: 20 mensagens
- **Conservação de contexto**: Mantém prompt do sistema + últimas 19 mensagens
- **Otimização automática**: Remove mensagens antigas para evitar overflow

## 📊 Monitoramento e Métricas

### Métricas Coletadas
- Número de conversas por IA
- Tokens utilizados por modelo
- Taxa de escalação
- Tempo de resposta
- Precisão das respostas

### Logs Estruturados
```javascript
console.log('🤖 AI response generated', {
  conversationId,
  provider: response.provider,
  model: response.model,
  tokens: response.usage?.totalTokens,
  responseTime: Date.now() - startTime
});
```

## 🧪 Testes e Desenvolvimento

### Teste Local
```bash
# Testar conexão com Gemini
curl -X POST http://localhost:3000/ai/providers/gemini/test \
  -H "Authorization: Bearer $TOKEN"

# Chat de teste
curl -X POST http://localhost:3000/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv",
  "message": "Olá DiDi, me fale sobre contratos públicos",
  "promptId": "didi-biz4gov"
  }'
```

### Desenvolvimento de Prompts
1. Edite o arquivo em `/prompts/`
2. Use `/ai/prompts/{id}/reload` para recarregar
3. Teste com `/ai/chat`
4. Monitore via logs

### Simulação de Escalação
```bash
# Teste de escalação por palavra-chave
curl -X POST http://localhost:3000/ai/escalation-check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv",
    "message": "Quero falar com um atendente humano!"
  }'
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Erro de API Key do Gemini
```bash
# Verifique se a chave está correta
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

#### 2. Prompt não Carregado
```bash
# Verifique se o arquivo existe
ls -la prompts/didi-biz4gov.md

# Recarregue manualmente
curl -X POST http://localhost:3000/ai/prompts/didi-biz4gov/reload
```

#### 3. Timeout nas Respostas
```javascript
// Ajustar timeout no código
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

fetch(url, {
  signal: controller.signal,
  // ... outras opções
});
```

#### 4. Quota Excedida
- Verifique limites da API do Gemini
- Configure fallback para OpenAI
- Implemente rate limiting

## 🔮 Funcionalidades Futuras

### Planejadas
- **Análise de Sentimento**: Detecção automática de humor
- **Busca Semântica**: Integração com banco de dados vetorial
- **Múltiplas Personalidades**: Diferentes assistentes por contexto
- **Aprendizado Contínuo**: Melhoria baseada em feedback
- **Integração SQL**: Consultas diretas ao banco via IA

### Em Desenvolvimento
- **DiDi 2.0**: Versão com memória persistente
- **Plugin System**: Extensões personalizadas
- **Voice Integration**: Suporte a áudio
- **Analytics Dashboard**: Métricas avançadas

## 📚 Recursos Adicionais

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

---

**DiDi está pronta para transformar o atendimento da Biz4Gov! 🚀**