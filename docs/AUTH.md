# 🔐 Sistema de Autenticação JWT

Este documento detalha o sistema de autenticação JWT do WaWeb, incluindo registro de usuários externos, gerenciamento de tokens e controle de permissões.

## 🎯 Visão Geral

O sistema de autenticação do WaWeb foi projetado para:
- **Usuários Externos**: Cada usuário da aplicação cliente deve ser registrado no WaWeb
- **Tokens Únicos**: Cada usuário recebe um token JWT distinto
- **Permissões Granulares**: Controle fino de acesso por funcionalidade
- **Multi-tenant**: Suporte a múltiplas empresas/accounts
- **Segurança**: Validação rigorosa e expiração de tokens

## 🏗️ Arquitetura de Autenticação

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Aplicação     │    │    WaWeb Auth    │    │   Recursos      │
│   Externa       │    │    Service       │    │   Protegidos    │
│                 │    │                  │    │                 │
│ 1. Registra     │───►│ 2. Cria usuário  │    │ • Contatos      │
│    usuário      │    │    e gera token  │    │ • Mensagens     │
│                 │    │                  │    │ • Agentes       │
│ 3. Usa token    │───►│ 4. Valida token  │───►│ • Conversas     │
│    nas requests │    │    e permissões  │    │ • Estatísticas  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 👤 Gerenciamento de Usuários

### Estrutura do Usuário
```typescript
interface RegisteredUser {
  externalUserId: string;      // ID na aplicação externa
  accountId: string;           // ID da empresa/account
  email: string;               // E-mail do usuário
  name: string;                // Nome completo
  permissions: string[];       // Lista de permissões
  isActive: boolean;           // Status ativo/inativo
  metadata: Record<string, any>; // Dados adicionais
  createdAt: Date;             // Data de criação
  updatedAt: Date;             // Última atualização
}
```

### Registro de Usuário
```http
POST /omnichannel/users?accountId=empresa-123
Content-Type: application/json

{
  "externalUserId": "user-456",
  "email": "joao@empresa.com",
  "name": "João Silva",
  "permissions": [
    "contacts:read",
    "contacts:write",
    "messages:send",
    "conversations:read"
  ],
  "metadata": {
    "department": "Atendimento",
    "role": "Supervisor",
    "timezone": "America/Sao_Paulo"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "externalUserId": "user-456",
      "accountId": "empresa-123",
      "email": "joao@empresa.com",
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

## 🎫 Sistema de Tokens JWT

### Estrutura do Token
```typescript
interface JWTPayload {
  sub: string;           // externalUserId
  accountId: string;     // ID da empresa
  permissions: string[]; // Lista de permissões
  iat: number;          // Issued at
  exp: number;          // Expiration
}
```

### Geração de Token
```javascript
// Exemplo de payload do token
{
  "sub": "user-456",
  "accountId": "empresa-123",
  "permissions": [
    "contacts:read",
    "contacts:write",
    "messages:send"
  ],
  "iat": 1642258200,
  "exp": 1642344600
}
```

### Renovação de Token
```http
POST /omnichannel/users/user-456/token?accountId=empresa-123
```

**Resposta:**
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

## 🔑 Sistema de Permissões

### Permissões Disponíveis

#### Contatos
- `contacts:read` - Consultar contatos
- `contacts:write` - Criar/editar contatos
- `contacts:delete` - Remover contatos

#### Conversas
- `conversations:read` - Visualizar conversas
- `conversations:write` - Participar de conversas
- `conversations:assign` - Atribuir conversas

#### Mensagens
- `messages:read` - Ler mensagens
- `messages:send` - Enviar mensagens
- `messages:delete` - Deletar mensagens

#### Agentes
- `agents:read` - Consultar agentes
- `agents:write` - Gerenciar agentes
- `agents:assign` - Atribuir agentes

#### Canais
- `channels:read` - Consultar canais
- `channels:write` - Configurar canais
- `channels:admin` - Administrar canais

#### Estatísticas
- `stats:read` - Consultar estatísticas
- `stats:export` - Exportar relatórios

#### Administração
- `admin` - Acesso total (substitui todas as outras)
- `users:manage` - Gerenciar usuários
- `webhooks:manage` - Configurar webhooks

### Verificação de Permissões
```javascript
// Middleware de autenticação com permissões específicas
router.get('/contacts', 
  authService.authenticateRequest(['contacts:read']),
  async (req, res) => {
    // Código do endpoint...
  }
);

