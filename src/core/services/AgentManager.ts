import { EventEmitter } from 'events';
import type { 
  Agent, 
  ExternalAgent, 
  AgentRegistrationRequest,
  AgentStatusUpdateRequest 
} from '../../types/index.js';

interface AgentQueue {
  agentId: string;
  currentChats: string[];
  lastAssignment: Date;
  isAvailable: boolean;
}

class AgentManager extends EventEmitter {
  private agents = new Map<string, Agent>();
  private externalToInternalMap = new Map<string, string>();
  private agentQueues = new Map<string, AgentQueue>();
  private conversationAssignments = new Map<string, string>(); // conversationId -> agentId

  constructor() {
    super();
  }

  public async registerAgent(
    accountId: string,
    request: AgentRegistrationRequest
  ): Promise<Agent> {
    try {
      // Check if agent already exists
      const existingAgentId = this.externalToInternalMap.get(
        `${accountId}:${request.externalAgentId}`
      );

      if (existingAgentId) {
        const existingAgent = this.agents.get(existingAgentId);
        if (existingAgent) {
          // Update existing agent
          existingAgent.name = request.name;
          existingAgent.email = request.email;
          existingAgent.type = request.type;
          existingAgent.isActive = request.isActive;
          existingAgent.maxConcurrentChats = request.maxConcurrentChats || 5;
          existingAgent.skills = request.skills || [];
          existingAgent.metadata = { ...existingAgent.metadata, ...request.metadata };
          existingAgent.updatedAt = new Date();
          
          // Update queue status
          this.updateAgentQueue(existingAgent.id, request.isActive);
          
          console.log(`📝 Agent updated: ${request.externalAgentId}`);
          this.emit('agentUpdated', existingAgent);
          return existingAgent;
        }
      }

      // Create new agent
      const agentId = this.generateAgentId();
      const agent: Agent = {
        id: agentId,
        externalAgentId: request.externalAgentId,
        accountId,
        name: request.name,
        email: request.email,
        type: request.type,
        isOnline: false,
        isActive: request.isActive,
        maxConcurrentChats: request.maxConcurrentChats || 5,
        currentChatCount: 0,
        skills: request.skills || [],
        metadata: request.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.agents.set(agentId, agent);
      this.externalToInternalMap.set(`${accountId}:${request.externalAgentId}`, agentId);
      
      // Initialize queue
      this.agentQueues.set(agentId, {
        agentId,
        currentChats: [],
        lastAssignment: new Date(),
        isAvailable: request.isActive
      });

      console.log(`👨‍💼 New agent registered: ${request.externalAgentId} (${request.type})`);
      this.emit('agentRegistered', agent);
      
      return agent;
    } catch (error) {
      console.error('Error registering agent:', error);
      throw error;
    }
  }

  public async updateAgentStatus(
    accountId: string,
    request: AgentStatusUpdateRequest
  ): Promise<Agent | null> {
    try {
      const agentId = this.externalToInternalMap.get(`${accountId}:${request.externalAgentId}`);
      if (!agentId) {
        console.warn(`Agent not found: ${request.externalAgentId}`);
        return null;
      }

      const agent = this.agents.get(agentId);
      if (!agent) {
        return null;
      }

      agent.isActive = request.isActive;
      agent.metadata = { ...agent.metadata, ...request.metadata };
      agent.updatedAt = new Date();

      // Update queue availability
      this.updateAgentQueue(agentId, request.isActive);

      console.log(`🔄 Agent status updated: ${request.externalAgentId} -> ${request.isActive ? 'active' : 'inactive'}`);
      this.emit('agentStatusUpdated', agent);
      
      return agent;
    } catch (error) {
      console.error('Error updating agent status:', error);
      throw error;
    }
  }

  public async findAgentByExternalId(
    accountId: string,
    externalAgentId: string
  ): Promise<Agent | null> {
    const agentId = this.externalToInternalMap.get(`${accountId}:${externalAgentId}`);
    if (!agentId) {
      return null;
    }
    return this.agents.get(agentId) || null;
  }

  public async findAgentById(agentId: string): Promise<Agent | null> {
    return this.agents.get(agentId) || null;
  }

  public async assignAgentToConversation(
    accountId: string,
    conversationId: string,
    preferredExternalAgentId?: string,
    requiredSkills?: string[]
  ): Promise<Agent | null> {
    try {
      // Check for preferred agent first
      if (preferredExternalAgentId) {
        const preferredAgent = await this.findAgentByExternalId(accountId, preferredExternalAgentId);
        if (preferredAgent && this.isAgentAvailable(preferredAgent.id)) {
          await this.assignConversation(preferredAgent.id, conversationId);
          return preferredAgent;
        }
      }

      // Find best available agent
      const availableAgent = this.findBestAvailableAgent(accountId, requiredSkills);
      if (availableAgent) {
        await this.assignConversation(availableAgent.id, conversationId);
        return availableAgent;
      }

      console.warn(`No available agent found for conversation ${conversationId}`);
      return null;
    } catch (error) {
      console.error('Error assigning agent to conversation:', error);
      throw error;
    }
  }

  private findBestAvailableAgent(accountId: string, requiredSkills?: string[]): Agent | null {
    const availableAgents: Agent[] = [];

    for (const agent of this.agents.values()) {
      if (agent.accountId !== accountId || !agent.isActive || !this.isAgentAvailable(agent.id)) {
        continue;
      }

      // Check skills if required
      if (requiredSkills && requiredSkills.length > 0) {
        const hasRequiredSkills = requiredSkills.every(skill => 
          agent.skills.includes(skill)
        );
        if (!hasRequiredSkills) {
          continue;
        }
      }

      availableAgents.push(agent);
    }

    if (availableAgents.length === 0) {
      return null;
    }

    // Sort by current chat count (ascending) and last assignment (ascending)
    availableAgents.sort((a, b) => {
      const queueA = this.agentQueues.get(a.id);
      const queueB = this.agentQueues.get(b.id);
      
      if (!queueA || !queueB) return 0;
      
      const chatCountDiff = queueA.currentChats.length - queueB.currentChats.length;
      if (chatCountDiff !== 0) return chatCountDiff;
      
      return queueA.lastAssignment.getTime() - queueB.lastAssignment.getTime();
    });

    return availableAgents[0];
  }

  private isAgentAvailable(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    const queue = this.agentQueues.get(agentId);
    
    if (!agent || !queue || !agent.isActive || !queue.isAvailable) {
      return false;
    }

    return queue.currentChats.length < agent.maxConcurrentChats;
  }

  private async assignConversation(agentId: string, conversationId: string): Promise<void> {
    const queue = this.agentQueues.get(agentId);
    const agent = this.agents.get(agentId);
    
    if (queue && agent) {
      queue.currentChats.push(conversationId);
      queue.lastAssignment = new Date();
      agent.currentChatCount = queue.currentChats.length;
      agent.lastActivityAt = new Date();
      
      this.conversationAssignments.set(conversationId, agentId);
      
      console.log(`📋 Conversation ${conversationId} assigned to agent ${agent.externalAgentId}`);
      this.emit('conversationAssigned', { conversationId, agentId, agent });
    }
  }

  public async unassignConversation(conversationId: string): Promise<void> {
    const agentId = this.conversationAssignments.get(conversationId);
    if (agentId) {
      const queue = this.agentQueues.get(agentId);
      const agent = this.agents.get(agentId);
      
      if (queue && agent) {
        queue.currentChats = queue.currentChats.filter(id => id !== conversationId);
        agent.currentChatCount = queue.currentChats.length;
        agent.updatedAt = new Date();
      }
      
      this.conversationAssignments.delete(conversationId);
      
      console.log(`📋 Conversation ${conversationId} unassigned from agent`);
      this.emit('conversationUnassigned', { conversationId, agentId });
    }
  }

  public getAssignedAgent(conversationId: string): Agent | null {
    const agentId = this.conversationAssignments.get(conversationId);
    return agentId ? this.agents.get(agentId) || null : null;
  }

  private updateAgentQueue(agentId: string, isActive: boolean): void {
    const queue = this.agentQueues.get(agentId);
    if (queue) {
      queue.isAvailable = isActive;
    }
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getAgentStats(accountId: string) {
    let totalAgents = 0;
    let activeAgents = 0;
    let onlineAgents = 0;
    let totalCurrentChats = 0;

    for (const agent of this.agents.values()) {
      if (agent.accountId === accountId) {
        totalAgents++;
        if (agent.isActive) activeAgents++;
        if (agent.isOnline) onlineAgents++;
        totalCurrentChats += agent.currentChatCount;
      }
    }

    return {
      total: totalAgents,
      active: activeAgents,
      online: onlineAgents,
      totalCurrentChats,
      averageChatsPerAgent: activeAgents > 0 ? totalCurrentChats / activeAgents : 0
    };
  }

  public getQueueStatus(accountId: string) {
    const agents = Array.from(this.agents.values())
      .filter(agent => agent.accountId === accountId)
      .map(agent => {
        const queue = this.agentQueues.get(agent.id);
        return {
          externalAgentId: agent.externalAgentId,
          name: agent.name,
          type: agent.type,
          isActive: agent.isActive,
          isOnline: agent.isOnline,
          currentChats: queue?.currentChats.length || 0,
          maxChats: agent.maxConcurrentChats,
          isAvailable: this.isAgentAvailable(agent.id),
          lastActivity: agent.lastActivityAt
        };
      });

    return agents;
  }

  public async setAgentOnlineStatus(agentId: string, isOnline: boolean): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.isOnline = isOnline;
      agent.lastActivityAt = new Date();
      
      const queue = this.agentQueues.get(agentId);
      if (queue) {
        queue.isAvailable = isOnline && agent.isActive;
      }
      
      this.emit('agentOnlineStatusChanged', { agentId, isOnline });
    }
  }
}

export const agentManager = new AgentManager();