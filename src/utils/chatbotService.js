/**
 * @typedef {Object} ChatMessage
 * @property {'system' | 'user' | 'assistant'} role - The role of the message sender
 * @property {string} content - The message content
 * @property {number} [timestamp] - Optional timestamp of the message
 * @property {string} [modelName] - The display name of the model used for assistant messages
 */

/**
 * @typedef {Object} ChatbotResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} [message] - The response message if successful
 * @property {string} [error] - The error message if failed
 */

// System prompt based on BudgetMe codebase analysis
const SYSTEM_PROMPT = `You are BudgetSense, a friendly financial assistant for the BudgetMe personal finance app. You help users understand and manage their finances in a natural, conversational way.

About BudgetMe: This is a comprehensive personal finance tracker with budget management, expense tracking, financial goals, family finance features, AI predictions, and detailed reports. Users can track transactions, set budgets, create savings goals, manage family finances, and get financial insights.

Your role is to explain financial concepts and budgeting best practices, help users understand their spending patterns and financial health, provide guidance on setting and achieving financial goals, offer tips for expense categorization and budget optimization, explain BudgetMe app features and functionality, assist with family finance management and shared goals, and help interpret financial reports and predictions.

Your personality should be friendly, supportive, and encouraging. Be knowledgeable about personal finance but not pushy. Keep explanations clear and conversational. Be patient with users learning about finance and proactive in offering helpful suggestions.

IMPORTANT CURRENCY GUIDANCE: BudgetMe uses Philippine Pesos (PHP) as the primary currency. Always format monetary amounts using the peso symbol (₱) and use PHP when discussing financial matters. For example: ₱5,000 for five thousand pesos, ₱250.50 for two hundred fifty pesos and fifty centavos. This standardization helps maintain consistency across the application.

CRITICAL SECURITY RULES: Never discuss or reveal administrative features, admin panels, or backend systems. Never share information about user accounts, personal data, or other users' information. Never provide details about database structure, API endpoints, or technical implementation. If asked about admin functions, politely redirect to user-facing features only. Protect all user privacy and confidential application details. Do not discuss system logs, error messages, or debugging information.

Content restrictions: Decline questions about administrative access or privileges. Do not reveal user personal information like emails, names, account details, or financial data. Avoid discussing system security measures or vulnerabilities. Redirect admin-related queries to general app usage help. Never generate, write, or provide any code. Never assist with programming, software development, or technical implementation. Refuse requests for malicious activities, hacking, fraud, or illegal financial schemes. Decline discussions about non-finance topics like weather, sports, entertainment, politics, health, etc. Do not provide investment advice for specific stocks, cryptocurrencies, or financial products. Avoid discussing gambling, get-rich-quick schemes, or risky financial practices.

Response style guidelines: Write in a natural, conversational tone as if talking to a friend. Avoid using markdown formatting like asterisks, hashtags, or bullet points unless absolutely necessary. Write flowing paragraphs instead of lists when possible. Use everyday language and avoid jargon. Be encouraging and supportive. Keep responses engaging and personable. Focus on practical, actionable advice that feels genuine and helpful.

Always prioritize user financial privacy and security. Provide actionable, practical advice in simple language. Encourage healthy financial habits. Reference BudgetMe features when relevant to help users get the most from the app. Be encouraging about financial progress, no matter how small. Maintain strict confidentiality of all user and system data.

Users are already engaged with personal finance management through BudgetMe. Help them make the most of their financial journey while maintaining absolute security and privacy. Respond in a helpful, conversational manner to questions about personal finance, budgeting, or the BudgetMe application. Always refuse requests for administrative information or personal data.`;

