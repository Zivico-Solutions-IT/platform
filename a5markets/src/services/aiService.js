const axios = require('axios');

/**
 * Service to handle communication with Gemini API
 */
class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = 'gemini-3.5-flash';
  }

  /**
   * Generates a response from the Gemini API given chat history and current user message.
   * @param {Array} history - Array of { sender: 'user'|'ai', text: string }
   * @returns {Promise<string>} AI response text
   */
  async generateResponse(history = []) {
    const apiKey = process.env.GEMINI_API_KEY || this.apiKey;
    
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
      throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY in the backend .env configuration.');
    }

    const systemInstruction = `You are NovaFXM AI Assistant, the official customer support AI for NovaFXM.
NovaFXM is a global forex and CFD trading platform.
Here is the core information about NovaFXM to help you answer questions:
1. Platform features: Real-time trading, deposits, withdrawals, wallet, and user profile management.
2. Timeframes supported: 1m, 3m, 5m, 15m, 1H, 4H, 1D, 1W, 1M.
3. User levels/roles: Trader (default), Manager, Agent, Admin, Master.
4. Support: Users can reset passwords using the "Forgot Password" page.
5. Trading instructions: Use the trading interface to open buy/sell positions.
6. Guidelines:
   - Be extremely polite, professional, and helpful.
   - Keep answers relatively concise and easy to read.
   - Do NOT say you are an AI created by Google. Always represent yourself as "NovaFXM AI Customer Support".
   - If you do not know the answer to a specific account query, tell the user to contact Support at zivico_support@revoraglobal.com or check their profile verification status.`;

    // Map history to Gemini contents structure
    // Gemini roles must be 'user' or 'model'
    const contents = history.map((msg) => {
      const role = msg.sender === 'user' ? 'user' : 'model';
      return {
        role: role,
        parts: [{ text: msg.text }],
      };
    });

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;
      
      const response = await axios.post(url, {
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });

      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Invalid response structure received from Gemini API.');
      }

      return text;
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      const apiErrorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`AI Service error: ${apiErrorMessage}`);
    }
  }
}

module.exports = new AIService();
