// Versão 4
import pool from '../../database/db';
import { v4 as uuidv4 } from 'uuid';
class AgentService {
    /**
     * Encontra ou cria um agente BOT padrão para uma conta.
     * Este agente pode ser usado para triagem inicial de conversas.
     * @param accountId O ID da conta.
     * @returns O ID do agente de triagem.
     */
    async findOrCreateTriageBot(accountId) {
        const botName = 'Triage Bot';
        const findQuery = `SELECT id FROM agents WHERE account_id = $1 AND name = $2 AND type = 'BOT'`;
        let res = await pool.query(findQuery, [accountId, botName]);
        if (res.rowCount > 0) {
            return res.rows[0].id;
        }
        console.log(`Criando agente '${botName}' padrão para a conta ${accountId}`);
        const insertQuery = `
      INSERT INTO agents (id, account_id, name, type, status, config)
      VALUES ($1, $2, $3, 'BOT', 'ONLINE', $4)
      RETURNING id
    `;
        const botConfig = { description: 'Agente de IA para triagem e roteamento inicial.' };
        res = await pool.query(insertQuery, [uuidv4(), accountId, botName, botConfig]);
        return res.rows[0].id;
    }
}
export const agentService = new AgentService();
//# sourceMappingURL=AgentService.js.map