// Múltiplas permissões (OR)
router.post('/messages',
  authService.authenticateRequest(['messages:send', 'admin']),
  async (req, res) => {
    // Usuário precisa ter messages:send OU admin
  }
);
```

## 🛡️ Middleware de Autenticação

### Implementação
```typescript
interface AuthenticatedRequest extends Request {
  user?: {
    externalUserId: string;
    accountId: string;
    permissions: string[];
    metadata?: Record<string, any>;
  };
}

const authenticateRequest = (requiredPermissions?: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // 1. Extrair token do header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Authorization token required',
          code: 'AUTH_TOKEN_MISSING'
        });
      }

      // 2. Verificar e decodificar token
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, secretKey) as JWTPayload;

      // 3. Verificar se usuário ainda existe e está ativo
      const user = getUserByExternalId(payload.accountId, payload.sub);
      if (!user?.isActive) {
        return res.status(401).json({
          error: 'User not found or inactive',
          code: 'AUTH_USER_INACTIVE'
        });
      }

      // 4. Verificar permissões se necessário
      if (requiredPermissions?.length > 0) {
        const hasPermission = requiredPermissions.some(permission => 
          payload.permissions.includes(permission) || 
          payload.permissions.includes('admin')
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            required: requiredPermissions,
            current: payload.permissions
          });
        }
      }

      // 5. Anexar informações do usuário ao request
      req.user = {
        externalUserId: payload.sub,
        accountId: payload.accountId,
        permissions: payload.permissions,
        metadata: user.metadata
      };

      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }
  };
};
```

### Uso do Middleware
```javascript
// Sem verificação de permissões específicas
app.get('/profile', authService.authenticateRequest(), (req, res) => {
  res.json({ user: req.user });
});

// Com permissões específicas
app.get('/contacts', 
  authService.authenticateRequest(['contacts:read']), 
  getContacts
);

// Múltiplas permissões
app.post('/admin/users',
  authService.authenticateRequest(['users:manage', 'admin']),
  createUser
);
```

## 🔧 Configuração e Segurança

### Variáveis de Ambiente
```bash
# .env
JWT_SECRET=sua_chave_secreta_muito_forte_e_complexa
JWT_EXPIRES_IN=24h
JWT_ISSUER=waweb-api
JWT_AUDIENCE=external-applications

# Opcional: Configurações avançadas
JWT_ALGORITHM=HS256
JWT_NOT_BEFORE=0s
JWT_REFRESH_THRESHOLD=1h
```

### Configurações de Segurança
```javascript
// Configuração do JWT
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  issuer: process.env.JWT_ISSUER || 'waweb',
  audience: process.env.JWT_AUDIENCE || 'external-app',
  algorithm: 'HS256'
};

// Rate limiting por usuário
const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req) => {
    // Admin tem limite maior
    return req.user?.permissions.includes('admin') ? 1000 : 100;
  },
  keyGenerator: (req) => `${req.user?.accountId}:${req.user?.externalUserId}`,
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
```

## 📊 Auditoria e Logs

### Log de Autenticação
```javascript
// Log de login bem-sucedido
console.log('🔐 User authenticated', {
  externalUserId: payload.sub,
  accountId: payload.accountId,
  permissions: payload.permissions,
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
});

