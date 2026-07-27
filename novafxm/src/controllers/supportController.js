const aiService = require('../services/aiService');

/**
 * Controller to handle AI Support chat endpoint
 */
exports.chat = async (req, res) => {
  try {
    const { history } = req.body;

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message history. Please provide a history array in body.',
      });
    }

    if (history.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message history cannot be empty.',
      });
    }

    // Validate message history structure
    const isValid = history.every(msg => msg.sender && msg.text);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message object structure. Must contain sender and text properties.',
      });
    }

    const aiMessage = await aiService.generateResponse(history);

    return res.status(200).json({
      success: true,
      message: aiMessage,
    });
  } catch (error) {
    console.error('Support Chat Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while communicating with the AI Assistant.',
    });
  }
};
