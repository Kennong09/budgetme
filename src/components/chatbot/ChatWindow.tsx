import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import CodeViewer from './CodeViewer';
import TableViewer from './TableViewer';

// Local interface definition since we moved to JavaScript service
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  modelName?: string;
  showSignInButton?: boolean;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isMinimized: boolean;
  isClosing: boolean;
  suggestions: string[];
  isAuthenticated: boolean;
  remainingMessages: number | null;
  showLoginPrompt: boolean;
  onSendMessage: (message: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onClearChat: () => void;
  onModelChange?: (modelId: string) => void;
  onLoginPromptClose: () => void;
  onLoginRedirect: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  isMinimized,
  isClosing,
  suggestions,
  isAuthenticated,
  remainingMessages,
  showLoginPrompt,
  onSendMessage,
  onSuggestionClick,
  onClose,
  onClearChat,
  onModelChange,
  onLoginPromptClose,
  onLoginRedirect
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gpt-oss-20b');
  const [showModelChooser, setShowModelChooser] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const availableModels = [
    { id: 'gpt-oss-20b', name: 'Default Model', description: 'Experimental model' },
    { id: 'openai/gpt-5', name: 'GPT-5', description: 'Most advanced model' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Compact version' },
    { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Lightweight option' },
    { id: 'openai/gpt-4.1', name: 'GPT-4.1', description: 'Enhanced reasoning' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Multimodal capable' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Hide suggestions after first message
    if (messages.length > 2) {
      setShowSuggestions(false);
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setShowSuggestions(false);
    onSuggestionClick(suggestion);
  };

  const handleModelChange = (modelId: string) => {
    if (!isAuthenticated && modelId !== 'gpt-oss-20b') {
      // Show login prompt for non-default models
      setShowModelChooser(false);
      onLoginPromptClose(); // This will trigger the login prompt
      return;
    }
    setSelectedModel(modelId);
    setShowModelChooser(false);
    onModelChange?.(modelId);
  };

  const getCurrentModelName = () => {
    const currentModel = availableModels.find(model => model.id === selectedModel);
    return currentModel?.name || 'Default Model';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className={`chat-window ${isMinimized ? 'minimized' : ''} ${isClosing ? 'closing' : ''}`}>
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-avatar">
            <img 
              src="/images/budgetsense-logo-white.svg" 
              alt="BudgetSense logo" 
              className="chat-avatar-icon"
            />
          </div>
          <div className="chat-header-info">
            <h3 className="chat-title">BudgetSense</h3>
            <span className="chat-status">
              <span className="status-dot"></span>
              Online
            </span>
          </div>
        </div>
        <div className="chat-header-actions">
          <div className="model-selector">
            <button 
              onClick={() => setShowModelChooser(!showModelChooser)} 
              className="model-selector-btn"
              aria-label="Select model"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            {showModelChooser && (
              <div className="model-dropdown">
                <div className="model-dropdown-header">Select Model</div>
                {!isAuthenticated && (
                  <div className="model-dropdown-notice">
                    <span>Sign in to access all models</span>
                  </div>
                )}
                {availableModels.map((model) => {
                  const isDefaultModel = model.id === 'gpt-oss-20b';
                  const isDisabled = !isAuthenticated && !isDefaultModel;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={`model-option ${selectedModel === model.id ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                      disabled={isDisabled}
                    >
                      <span className="model-option-name">{model.name}</span>
                      <span className="model-option-desc">{model.description}</span>
                      {!isAuthenticated && !isDefaultModel && (
                        <span className="model-option-lock">🔒</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button onClick={onClearChat} className="chat-action-btn" aria-label="Clear chat">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={onClose} className="chat-action-btn chat-close-btn" aria-label="Close">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="chat-login-modal-overlay">
          <div className="chat-login-modal">
            <div className="chat-login-modal-header">
              <h3>Sign In Required</h3>
              <button 
                onClick={onLoginPromptClose}
                className="chat-login-modal-close"
                aria-label="Close modal"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="chat-login-modal-content">
              <div className="chat-login-modal-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="chat-login-modal-message">
                Message limit reached. Sign in for unlimited access.
              </p>
              <div className="chat-login-modal-actions">
                <button 
                  onClick={onLoginRedirect}
                  className="chat-login-btn-primary"
                >
                  Sign In
                </button>
                <button 
                  onClick={onLoginPromptClose}
                  className="chat-login-btn-secondary"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {!isMinimized && (
        <>
          <div className="chat-messages">
            {/* Message List */}
            <div className="messages-container">
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  isLatest={index === messages.length - 1}
                  currentModelName={getCurrentModelName()}
                  onLoginRedirect={onLoginRedirect}
                />
              ))}

              {/* Suggestions - shown after greeting message */}
              {showSuggestions && messages.length >= 1 && messages.length <= 2 && (
                <div className="chat-suggestions">
                  <p className="suggestions-title">Quick questions to get started:</p>
                  <div className="suggestions-list">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="suggestion-chip"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <svg className="suggestion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="message-bubble assistant">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="chat-input"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!inputValue.trim() || isLoading || (!isAuthenticated && remainingMessages !== null && remainingMessages <= 0)}
                aria-label="Send message"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="chat-input-info">
              <span className="input-hint">Press Enter to send, Shift+Enter for new line</span>
            </div>
          </form>

          {/* OpenAI Footer */}
          <div className="chat-footer">
            <div className="chat-footer-content">
              <span className="footer-text">Powered by</span>
              <img 
                src="/OpenAI-black-monoblossom.svg" 
                alt="OpenAI logo" 
                className="openai-logo"
              />
              <span className="footer-text">OpenAI</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWindow;
