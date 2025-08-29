import React from 'react';
import { TooltipPosition } from '../../types';

interface TooltipManagerProps {
  activeTip: string | null;
  tooltipPosition: TooltipPosition | null;
}

const TooltipManager: React.FC<TooltipManagerProps> = ({
  activeTip,
  tooltipPosition
}) => {
  if (!activeTip || !tooltipPosition) return null;

  const getTooltipContent = () => {
    switch (activeTip) {
      case 'activeGoals':
        return {
          title: 'Active Goals',
          description: 'The number of financial goals you\'re currently working towards. Creating specific, measurable goals helps you stay focused on your financial journey.'
        };
      case 'totalSaved':
        return {
          title: 'Total Saved',
          description: 'The total amount you\'ve saved across all your goals. This represents your progress and commitment to reaching your financial targets.'
        };
      case 'totalTarget':
        return {
          title: 'Total Target',
          description: 'The combined amount of all your goal targets. This is the total sum you\'re working towards across all your financial objectives.'
        };
      case 'overallProgress':
        return {
          title: 'Overall Goal Progress',
          description: 'Your combined progress across all goals. This percentage shows how far you\'ve come toward reaching all your financial targets collectively. The color indicates your progress status from beginning (red) to excellent (green).'
        };
      case 'goalHealth':
        return {
          title: 'Goal Health Status',
          description: 'A quick assessment of your overall financial goal health based on your progress. "Healthy" indicates excellent progress, "On Track" means good progress, "Getting Started" shows you\'re making headway, and "Just Beginning" signals you\'re in early stages.'
        };
      case 'goalList':
        return {
          title: 'Goal List',
          description: 'A detailed list of all your financial goals with their current status, progress, and remaining amount. You can view details, make contributions, edit or delete each goal using the action buttons.'
        };
      default:
        return null;
    }
  };

  const content = getTooltipContent();
  if (!content) return null;

  return (
    <div 
      className="tip-box light" 
      style={{ 
        position: "absolute",
        top: `${tooltipPosition.top}px`, 
        left: `${tooltipPosition.left}px`,
        transform: "translateX(-50%)",
        zIndex: 1000,
        background: "white",
        padding: "12px 15px",
        borderRadius: "8px",
        boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
        maxWidth: "300px",
        border: "1px solid rgba(0, 0, 0, 0.05)"
      }}
    >
      <div className="tip-title">{content.title}</div>
      <p className="tip-description">{content.description}</p>
    </div>
  );
};

export default TooltipManager;