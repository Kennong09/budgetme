import { 
  createChatSession, 
  getActiveSession, 
  updateChatSession, 
  insertChatMessage, 
  insertAnalytics,
  ensureAnonymousUser
} from './chatDatabase';
import { supabase } from './supabaseClient';
import Sentiment from 'sentiment';
import { env } from './env';

/**
 * SENTIMENT ANALYSIS
 * 
 * This service uses the 'sentiment' npm package for AFINN-based sentiment analysis.
 * The AFINN lexicon assigns sentiment scores to words:
 * - Positive words get positive scores (+1 to +5)
 * - Negative words get negative scores (-1 to -5)
 * - The total score determines overall sentiment
 * 
 * The package provides two key metrics:
 * 1. score: Total sentiment score (sum of all word scores)
 * 2. comparative: Score normalized by word count (more accurate for varying message lengths)
 * 
 * Thresholds used:
 * - Score > 1: Positive sentiment
 * - Score < -1: Negative sentiment
 * - Score between -1 and 1: Neutral sentiment
 */

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

// Default system prompt (fallback if database fetch fails)
const DEFAULT_SYSTEM_PROMPT = `You are BudgetSense, a friendly financial assistant for the BudgetMe personal finance app. You help users understand and manage their finances in a natural, conversational way.`;

/**
 * Load system prompt from database
 * @returns {Promise<string>} The system prompt
 */
