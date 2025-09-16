declare class RoutingService {
    /**
     * Determina qual agente deve ser responsável por uma conversa.
     * Regras:
     * 1. Se é uma nova conversa, atribui ao Bot de Triagem.
     * 2. Se a conversa existe e o agente anterior está ativo, mantém o agente (stickiness).
     * 3. Se o agente anterior está inativo, encontra o agente humano online há mais tempo livre.
     */
    getAssignedAgent(accountId: string, contactId: string, channelId: string): Promise<string>;
    private findTriageBot;
    private findNextAvailableHumanAgent;
}
export declare const routingService: RoutingService;
export {};
