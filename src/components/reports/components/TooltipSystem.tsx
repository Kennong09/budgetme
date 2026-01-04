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
          className: 'text-primary',
          mobileColor: 'indigo'
        };
      case 'totalIncome':
        return {
          title: 'Monthly Income',
          description: 'Your total income for the current month from all sources, including salary, investments, and other income streams.',
          className: 'text-success',
          mobileColor: 'emerald'
        };
      case 'monthlySavings':
        return {
          title: 'Monthly Savings',
          description: 'The difference between your income and expenses. This represents money you\'ve kept rather than spent this month.',
          className: 'text-info',
          mobileColor: 'cyan'
        };
      case 'savingsRate':
        return {
          title: 'Savings Rate',
          description: 'The percentage of your income that you save. Financial experts recommend a savings rate of at least 20% of your income.',
          className: 'text-warning',
          mobileColor: 'amber'
        };
      case 'reportSettings':
        return {
          title: 'Report Settings',
          description: 'Customize your financial report by selecting different report types, timeframes, and view formats to gain insights into your financial data.',
          className: 'text-primary',
          mobileColor: 'indigo'
        };
      case 'reportContent':
        return {
          title: 'Report Content',
          description: 'This report visualizes your financial data according to the selected filters. Use different chart types to gain different insights into your spending patterns and financial trends.',
          className: 'text-primary',
          mobileColor: 'indigo'
        };
      default:
        return null;
    }
  };

  const tooltipContent = getTooltipContent();
  if (!tooltipContent) return null;

  const getMobileColorClasses = (color: string) => {
    switch (color) {
      case 'indigo': return { bg: 'bg-indigo-50', border: 'border-indigo-200', title: 'text-indigo-600', icon: 'text-indigo-500' };
      case 'emerald': return { bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-600', icon: 'text-emerald-500' };
      case 'cyan': return { bg: 'bg-cyan-50', border: 'border-cyan-200', title: 'text-cyan-600', icon: 'text-cyan-500' };
      case 'amber': return { bg: 'bg-amber-50', border: 'border-amber-200', title: 'text-amber-600', icon: 'text-amber-500' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', title: 'text-gray-600', icon: 'text-gray-500' };
    }
  };

  const mobileColors = getMobileColorClasses(tooltipContent.mobileColor);

  return (
    <>
      {/* Mobile Tooltip - Bottom Sheet Style */}
      <div className="block md:hidden">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/30 z-[999] animate__animated animate__fadeIn"
          onClick={onClose}
        ></div>
        
        {/* Tooltip Content */}
        <div className="fixed bottom-0 left-0 right-0 z-[1000] animate__animated animate__slideInUp animate__faster">
          <div className={`${mobileColors.bg} rounded-t-3xl border-t ${mobileColors.border} shadow-2xl`}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Content */}
            <div className="px-5 pb-8">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${mobileColors.bg} border ${mobileColors.border} flex items-center justify-center`}>
                  <i className={`fas fa-info-circle ${mobileColors.icon} text-lg`}></i>
                </div>
                <div className="flex-1">
                  <h6 className={`text-sm font-bold ${mobileColors.title} mb-1`}>
                    {tooltipContent.title}
                  </h6>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {tooltipContent.description}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tooltip - Positioned */}
      <div 
        className="tip-box light hidden md:block" 
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
    </>
  );
};

export default TooltipSystem;