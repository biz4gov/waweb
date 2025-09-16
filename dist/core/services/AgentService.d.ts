declare class AgentService {
    /**
     * Encontra ou cria um agente BOT padrão para uma conta.
     * Este agente pode ser usado para triagem inicial de conversas.
     * @param accountId O ID da conta.
     * @returns O ID do agente de triagem.
     */
    findOrCreateTriageBot(accountId: string): Promise<string>;
}
export declare const agentService: AgentService;
export {};
