import { Router } from 'express';
import { omnichannelService } from '../../core/services/OmnichannelService.js';
import { telegramService } from '../../core/services/TelegramService.js';
import type { ChannelType, ChannelConfiguration } from '../../types/index.js';

const router = Router();

// Create a new channel
router.post('/', async (req, res) => {
  try {
    const { accountId, type, name, configuration } = req.body;

    if (!accountId || !type || !name || !configuration) {
      return res.status(400).json({
        error: 'Missing required fields: accountId, type, name, configuration'
      });
    }

    const channel = await omnichannelService.createChannel(
      accountId,
      type as ChannelType,
      name,
      configuration as ChannelConfiguration
    );

    res.status(201).json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get all channels
router.get('/', async (req, res) => {
  try {
    const { accountId, type } = req.query;

    let channels;
    if (accountId) {
      channels = omnichannelService.getChannelsByAccount(accountId as string);
    } else if (type) {
      channels = omnichannelService.getChannelsByType(type as ChannelType);
    } else {
      channels = omnichannelService.getAllChannels();
    }

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get channel by ID
router.get('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = omnichannelService.getChannel(channelId);

    if (!channel) {
      return res.status(404).json({
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Update channel configuration
router.put('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { configuration } = req.body;

    if (!configuration) {
      return res.status(400).json({
        error: 'Configuration is required'
      });
    }

    await omnichannelService.updateChannelConfiguration(channelId, configuration);

    res.json({
      success: true,
      message: 'Channel configuration updated'
    });
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Activate channel
router.post('/:channelId/activate', async (req, res) => {
  try {
    const { channelId } = req.params;
    await omnichannelService.activateChannel(channelId);

    res.json({
      success: true,
      message: 'Channel activated'
    });
  } catch (error) {
    console.error('Error activating channel:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Deactivate channel
router.post('/:channelId/deactivate', async (req, res) => {
  try {
    const { channelId } = req.params;
    await omnichannelService.deactivateChannel(channelId);

    res.json({
      success: true,
      message: 'Channel deactivated'
    });
  } catch (error) {
    console.error('Error deactivating channel:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Delete channel
router.delete('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    await omnichannelService.deleteChannel(channelId);

    res.json({
      success: true,
      message: 'Channel deleted'
    });
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Send message through channel
router.post('/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { recipientId, content, options } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({
        error: 'recipientId and content are required'
      });
    }

    const result = await omnichannelService.sendMessage(
      channelId,
      recipientId,
      content,
      options
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Telegram webhook endpoint
router.post('/:channelId/telegram/webhook', async (req, res) => {
  try {
    const { channelId } = req.params;
    const update = req.body;

    await telegramService.processWebhookUpdate(channelId, update);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get channel statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = omnichannelService.getChannelStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching channel stats:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;