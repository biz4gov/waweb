import { Router } from 'express';
import { contactManager } from '../../core/services/ContactManager.js';
import { agentManager } from '../../core/services/AgentManager.js';
import { authService } from '../../core/services/AuthenticationService.js';
import type { 
  ContactRegistrationRequest,
  AgentRegistrationRequest,
  AgentStatusUpdateRequest,
  ConversationHistoryRequest,
  SendMessageRequest,
  UserRegistrationRequest
} from '../../types/index.js';

const router = Router();

// =================
// USER MANAGEMENT
// =================

// Register user from external application
router.post('/users', async (req, res) => {
  try {
    const { accountId } = req.query;
    const request: UserRegistrationRequest = req.body;

    if (!accountId || !request.externalUserId || !request.email || !request.name) {
      return res.status(400).json({
        error: 'accountId, externalUserId, email and name are required'
      });
    }

    const user = await authService.registerUser(accountId as string, request);

    // Generate initial token
    const token = authService.generateToken(
      accountId as string,
      request.externalUserId,
      request.permissions
    );

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Generate new token for existing user
router.post('/users/:externalUserId/token', async (req, res) => {
  try {
    const { accountId } = req.query;
    const { externalUserId } = req.params;

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    const user = authService.getUser(accountId as string, externalUserId);
    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    const token = authService.generateToken(
      accountId as string,
      externalUserId,
      user.permissions
    );

    res.json({
      success: true,
      data: {
        token,
        expiresIn: '24h',
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// =================
// CONTACT MANAGEMENT
// =================

// Register/Update contact
router.post('/contacts', authService.authenticateRequest(['contacts:write']), async (req, res) => {
  try {
    const request: ContactRegistrationRequest = req.body;
    
    if (!req.user || !request.externalContactId) {
      return res.status(400).json({
        error: 'externalContactId is required'
      });
    }

    const contact = await contactManager.registerContact(req.user.accountId, request);

    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error registering contact:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get contact by external ID
router.get('/contacts/:externalContactId', authService.authenticateRequest(['contacts:read']), async (req, res) => {
  try {
    const { externalContactId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contact = await contactManager.findContactByExternalId(req.user.accountId, externalContactId);
    
    if (!contact) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get contact conversations
router.get('/contacts/:externalContactId/conversations', authService.authenticateRequest(['conversations:read']), async (req, res) => {
  try {
    const { externalContactId } = req.params;
    const { limit = 10, offset = 0, startDate, endDate, status } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request: ConversationHistoryRequest = {
      externalContactId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status ? (status as string).split(',') : undefined
    };

    const result = await contactManager.getContactConversations(req.user.accountId, request);

    res.json({
      success: true,
      data: result.conversations,
      pagination: {
        total: result.total,
        limit: request.limit,
        offset: request.offset,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('Error fetching contact conversations:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Search contacts
router.get('/contacts', authService.authenticateRequest(['contacts:read']), async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!req.user || !q) {
      return res.status(400).json({
        error: 'Search query (q) is required'
      });
    }

    const contacts = await contactManager.searchContacts(
      req.user.accountId,
      q as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// =================
// AGENT MANAGEMENT
// =================

// Register/Update agent
router.post('/agents', authService.authenticateRequest(['agents:write']), async (req, res) => {
  try {
    const request: AgentRegistrationRequest = req.body;
    
    if (!req.user || !request.externalAgentId || !request.name || !request.email) {
      return res.status(400).json({
        error: 'externalAgentId, name and email are required'
      });
    }

    const agent = await agentManager.registerAgent(req.user.accountId, request);

    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Update agent status
router.put('/agents/:externalAgentId/status', authService.authenticateRequest(['agents:write']), async (req, res) => {
  try {
    const { externalAgentId } = req.params;
    const request: AgentStatusUpdateRequest = {
      externalAgentId,
      ...req.body
    };
    
    if (!req.user || typeof request.isActive !== 'boolean') {
      return res.status(400).json({
        error: 'isActive boolean field is required'
      });
    }

    const agent = await agentManager.updateAgentStatus(req.user.accountId, request);
    
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get queue status
router.get('/agents/queue', authService.authenticateRequest(['agents:read']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const queueStatus = agentManager.getQueueStatus(req.user.accountId);

    res.json({
      success: true,
      data: queueStatus
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// =================
// STATISTICS
// =================

// Get omnichannel statistics
router.get('/stats', authService.authenticateRequest(['stats:read']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contactStats = contactManager.getContactStats(req.user.accountId);
    const agentStats = agentManager.getAgentStats(req.user.accountId);
    const authStats = authService.getAuthStats(req.user.accountId);

    res.json({
      success: true,
      data: {
        contacts: contactStats,
        agents: agentStats,
        authentication: authStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;