import React from 'react';
import { TooltipSystemProps, TooltipContent } from '../types';

const TooltipSystem: React.FC<TooltipSystemProps> = ({
  activeTip,
  tooltipPosition
}) => {
  if (!activeTip || !tooltipPosition) return null;

  const tooltipContent: TooltipContent = {
    totalIncome: {
      title: 'Total Income',
      description: 'The sum of all income transactions for the selected period. This includes salary, investments, gifts, and other revenue sources. Use filters to analyze income from specific sources or time periods.'
    },
    totalExpenses: {
      title: 'Total Expenses',
      description: 'The sum of all expense transactions for the selected period. This includes all your spending across categories like housing, food, transportation, and discretionary purchases. Use filters to analyze spending in specific categories.'
    },
    netCashflow: {
      title: 'Net Cashflow',
      description: 'The difference between your total income and total expenses for the selected period. A positive value (green) means you\'re saving money, while a negative value (red) indicates you\'re spending more than you earn.'
    },
    linechart: {
      title: 'Income vs. Expenses Trend',
      description: 'This visualization tracks your income and expenses over time. The green line represents your income while the red line shows your expenses. When the green line is above the red, you\'re saving money. Analyzing these trends helps you understand how your financial habits change over time.'
    },
    piechart: {
      title: 'Expense Distribution',
      description: 'This chart breaks down your spending by category. Each colored segment represents a different expense category, with larger segments indicating higher spending. Use this information to identify your largest spending areas and focus your budget optimization efforts where they\'ll have the most impact.'
    },
    ratio: {
      title: 'Spending to Income Ratio',
      description: 'This indicator shows what percentage of your income is being spent on expenses. Financial experts recommend keeping this ratio below 70% for healthy finances. A higher ratio means you have less money available for savings, investments, and debt reduction. The color coding helps you quickly assess your financial health.'
    },
    status: {
      title: 'Financial Status',
      description: 'A summary assessment of your overall financial health based on your spending habits. This status considers your spending-to-income ratio and provides personalized recommendations. Green indicates healthy finances, yellow suggests areas for improvement, and red signals potential financial stress that needs immediate attention.'
    },
    transactionList: {
      title: 'Transaction List',
      description: 'A detailed view of all your financial transactions based on the current filters. You can see the date, category, account, description, and amount for each transaction. Use the action buttons to view details, edit, or delete individual transactions.'
    }
  };

  const content = tooltipContent[activeTip];
  if (!content) return null;

  return (
    <div 
      className="tip-box light" 
      style={{ 
        position: 'absolute',
        top: `${tooltipPosition.top}px`, 
        left: `${tooltipPosition.left}px`,
        transform: 'translateX(-50%)',
        backgroundColor: '#fff',
        border: '1px solid #e3e6f0',
        borderRadius: '0.35rem',
        boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)',
        padding: '1rem',
        maxWidth: '300px',
        zIndex: 1060,
        fontSize: '0.875rem',
        lineHeight: '1.5'
      }}
    >
      <div className="tip-title" style={{
        fontWeight: 600,
        color: '#5a5c69',
        marginBottom: '0.5rem',
        fontSize: '0.9rem'
      }}>
        {content.title}
      </div>
      <p className="tip-description" style={{
        margin: 0,
        color: '#6e707e',
        fontSize: '0.8rem',
        lineHeight: '1.4'
      }}>
        {content.description}
      </p>
      
      {/* Tooltip arrow */}
      <div style={{
        position: 'absolute',
        top: '-6px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderBottom: '6px solid #e3e6f0'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '-5px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderBottom: '5px solid #fff'
      }}></div>
    </div>
  );
};

export default TooltipSystem;