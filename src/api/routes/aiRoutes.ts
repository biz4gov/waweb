import { Router } from 'express';
import { aiService } from '../../core/services/AIService.js';

const router = Router();

// Generate AI response
router.post('/chat', async (req, res) => {
  try {
    const { conversationId, message, promptId = 'customer-service', providerId = 'default' } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        error: 'conversationId and message are required'
      });
    }

    const response = await aiService.generateResponse(
      conversationId,
      message,
      promptId,
      providerId
    );

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Check if conversation should be escalated
router.post('/escalation-check', async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        error: 'conversationId and message are required'
      });
    }

    const shouldEscalate = await aiService.shouldEscalateToHuman(conversationId, message);

    res.json({
      success: true,
      data: {
        shouldEscalate,
        conversationId
      }
    });
  } catch (error) {
    console.error('Error checking escalation:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get available prompts
router.get('/prompts', async (req, res) => {
  try {
    const prompts = aiService.listPrompts();

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get specific prompt
router.get('/prompts/:promptId', async (req, res) => {
  try {
    const { promptId } = req.params;
    const prompt = aiService.getPrompt(promptId);

    if (!prompt) {
      return res.status(404).json({
        error: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      data: prompt
    });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Reload specific prompt
router.post('/prompts/:promptId/reload', async (req, res) => {
  try {
    const { promptId } = req.params;
    await aiService.reloadPrompt(promptId);

    res.json({
      success: true,
      message: `Prompt ${promptId} reloaded successfully`
    });
  } catch (error) {
    console.error('Error reloading prompt:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Reload all prompts
router.post('/prompts/reload-all', async (req, res) => {
  try {
    await aiService.reloadAllPrompts();

    res.json({
      success: true,
      message: 'All prompts reloaded successfully'
    });
  } catch (error) {
    console.error('Error reloading all prompts:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get AI providers
router.get('/providers', async (req, res) => {
  try {
    const providers = aiService.listProviders();

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Add AI provider
router.post('/providers', async (req, res) => {
  try {
    const { name, apiKey, baseUrl, model, isActive = true } = req.body;

    if (!name || !apiKey || !baseUrl || !model) {
      return res.status(400).json({
        error: 'name, apiKey, baseUrl, and model are required'
      });
    }

    await aiService.addProvider(name, {
      apiKey,
      baseUrl,
      model,
      isActive
    });

    res.status(201).json({
      success: true,
      message: `AI provider ${name} added successfully`
    });
  } catch (error) {
    console.error('Error adding AI provider:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Test AI provider connection
router.post('/providers/:providerId/test', async (req, res) => {
  try {
    const { providerId } = req.params;
    const isWorking = await aiService.testProvider(providerId);

    res.json({
      success: true,
      data: {
        providerId,
        isWorking,
        testedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error testing AI provider:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get conversation context
router.get('/conversations/:conversationId/context', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const context = aiService.getConversationContext(conversationId);

    if (!context) {
      return res.status(404).json({
        error: 'Conversation context not found'
      });
    }

    res.json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Error fetching conversation context:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Clear conversation context
router.delete('/conversations/:conversationId/context', async (req, res) => {
  try {
    const { conversationId } = req.params;
    aiService.clearConversationContext(conversationId);

    res.json({
      success: true,
      message: 'Conversation context cleared'
    });
  } catch (error) {
    console.error('Error clearing conversation context:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;