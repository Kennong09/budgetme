import React, { FC } from 'react';

interface TooltipSystemProps {
  activeTip: string | null;
  tooltipPosition: { top: number; left: number } | null;
  onClose: () => void;
}

const TooltipSystem: FC<TooltipSystemProps> = ({
  activeTip,
  tooltipPosition,
  onClose
}) => {
  if (!activeTip || !tooltipPosition) return null;

  const getTooltipContent = () => {
    switch (activeTip) {
      case 'totalSpending':
        return {
          title: 'Monthly Spending',
          description: 'Your total expenses for the current month. This includes all categories of spending recorded in the system.',
          className: 'text-primary'
        };
      case 'totalIncome':
        return {
          title: 'Monthly Income',
          description: 'Your total income for the current month from all sources, including salary, investments, and other income streams.',
          className: 'text-success'
        };
      case 'monthlySavings':
        return {
          title: 'Monthly Savings',
          description: 'The difference between your income and expenses. This represents money you\'ve kept rather than spent this month.',
          className: 'text-info'
        };
      case 'savingsRate':
        return {
          title: 'Savings Rate',
          description: 'The percentage of your income that you save. Financial experts recommend a savings rate of at least 20% of your income.',
          className: 'text-warning'
        };
      case 'reportSettings':
        return {
          title: 'Report Settings',
          description: 'Customize your financial report by selecting different report types, timeframes, and view formats to gain insights into your financial data.',
          className: 'text-primary'
        };
      case 'reportContent':
        return {
          title: 'Report Content',
          description: 'This report visualizes your financial data according to the selected filters. Use different chart types to gain different insights into your spending patterns and financial trends.',
          className: 'text-primary'
        };
      default:
        return null;
    }
  };

  const tooltipContent = getTooltipContent();
  if (!tooltipContent) return null;

  return (
    <div 
      className="tip-box light" 
      style={{ 
        position: "absolute",
        top: `${tooltipPosition.top}px`, 
        left: `${tooltipPosition.left}px`,
        zIndex: 1000,
        background: "white",
        border: "1px solid #e3e6f0",
        borderRadius: "0.35rem",
        boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
        padding: "1rem",
        maxWidth: "300px",
        transform: "translateX(-50%)",
        marginTop: "10px"
      }}
    >
      {/* Arrow element */}
      <div 
        style={{
          position: "absolute",
          top: "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderBottom: "10px solid white"
        }}
      ></div>
      
      {/* Close button */}
      <button 
        onClick={onClose}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "12px",
          color: "#858796"
        }}
      >
        <i className="fas fa-times"></i>
      </button>
      
      <div className={`tip-title font-weight-bold ${tooltipContent.className} mb-2`}>
        {tooltipContent.title}
      </div>
      <p className="tip-description text-gray-800 mb-0">
        {tooltipContent.description}
      </p>
    </div>
  );
};

export default TooltipSystem;