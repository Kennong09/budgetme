import React, { useState } from 'react';
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

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
  currentModelName?: string;
  onLoginRedirect?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLatest, currentModelName, onLoginRedirect }) => {
  const [copied, setCopied] = useState(false);

  // Enhanced table detection function
  const isTableContent = (content: string): boolean => {
    const lines = content.trim().split('\n');
    
    // Need at least 2 lines (header + separator)
    if (lines.length < 2) return false;
    
    // Check for pipe characters in multiple lines
    const linesWithPipes = lines.filter(line => line.includes('|'));
    if (linesWithPipes.length < 2) return false;
    
    // Look for separator line (contains |, -, :, and spaces)
    const hasSeparator = lines.some(line => 
      line.match(/^[\|\s\-:]+$/) && line.includes('-')
    );
    
    // Also check for simple pattern: header line followed by separator
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].includes('|') && lines[i + 1].match(/^[\|\s\-:]+$/)) {
        return true;
      }
    }
    
    return hasSeparator;
  };

  // Parse message content for code blocks and tables
  const parseContent = (content: string) => {
    const parts: Array<{ type: 'text' | 'code' | 'table'; content: string; language?: string }> = [];
    
    // Remove any asterisks used for emphasis
    let processedContent = content.replace(/\*/g, '');
    
    // Enhanced code block parsing
    const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(processedContent)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = processedContent.slice(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({ type: 'text', content: textContent });
        }
      }
      
      // Clean up the code content
      let codeContent = match[2];
      
      // Remove leading/trailing whitespace but preserve internal formatting
      codeContent = codeContent.replace(/^\n+|\n+$/g, '');
      
      // Add code block
      parts.push({
        type: 'code',
        language: (match[1] || 'plaintext').toLowerCase(),
        content: codeContent
      });
      
      lastIndex = codeBlockRegex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < processedContent.length) {
      const remainingText = processedContent.slice(lastIndex).trim();
      if (remainingText) {
        // Enhanced table detection
        if (isTableContent(remainingText)) {
          parts.push({ type: 'table', content: remainingText });
        } else {
          parts.push({ type: 'text', content: remainingText });
        }
      }
    }
    
    // If no special formatting found, return as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: processedContent });
    }
    
    return parts;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatText = (text: string) => {
    // Format text with line breaks and proper spacing
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const contentParts = parseContent(message.content);

  return (
    <div className={`message-wrapper ${message.role}`}>
      {message.role === 'assistant' && (
        <div className="message-avatar">
          <img 
            src="/images/budgetsense-logo-white.svg" 
            alt="BudgetSense logo" 
            className="avatar-icon"
          />
        </div>
      )}
      
      <div className={`message-bubble ${message.role}`}>
        <div className="message-content">
          {contentParts.map((part, index) => {
            switch (part.type) {
              case 'code':
                return (
                  <CodeViewer
                    key={index}
                    code={part.content}
                    language={part.language || 'plaintext'}
                  />
                );
              case 'table':
                return (
                  <TableViewer
                    key={index}
                    tableContent={part.content}
                  />
                );
              case 'text':
              default:
                return (
                  <div key={index} className="message-text">
                    {formatText(part.content)}
                  </div>
                );
            }
          })}
        </div>
        
        {message.showSignInButton && (
          <div className="message-signin-wrapper">
            <button 
              onClick={onLoginRedirect}
              className="message-signin-btn"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In for Full Access
            </button>
          </div>
        )}
        
        {message.role === 'assistant' && (
          <div className="message-actions">
            <button
              onClick={handleCopy}
              className="message-action-btn"
              aria-label="Copy message"
            >
              {copied ? (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <span className="model-name">{currentModelName || 'Default Model'}</span>
          </div>
        )}
      </div>
      
      {message.role === 'user' && (
        <div className="message-avatar user-avatar">
          <svg className="avatar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