async function loadSystemPrompt() {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'chatbot_system_prompt')
      .single();
    
    if (error || !data) {
      console.warn('Failed to load system prompt from database, using default');
      return DEFAULT_SYSTEM_PROMPT;
    }
    
    return data.setting_value?.prompt || DEFAULT_SYSTEM_PROMPT;
  } catch (error) {
    console.error('Error loading system prompt:', error);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

class ChatbotService {
  constructor() {
    /** @type {string} */
    this.apiKey = env.OPENROUTER_API_KEY || '';
    
    /** @type {string} */
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    /** @type {string} */
    this.model = 'openai/gpt-oss-20b:free';
    
    /** @type {ChatMessage[]} */
    this.conversationHistory = [];
    
    /** @type {string | null} */
    this.sessionId = null;
    
    /** @type {string | null} */
    this.userId = null;
    
    /** @type {boolean} */
    this.isAuthenticated = false;
    
    /** @type {number} */
    this.messageOrder = 0;
    
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
    
    /** @type {string} */
    this.systemPrompt = DEFAULT_SYSTEM_PROMPT;
    
    // Rate limiting properties
    /** @type {number} */
    this.lastRequestTime = 0;
    
    /** @type {number} */
    this.minRequestInterval = 1000; // 1 second between requests
    
    /** @type {number} */
    this.retryCount = 0;
    
    /** @type {number} */
    this.maxRetries = 3;
    
    /** @type {number} */
    this.retryDelay = 1000; // Base delay for retries
    
    /** @type {Array<number>} */
    this.requestQueue = [];
    
    /** @type {boolean} */
    this.isProcessing = false;
    
    // Initialize with default system prompt (will be loaded from DB on first session)
    this.conversationHistory = [];
  }

  /**
   * Check if we can make a request based on rate limiting
   * @returns {boolean} Whether we can make a request
   */
  canMakeRequest() {
    const now = Date.now();
    return (now - this.lastRequestTime) >= this.minRequestInterval;
  }

  /**
   * Wait for the appropriate time before making a request
   * @returns {Promise<void>}
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Calculate exponential backoff delay for retries
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return this.retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
  }

  /**
   * Make API call with retry logic
   * @param {Object} requestBody - The request body to send
   * @returns {Promise<Object>} The API response
   */
  async makeApiCallWithRetry(requestBody) {
    let attempt = 0;
    
    while (attempt <= this.maxRetries) {
      try {
        // Wait for rate limiting
        await this.waitForRateLimit();
        
        // Update last request time
        this.lastRequestTime = Date.now();
        
        // Make the API call
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'BudgetMe - Personal Finance Tracker'
          },
          body: JSON.stringify(requestBody)
        });

        // Handle successful response
        if (response.ok) {
          this.retryCount = 0; // Reset retry count on success
          return await response.json();
        }

        // Handle rate limiting (429)
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          const retryAfter = errorData?.error?.retry_after || 60; // Default 60 seconds
          
          if (attempt < this.maxRetries) {
            console.warn(`Rate limited. Retrying in ${retryAfter} seconds... (Attempt ${attempt + 1}/${this.maxRetries})`);
            
            // Wait for the specified retry time or exponential backoff, whichever is longer
            const waitTime = Math.max(retryAfter * 1000, this.calculateRetryDelay(attempt));
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            attempt++;
            continue;
          } else {
            throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
          }
        }

        // Handle other HTTP errors
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);

      } catch (error) {
        if (attempt < this.maxRetries && error.message.includes('Rate limit')) {
          attempt++;
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Maximum retry attempts exceeded');
  }

  /**
   * Initialize a chat session for the user
   * @param {string | null} user - The authenticated user object or null for anonymous users
   * @returns {Promise<string>} The session ID
   */
  async initializeSession(user) {
    try {
      // Load system prompt from database
      this.systemPrompt = await loadSystemPrompt();
      
      // Initialize conversation history with system prompt
      this.conversationHistory = [{
        role: 'system',
        content: this.systemPrompt,
        timestamp: Date.now()
      }];
      
      // Determine user ID (null for anonymous users)
      this.isAuthenticated = !!user;
      this.userId = user ? user.id : null;
      
      // Check for existing active session for this user
      const existingSession = await getActiveSession(this.userId);
      
      if (existingSession) {
        // Resume existing session
        this.sessionId = existingSession.id;
        this.messageOrder = existingSession.message_count || 0;
        return this.sessionId;
      }
      
      // Create new session
      const sessionData = {
        user_id: this.userId,
        session_title: 'Chat Session',
        session_type: 'general',
        start_time: new Date().toISOString(),
        is_active: true,
        message_count: 0,
        ai_model_version: this.model
      };
      
      const newSession = await createChatSession(sessionData);
      this.sessionId = newSession.id;
      this.messageOrder = 0;
      return this.sessionId;
    } catch (error) {
      console.error('Error initializing session:', error);
      // Continue without database persistence but with system prompt
    this.conversationHistory = [{
      role: 'system',
        content: this.systemPrompt,
      timestamp: Date.now()
    }];
      this.sessionId = `local-${Date.now()}`;
      this.messageOrder = 0;
      return this.sessionId;
    }
  }

  /**
   * Detect sentiment from message text using the Sentiment library
   * @param {string} messageText - The message content
   * @param {string} messageType - The message type
   * @returns {{sentiment: string, score: number, comparative: number}} The detected sentiment with scores
   */
  detectSentiment(messageText, messageType) {
    // Initialize sentiment analyzer
    const sentimentAnalyzer = new Sentiment();
    
    // Default sentiments by message type (for non-user messages)
    if (messageType === 'assistant') {
      return { sentiment: 'positive', score: 5, comparative: 0.5 };
    }
    if (messageType === 'error') {
      return { sentiment: 'negative', score: -5, comparative: -0.5 };
    }
    if (messageType === 'system') {
      return { sentiment: 'neutral', score: 0, comparative: 0 };
    }
    
    // For user messages, use sentiment analysis
    try {
      const result = sentimentAnalyzer.analyze(messageText);
      
      // The score represents the overall sentiment:
      // Positive score = positive sentiment
      // Negative score = negative sentiment
      // Score around 0 = neutral sentiment
      
      // Comparative is the sentiment score normalized by word count (more accurate)
      let sentiment;
      if (result.score > 1) {
        sentiment = 'positive';
      } else if (result.score < -1) {
        sentiment = 'negative';
      } else {
        sentiment = 'neutral';
      }
      
      return {
        sentiment,
        score: result.score,
        comparative: result.comparative
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { sentiment: 'neutral', score: 0, comparative: 0 };
    }
  }

  /**
   * Save a message to the database
   * @param {string} messageText - The message content
   * @param {string} messageType - The message type (user, assistant, system, error)
   * @param {Object} [analytics] - Optional analytics data for assistant messages
   * @returns {Promise<void>}
   */
  async saveMessage(messageText, messageType, analytics = null) {
    if (!this.sessionId || this.sessionId.startsWith('local-')) {
      // Skip database save for local-only sessions
      return;
    }
    
    try {
      this.messageOrder++;
      
      // Analyze sentiment
      const sentimentResult = this.detectSentiment(messageText, messageType);
      
      // Normalize the comparative score to fit within 0.0-1.0 range
      // Comparative score typically ranges from -5 to +5, but can go beyond
      // Map it to 0-1 where 0.5 is neutral
      const normalizedScore = Math.max(0, Math.min(1, (sentimentResult.comparative + 5) / 10));
      
      const messageData = {
        session_id: this.sessionId,
        user_id: this.userId,
        message_text: messageText,
        message_type: messageType,
        message_order: this.messageOrder,
        message_sentiment: sentimentResult.sentiment,
        confidence_score: normalizedScore, // Store normalized score (0.0-1.0)
        created_at: new Date().toISOString()
      };
      
      const message = await insertChatMessage(messageData);
      
      // Update session message count
      await updateChatSession(this.sessionId, this.userId, { 
        message_count: this.messageOrder,
        updated_at: new Date().toISOString()
      });
      
      // Save analytics if provided (for assistant messages)
      if (analytics && message) {
        const analyticsData = {
          message_id: message.id,
          model_name: this.model,
          model_version: '1.0',
          ...analytics
        };
        
        await insertAnalytics(analyticsData, this.userId);
      }
    } catch (error) {
      console.error('Error saving message to database:', error);
    }
  }

  /**
   * End the current session
   * @returns {Promise<void>}
   */
  async endSession() {
    if (!this.sessionId || this.sessionId.startsWith('local-')) {
      return;
    }
    
    try {
      await updateChatSession(this.sessionId, this.userId, {
        end_time: new Date().toISOString(),
        is_active: false
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
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

    // Ensure session is initialized before sending messages
    if (!this.sessionId || this.sessionId.startsWith('local-')) {
      try {
        // Initialize session for anonymous user (will be set by FloatingChatbot for authenticated users)
        await this.initializeSession(null);
      } catch (error) {
        console.error('Failed to initialize session:', error);
        // Continue anyway - messages will be stored locally
      }
    }

    // Check if we're already processing a request
    if (this.isProcessing) {
      return {
        success: false,
        error: 'Please wait for the previous message to complete before sending another.'
      };
    }

    const startTime = Date.now();

    try {
      this.isProcessing = true;

      // Add user message to conversation history
      /** @type {ChatMessage} */
      const userMsg = {
        role: 'user',
        content: userMessage.trim(),
        timestamp: Date.now()
      };
      
      this.conversationHistory.push(userMsg);
      
      // Save user message to database
      await this.saveMessage(userMessage.trim(), 'user');

      // Prepare messages for API call (limit to last 10 messages to stay within token limits)
      const messages = this.conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const apiCallStart = Date.now();
      
      // Use the new rate-limited API call method
      const data = await this.makeApiCallWithRetry({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        // No max_tokens limit - allows unlimited response length for complete insights
        stream: false
      });
      
      const apiCallTime = Date.now() - apiCallStart;
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      const assistantMessage = data.choices[0].message.content.trim();
      const totalTime = Date.now() - startTime;

      // Add assistant response to conversation history
      /** @type {ChatMessage} */
      const assistantMsg = {
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now(),
        modelName: this.getCurrentModelDisplayName()
      };
      
      this.conversationHistory.push(assistantMsg);
      
      // Prepare analytics data
      const analytics = {
        prompt_tokens: data.usage?.prompt_tokens || null,
        completion_tokens: data.usage?.completion_tokens || null,
        total_tokens: data.usage?.total_tokens || null,
        processing_time_ms: apiCallTime,
        temperature: 0.7
      };
      
      // Save assistant message to database with analytics
      await this.saveMessage(assistantMessage, 'assistant', analytics);

      return {
        success: true,
        message: assistantMessage
      };

    } catch (error) {
      console.error('Chatbot API error:', error);
      
      // Remove the user message if the API call failed
      this.conversationHistory.pop();
      
      // Save error message to database
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response from chatbot';
      await this.saveMessage(errorMessage, 'error');
      
      // Provide user-friendly error messages for rate limiting
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('Rate limit exceeded')) {
        userFriendlyError = 'The chat service is temporarily unavailable due to high demand. Please try again in a few moments.';
      } else if (errorMessage.includes('Maximum retry attempts exceeded')) {
        userFriendlyError = 'The chat service is experiencing technical difficulties. Please try again later.';
      }
      
      return {
        success: false,
        error: userFriendlyError
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear conversation history (keep system prompt) and start a new session
   * @returns {Promise<void>}
   */
  async clearHistory() {
    // End current session
    await this.endSession();
    
    // Reload system prompt from database
    this.systemPrompt = await loadSystemPrompt();
    
    // Reset conversation history
    this.conversationHistory = [{
      role: 'system',
      content: this.systemPrompt,
      timestamp: Date.now()
    }];
    
    // Start new session if we have a user
    if (this.userId !== undefined) {
      await this.initializeSession(this.isAuthenticated && this.userId ? { id: this.userId } : null);
    }
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
