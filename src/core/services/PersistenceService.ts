// Versão 3
import pool from '../../database/db';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

// Este serviço encapsula toda a lógica de persistência.
// Usamos o padrão "findOrCreate" para evitar duplicações.
class PersistenceService {

  // Encontra um contato pelo número de telefone ou o cria se não existir.
  public async findOrCreateContact(accountId: string, phoneNumber: string, name?: string) {
    const findQuery = `SELECT id FROM contacts WHERE account_id = $1 AND identifiers->>'phone' = $2`;
    let res = await pool.query(findQuery, [accountId, phoneNumber]);

    if (res.rowCount > 0) {
      return res.rows[0];
    }

    const identifiers = { phone: phoneNumber };
    const insertQuery = `INSERT INTO contacts (id, account_id, name, identifiers) VALUES ($1, $2, $3, $4) RETURNING id`;
    res = await pool.query(insertQuery, [uuidv4(), accountId, name || phoneNumber, identifiers]);
    return res.rows[0];
  }
  
  public async updateAgentAssignmentTimestamp(agentId: string) {
    const query = `UPDATE agents SET last_assignment_at = NOW() WHERE id = $1`;
    await pool.query(query, [agentId]);
  }

  // Encontra uma conversa ou a cria se não existir.
  // ATUALIZADO: Agora aceita um agentId para associar à conversa.
  public async findOrCreateConversation(accountId: string, channelId: string, contactId: string, agentId: string) {
    const findQuery = `SELECT id FROM conversations WHERE channel_id = $1 AND contact_id = $2`;
    let res = await pool.query(findQuery, [channelId, contactId]);

    if (res.rowCount > 0) {
      // Dica: Mesmo que a conversa já exista, podemos querer atualizar o 'updated_at' ou reatribuir o agente.
      // Por simplicidade, por enquanto, apenas retornamos o ID existente.
      return res.rows[0];
    }

    // Se a conversa é nova, ela é criada já associada ao agente.
    const insertQuery = `INSERT INTO conversations (id, account_id, channel_id, contact_id, agent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    res = await pool.query(insertQuery, [uuidv4(), accountId, channelId, contactId, agentId]);
    return res.rows[0];
  }

  // Insere uma nova mensagem no banco de dados.
  public async insertMessage(data: {
    conversationId: string;
    channelMessageId: string;
    direction: 'INBOUND' | 'OUTBOUND';
    content: string | null;
    sentAt: Date;
    attachment?: object;
    channelSpecificData?: object;
  }) {
    const query = `
      INSERT INTO messages (id, conversation_id, channel_message_id, direction, content, sent_at, attachment, channel_specific_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const values = [
      uuidv4(),
      data.conversationId,
      data.channelMessageId,
      data.direction,
      data.content,
      data.sentAt,
      data.attachment ? JSON.stringify(data.attachment) : null,
      data.channelSpecificData ? JSON.stringify(data.channelSpecificData) : null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

    // CREATE
  public async createWebhook(accountId: string, eventType: string, targetUrl: string) {
    const secretKey = `whsec_${randomBytes(24).toString('hex')}`; // Gera um segredo seguro
    const query = `
      INSERT INTO webhooks (id, account_id, event_type, target_url, secret_key)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, event_type, target_url, is_active, created_at
    `;
    // Nota de segurança: O secret_key é retornado APENAS na criação.
    const res = await pool.query(query, [uuidv4(), accountId, eventType, targetUrl, secretKey]);
    return { ...res.rows[0], secretKey }; // Adicionamos o segredo ao retorno para o usuário salvar.
  }

  // READ (List)
  public async listWebhooksByAccount(accountId: string) {
    const query = `
      SELECT id, event_type, target_url, is_active, created_at FROM webhooks
      WHERE account_id = $1 ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [accountId]);
    return res.rows;
  }

  // READ (By ID)
  public async findWebhookById(webhookId: string, accountId: string) {
    const query = `
      SELECT id, event_type, target_url, is_active, created_at FROM webhooks
      WHERE id = $1 AND account_id = $2
    `;
    const res = await pool.query(query, [webhookId, accountId]);
    return res.rows[0] || null;
  }

  // UPDATE
  public async updateWebhook(webhookId: string, accountId: string, data: { targetUrl?: string; isActive?: boolean }) {
    const findQuery = `SELECT id FROM webhooks WHERE id = $1 AND account_id = $2`;
    const findRes = await pool.query(findQuery, [webhookId, accountId]);
    if (findRes.rowCount === 0) return null; // Não encontrado ou não pertence à conta

    const fields = Object.entries(data).filter(([_, value]) => value !== undefined);
    if (fields.length === 0) return this.findWebhookById(webhookId, accountId);

    const setClause = fields.map(([key], i) => `${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = $${i + 1}`).join(', ');
    const values = fields.map(([_, value]) => value);

    const updateQuery = `
      UPDATE webhooks SET ${setClause} WHERE id = $${values.length + 1} AND account_id = $${values.length + 2}
      RETURNING id, event_type, target_url, is_active, created_at
    `;
    const res = await pool.query(updateQuery, [...values, webhookId, accountId]);
    return res.rows[0];
  }

  // DELETE
  public async deleteWebhook(webhookId: string, accountId: string): Promise<boolean> {
    const query = `DELETE FROM webhooks WHERE id = $1 AND account_id = $2`;
    const res = await pool.query(query, [webhookId, accountId]);
    return res.rowCount > 0;
  }

    public async findAgentByEmail(accountId: string, email: string) {
    const query = `SELECT * FROM agents WHERE account_id = $1 AND email = $2`;
    const res = await pool.query(query, [accountId, email]);
    return res.rows[0] || null;
  }

  public async createAgent(data: { accountId: string, name: string, email: string, password_plain: string }) {
    // Criptografa a senha antes de salvar
    const hashedPassword = await bcrypt.hash(data.password_plain, 10);
    
    const query = `
      INSERT INTO agents (id, account_id, name, email, password, type)
      VALUES ($1, $2, $3, $4, $5, 'HUMAN')
      RETURNING id, name, email, type, created_at
    `;
    const values = [uuidv4(), data.accountId, data.name, data.email, hashedPassword];
    const res = await pool.query(query, values);
    return res.rows[0];
  }

    // NOVO: Verifica a conectividade com o banco de dados.
  public async getDatabaseStatus() {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', message: 'Conexão bem-sucedida.' };
    } catch (error: any) {
      return { status: 'error', message: error.message };
    }
  }

  // NOVO: Conta as mensagens processadas em diferentes intervalos.
  public async getMessageCounts() {
    try {
      const query = `
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN sent_at > NOW() - interval '24 hours' THEN 1 END) AS last_24_hours,
          COUNT(CASE WHEN sent_at > NOW() - interval '1 hour' THEN 1 END) AS last_hour
        FROM messages
      `;
      const res = await pool.query(query);
      // Os valores retornam como string, convertemos para número.
      return {
          total: parseInt(res.rows[0].total, 10),
          last_24_hours: parseInt(res.rows[0].last_24_hours, 10),
          last_hour: parseInt(res.rows[0].last_hour, 10),
      };
    } catch (error) {
      return null;
    }
  }
}

export const persistenceService = new PersistenceService();