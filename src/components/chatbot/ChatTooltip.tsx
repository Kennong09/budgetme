import React, { useState, useEffect } from 'react';

interface ChatTooltipProps {
  isVisible: boolean;
  className?: string;
}

const ChatTooltip: React.FC<ChatTooltipProps> = ({ isVisible, className = '' }) => {
  const tooltipMessages = [
    "Track your expenses effortlessly",
    "Get personalized financial advice",
    "Analyze your spending patterns",
    "Plan for your financial future",
    "Create a debt-free strategy",
    "Build an emergency fund",
    "Optimize your monthly budget",
    "Discover smart saving tips",
    "Learn about investment basics",
    "Manage your family finances",
    "Track your financial goals",
    "Get AI-powered budget insights",
    "Master the art of budgeting",
    "Find ways to increase your income",
    "Control impulse spending habits",
    "Plan your retirement savings",
    "Understand credit and loans better",
    "Create a sustainable budget plan"
  ];

  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setCurrentMessage((prev) => (prev + 1) % tooltipMessages.length);
      }, 4000); // Update every 4 seconds for better UX

      return () => clearInterval(interval);
    }
  }, [isVisible, tooltipMessages.length]);

  if (!isVisible) return null;

  return (
    <div 
      className={`chat-tooltip ${className}`}
      onClick={() => {
        // Add click interaction to open chat
        const chatButton = document.querySelector('.floating-chat-button') as HTMLButtonElement;
        chatButton?.click();
      }}
    >
      <div className="chat-tooltip-content">
        <div className="chat-tooltip-message">
          {tooltipMessages[currentMessage]}
        </div>
        <div className="chat-tooltip-pointer"></div>
      </div>
    </div>
  );
};

export default ChatTooltip;
