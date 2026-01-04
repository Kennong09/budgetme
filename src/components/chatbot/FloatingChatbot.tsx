import React, { useState, useRef, useEffect } from 'react';
import { chatbotService } from '../../utils/chatbotService.js';
import { useAuth } from '../../utils/AuthContext';
import ChatWindow from './ChatWindow';
import ChatTooltip from './ChatTooltip';
import './chatbot.css';

// Local interface definition since we moved to JavaScript service
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  modelName?: string;
  showSignInButton?: boolean;
}

const FloatingChatbot: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "How can I start budgeting effectively?",
    "What's the 50/30/20 budget rule?",
    "Help me set up a savings goal"
  ]);
  
  // Rate limiting feedback state
  const [rateLimitWarning, setRateLimitWarning] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  
  // Authentication and message limiting
  const isAuthenticated = !!user; // User is authenticated if user object exists
  const [messageCount, setMessageCount] = useState(() => {
    // Get message count from localStorage
    const saved = localStorage.getItem('budgetme_chat_message_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const MAX_MESSAGES_UNAUTHENTICATED = 3;

  // Tooltip state
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  // Auto-show tooltip - less frequent on mobile to reduce annoyance
  useEffect(() => {
    if (!isOpen) {
      // Check if mobile (screen width <= 768px)
      const isMobile = window.innerWidth <= 768;
      // Show less frequently on mobile (30s) vs desktop (12s)
      const showInterval = isMobile ? 30000 : 12000;
      // Show for shorter time on mobile (3s) vs desktop (5s)
      const displayDuration = isMobile ? 3000 : 5000;
      
      const autoShowInterval = setInterval(() => {
        if (!isHovering) {
          setIsTooltipVisible(true);
          setTimeout(() => {
            if (!isHovering) {
              setIsTooltipVisible(false);
            }
          }, displayDuration);
        }
      }, showInterval);

      return () => clearInterval(autoShowInterval);
    } else {
      setIsTooltipVisible(false);
    }
  }, [isOpen, isHovering]);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setRateLimitWarning(false);
    }
  }, [retryCountdown]);

  // Update localStorage whenever message count changes
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('budgetme_chat_message_count', messageCount.toString());
    }
  }, [messageCount, isAuthenticated]);

  const toggleChat = async () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      // Load initial message if first time opening
      if (messages.length === 0) {
        try {
          // Initialize database session
          await chatbotService.initializeSession(user as any || null);
        } catch (error) {
          console.error('Failed to initialize chat session:', error);
          // Continue anyway - messages will work locally
        }
        
        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
        const greeting = isAuthenticated && userName 
          ? `Hello ${userName}! I'm BudgetSense, your personal finance assistant. How can I help you manage your finances today?`
          : "Hello! I'm BudgetSense, your personal finance assistant. How can I help you manage your finances today?";
        
        const welcomeMessage: ChatMessage = {
          role: 'assistant',
          content: greeting,
          timestamp: Date.now()
        };
        setMessages([welcomeMessage]);
      }
    } else {
      setIsOpen(false);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const maximizeChat = () => {
    setIsMinimized(false);
  };

  const closeChat = () => {
    setIsClosing(true);
    // Delay actual close to allow animation to complete
    setTimeout(() => {
      setIsOpen(false);
      setIsMinimized(false);
      setIsClosing(false);
    }, 300); // Match the animation duration
  };


  const sendMessage = async (message: string) => {
    // Check authentication and message limits
    if (!isAuthenticated && messageCount >= MAX_MESSAGES_UNAUTHENTICATED) {
      setShowLoginPrompt(true);
      return;
    }
    
    // Check if we're already processing a message
    if (isLoading) {
      return;
    }
    
    // Add user message to chat first
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    
    // Increment message count for unauthenticated users
    if (!isAuthenticated) {
      setMessageCount(prev => prev + 1);
    }

    try {
      const response = await chatbotService.sendMessage(message);
      
      if (response.success && response.message) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Handle rate limiting errors specifically
        if (response.error?.includes('temporarily unavailable') || response.error?.includes('high demand')) {
          setRateLimitWarning(true);
          setRetryCountdown(30); // 30 second countdown
          
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `${response.error} You can try again in ${retryCountdown} seconds.`,
            timestamp: Date.now(),
            showSignInButton: !isAuthenticated
          };
          setMessages(prev => [...prev, errorMessage]);
        } else {
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: response.error || "I'm sorry, I couldn't process your request. Please try again.",
            timestamp: Date.now(),
            showSignInButton: !isAuthenticated
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm experiencing technical difficulties. Please try again later.",
        timestamp: Date.now(),
        showSignInButton: !isAuthenticated
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const clearChat = async () => {
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    const greeting = isAuthenticated && userName 
      ? `Hello ${userName}! I'm BudgetSense, your personal finance assistant. How can I help you manage your finances today?`
      : "Hello! I'm BudgetSense, your personal finance assistant. How can I help you manage your finances today?";
    
    setMessages([{
      role: 'assistant',
      content: greeting,
      timestamp: Date.now()
    }]);
    await chatbotService.clearHistory();
    // Don't reset message count when clearing chat - it should persist
  };

  const handleModelChange = (modelId: string) => {
    // Allow model change but restrict to default model for unauthenticated users
    if (!isAuthenticated && modelId !== 'gpt-oss-20b') {
      setShowLoginPrompt(true);
      return;
    }
    chatbotService.setModel(modelId);
  };
  
  
  const handleLoginPromptClose = () => {
    setShowLoginPrompt(false);
  };
  
  const handleLoginRedirect = () => {
    window.location.href = '/login';
  };
  
  const getRemainingMessages = (): number | null => {
    if (isAuthenticated) return null;
    return Math.max(0, MAX_MESSAGES_UNAUTHENTICATED - messageCount);
  };

  return (
    <>
      {/* Floating Chat Button with Tooltip */}
      <div className="relative">
        <button
          onClick={toggleChat}
          onMouseEnter={() => {
            setIsHovering(true);
            setIsTooltipVisible(true);
          }}
          onMouseLeave={() => {
            setIsHovering(false);
            setTimeout(() => {
              if (!isHovering) {
                setIsTooltipVisible(false);
              }
            }, 500); // Small delay to allow moving to tooltip
          }}
          className={`floating-chat-button ${isOpen ? 'hidden' : ''}`}
          aria-label="Open chat"
        >
          <svg 
            className="chat-icon" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
        </button>
        
        {/* Tooltip Component */}
        <ChatTooltip 
          isVisible={isTooltipVisible && !isOpen}
        />
      </div>

      {/* Floating Close Button - shown when chat is open */}
      <button
        onClick={closeChat}
        className={`floating-chat-button floating-close-button ${!isOpen ? 'hidden' : ''}`}
        aria-label="Close chat"
      >
        <svg 
          className="chat-icon" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M6 18L18 6M6 6l12 12" 
          />
        </svg>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          isMinimized={isMinimized}
          isClosing={isClosing}
          suggestions={suggestions}
          isAuthenticated={isAuthenticated}
          remainingMessages={getRemainingMessages()}
          showLoginPrompt={showLoginPrompt}
          rateLimitWarning={rateLimitWarning}
          retryCountdown={retryCountdown}
          onSendMessage={sendMessage}
          onSuggestionClick={handleSuggestionClick}
          onMinimize={minimizeChat}
          onMaximize={maximizeChat}
          onClose={closeChat}
          onClearChat={clearChat}
          onModelChange={handleModelChange}
          onLoginPromptClose={handleLoginPromptClose}
          onLoginRedirect={handleLoginRedirect}
        />
      )}
    </>
  );
};

export default FloatingChatbot;
