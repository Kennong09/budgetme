import { useState } from 'react';
import { TooltipPosition } from '../types';

/**
 * Custom hook for managing tooltips
 */
export const useTooltips = () => {
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  // Updated toggle tip function to position tooltips correctly below each info icon
  const toggleTip = (tipId: string, event?: React.MouseEvent): void => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        // Get the position of the clicked element
        const rect = event.currentTarget.getBoundingClientRect();
        
        // Calculate position accounting for scroll
        setTooltipPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (rect.width / 2) + window.scrollX
        });
      }
    }
  };

  const closeTip = () => {
    setActiveTip(null);
    setTooltipPosition(null);
  };

  return {
    activeTip,
    tooltipPosition,
    toggleTip,
    closeTip
  };
};