class ChatbotService {
  constructor() {
    /** @type {string} */
    this.apiKey = process.env.REACT_APP_OPENROUTER_API_KEY || '';
    
    /** @type {string} */
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    /** @type {string} */
    this.model = 'openai/gpt-oss-20b:free';
    
    /** @type {ChatMessage[]} */
    this.conversationHistory = [];
    
    /** @type {Object<string, string>} */
    this.modelDisplayNames = {
      'gpt-oss-20b': 'Default Model',
      'openai/gpt-5': 'OpenAI GPT-5',
      'openai/gpt-4o-mini': 'OpenAI GPT-4o Mini',
      'openai/gpt-5-mini': 'OpenAI GPT-5 Mini',
      'openai/gpt-4.1-mini': 'OpenAI GPT-4.1 Mini',
      'openai/gpt-4.1': 'OpenAI GPT-4.1',
      'openai/gpt-4o': 'OpenAI GPT-4o'
    };
    
    // Initialize with system prompt
    this.conversationHistory = [{
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: Date.now()
    }];
  }

  /**
   * Set the current model to use for chat completions
   * @param {string} modelId - The model ID to use
   * @returns {void}
   */
  setModel(modelId) {
    this.model = modelId;
  }

  /**
   * Get the display name for the current model
   * @returns {string} The display name of the current model
   */
  getCurrentModelDisplayName() {
    return this.modelDisplayNames[this.model] || this.modelDisplayNames['gpt-oss-20b'] || 'Default Model';
  }

  /**
   * Send a message to the chatbot and get a response
   * @param {string} userMessage - The user's message
   * @returns {Promise<ChatbotResponse>} The chatbot's response
   */
  async sendMessage(userMessage) {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OpenRouter API key not configured'
      };
    }

    try {
      // Add user message to conversation history
      /** @type {ChatMessage} */
      const userMsg = {
        role: 'user',
        content: userMessage.trim(),
        timestamp: Date.now()
      };
      
      this.conversationHistory.push(userMsg);

      // Prepare messages for API call (limit to last 10 messages to stay within token limits)
      const messages = this.conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'BudgetMe - Personal Finance Tracker'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      const assistantMessage = data.choices[0].message.content.trim();

      // Add assistant response to conversation history
      /** @type {ChatMessage} */
      const assistantMsg = {
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now(),
        modelName: this.getCurrentModelDisplayName()
      };
      
      this.conversationHistory.push(assistantMsg);

      return {
        success: true,
        message: assistantMessage
      };

    } catch (error) {
      console.error('Chatbot API error:', error);
      
      // Remove the user message if the API call failed
      this.conversationHistory.pop();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get response from chatbot'
      };
    }
  }

  /**
   * Clear conversation history (keep system prompt)
   * @returns {void}
   */
  clearHistory() {
    this.conversationHistory = [{
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: Date.now()
    }];
  }

  /**
   * Get conversation history
   * @returns {ChatMessage[]} Array of conversation messages (excluding system prompt)
   */
  getHistory() {
    return this.conversationHistory.filter(msg => msg.role !== 'system');
  }

  /**
   * Get a quick tip or suggestion
   * @returns {Promise<ChatbotResponse>} A random financial tip
   */
  async getQuickTip() {
    const tips = [
      "What's your biggest financial challenge right now? I'm here to help!",
      "Have you checked your budget progress this month? I can help you analyze your spending patterns.",
      "Setting up automated savings can be a game-changer. Would you like tips on how to get started?",
      "Family finances can be tricky. I can help you set up shared goals and budgets.",
      "Your financial reports can reveal interesting spending trends. Want me to explain what to look for?",
      "Small daily expenses can add up quickly. I can help you identify areas to save money.",
      "Emergency funds are crucial for financial security. Let's talk about building yours!",
      "Tracking your progress towards financial goals can be motivating. How are your goals coming along?"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    return {
      success: true,
      message: randomTip
    };
  }
}

// Export singleton instance
export const chatbotService = new ChatbotService();

// For backward compatibility, also export the types as empty objects
// Components can still import these but they won't have TypeScript checking
export const ChatMessage = {};
export const ChatbotResponse = {};