// Log de falha de autenticação
console.warn('❌ Authentication failed', {
  reason: 'Invalid token',
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
});
```

### Auditoria de Permissões
```javascript
// Log de tentativa de acesso negado
console.warn('🚫 Access denied', {
  externalUserId: req.user?.externalUserId,
  accountId: req.user?.accountId,
  requiredPermissions,
  userPermissions: req.user?.permissions,
  endpoint: req.path,
  method: req.method
});
```

## 🧪 Testes de Autenticação

### Teste de Registro de Usuário
```javascript
describe('User Registration', () => {
  it('should register new user and return token', async () => {
    const response = await request(app)
      .post('/omnichannel/users?accountId=test-account')
      .send({
        externalUserId: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        permissions: ['contacts:read']
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.externalUserId).toBe('test-user');
  });
});
```

### Teste de Middleware de Autenticação
```javascript
describe('Authentication Middleware', () => {
  let token;

  beforeEach(async () => {
    // Criar usuário e obter token
    const userResponse = await createTestUser();
    token = userResponse.body.data.token;
  });

  it('should allow access with valid token', async () => {
    await request(app)
      .get('/omnichannel/contacts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should deny access without token', async () => {
    await request(app)
      .get('/omnichannel/contacts')
      .expect(401);
  });

  it('should deny access with invalid permissions', async () => {
    await request(app)
      .post('/omnichannel/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({ /* agent data */ })
      .expect(403);
  });
});
```

### Teste de Permissões
```javascript
describe('Permissions System', () => {
  it('should allow admin to access all endpoints', async () => {
    const adminToken = await createUserWithPermissions(['admin']);
    
    // Testar vários endpoints
    const endpoints = [
      '/omnichannel/contacts',
      '/omnichannel/agents',
      '/omnichannel/stats'
    ];

    for (const endpoint of endpoints) {
      await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    }
  });
});
```

## 🔄 Integração com Aplicação Externa

### Fluxo de Integração
```javascript
// 1. Na aplicação externa - Login do usuário
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Autenticar usuário localmente
  const user = await authenticateUser(email, password);
  
  if (user) {
    // Registrar/atualizar no WaWeb
    const wawebResponse = await fetch(`${WAWEB_API}/omnichannel/users?accountId=${ACCOUNT_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalUserId: user.id,
        email: user.email,
        name: user.name,
        permissions: getUserPermissions(user.role)
      })
    });
    
    const wawebData = await wawebResponse.json();
    
    // Retornar ambos os tokens
    res.json({
      localToken: generateLocalToken(user),
      wawebToken: wawebData.data.token
    });
  }
});

// 2. Usar token nas requisições para WaWeb
const sendMessageToWaWeb = async (wawebToken, message) => {
  return fetch(`${WAWEB_API}/channels/ch_123/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${wawebToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });
};
```

### Renovação Automática de Token
```javascript
// Interceptor para renovação automática
const wawebApiClient = axios.create();

wawebApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado, renovar
      const newToken = await renewWaWebToken(currentUser.id);
      
      // Repetir requisição original
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## 🚨 Segurança e Boas Práticas

### Proteções Implementadas
1. **Rate Limiting**: Limite de requisições por usuário
2. **JWT Validation**: Verificação rigorosa de tokens
3. **Permission Checking**: Controle granular de acesso
4. **User Status**: Verificação de usuários ativos
5. **Secure Headers**: Headers de segurança configurados

### Boas Práticas
```javascript
// 1. Rotação de chaves JWT (recomendado)
const rotateJWTSecret = () => {
  // Implementar rotação periódica da chave secreta
};

// 2. Blacklist de tokens (para logout forçado)
const blacklistedTokens = new Set();

const isTokenBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

// 3. Logs de segurança
const logSecurityEvent = (event, details) => {
  console.log(`🔒 SECURITY: ${event}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
};
```

### Troubleshooting Comum

#### Token Inválido
```bash
# Verificar estrutura do token
echo "eyJhbGc..." | base64 -d

# Verificar expiração
node -e "console.log(new Date(1642344600 * 1000))"
```

#### Permissões Negadas
```javascript
// Debug de permissões
console.log('Required:', requiredPermissions);
console.log('User has:', req.user.permissions);
console.log('Has admin:', req.user.permissions.includes('admin'));
```

---

**Sistema de autenticação JWT robusto e seguro para integração omnichannel! 🔐**