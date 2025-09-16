// Versão 5
import pool from '../../database/db';

class RoutingService {
  /**
   * Determina qual agente deve ser responsável por uma conversa.
   * Regras:
   * 1. Se é uma nova conversa, atribui ao Bot de Triagem.
   * 2. Se a conversa existe e o agente anterior está ativo, mantém o agente (stickiness).
   * 3. Se o agente anterior está inativo, encontra o agente humano online há mais tempo livre.
   */
  public async getAssignedAgent(accountId: string, contactId: string, channelId: string): Promise<string> {
    // Primeiro, verifica se já existe uma conversa
    const convQuery = `
      SELECT agent_id FROM conversations 
      WHERE account_id = $1 AND contact_id = $2 AND channel_id = $3
    `;
    const convRes = await pool.query(convQuery, [accountId, contactId, channelId]);

    if (convRes.rowCount > 0) { // Conversa já existe
      const previousAgentId = convRes.rows[0].agent_id;
      if (previousAgentId) {
        // Verifica o status do agente anterior
        const agentQuery = `SELECT status, type FROM agents WHERE id = $1`;
        const agentRes = await pool.query(agentQuery, [previousAgentId]);

        if (agentRes.rowCount > 0) {
          const agent = agentRes.rows[0];
          // Se o agente for humano e estiver online, ou se for um bot, mantém ele.
          if (agent.type === 'BOT' || agent.status === 'ONLINE') {
            console.log(`[Routing] Mantendo agente ${previousAgentId} (Stickiness).`);
            return previousAgentId;
          }
        }
      }
    } else { // É uma nova conversa, sempre vai para o Bot de Triagem
      console.log('[Routing] Nova conversa, atribuindo ao Triage Bot.');
      return this.findTriageBot(accountId);
    }
    
    // Fallback: Se a conversa é nova ou o agente anterior está offline,
    // encontramos o próximo agente humano disponível.
    console.log('[Routing] Agente anterior inativo ou não encontrado. Buscando novo agente humano.');
    return this.findNextAvailableHumanAgent(accountId);
  }

  private async findTriageBot(accountId: string): Promise<string> {
    const query = `SELECT id FROM agents WHERE account_id = $1 AND type = 'BOT' LIMIT 1`;
    const res = await pool.query(query, [accountId]);
    if (res.rowCount === 0) throw new Error('Nenhum Triage Bot configurado para a conta.');
    return res.rows[0].id;
  }

  private async findNextAvailableHumanAgent(accountId: string): Promise<string> {
    // Encontra o agente humano ONLINE que foi atribuído há mais tempo (ou nunca).
    const query = `
      SELECT id FROM agents
      WHERE account_id = $1 AND type = 'HUMAN' AND status = 'ONLINE'
      ORDER BY last_assignment_at ASC NULLS FIRST
      LIMIT 1
    `;
    const res = await pool.query(query, [accountId]);
    if (res.rowCount === 0) {
      console.warn(`[Routing] Nenhum agente humano online. Retornando ao Triage Bot.`);
      return this.findTriageBot(accountId);
    }
    return res.rows[0].id;
  }
}

export const routingService = new RoutingService();