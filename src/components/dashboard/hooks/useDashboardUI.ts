import { useState, useEffect } from 'react';

export const useDashboardUI = () => {
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [highchartsLoaded, setHighchartsLoaded] = useState<boolean>(false);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  // Check if Highcharts is loaded
  useEffect(() => {
    if (window.Highcharts) {
      setHighchartsLoaded(true);
    } else {
      const checkHighcharts = setInterval(() => {
        if (window.Highcharts) {
          setHighchartsLoaded(true);
          clearInterval(checkHighcharts);
        }
      }, 100);

      return () => clearInterval(checkHighcharts);
    }
  }, []);

  // Auto-hide welcome message
  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    
    return () => {
      clearTimeout(welcomeTimer);
    };
  }, []);

  // Toggle tip function to position tooltips correctly below each info icon
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

  // Toggle expanded insight
  const toggleInsightExpand = (insightTitle: string) => {
    if (expandedInsight === insightTitle) {
      setExpandedInsight(null);
    } else {
      setExpandedInsight(insightTitle);
    }
  };

  return {
    showWelcome,
    setShowWelcome,
    highchartsLoaded,
    activeTip,
    expandedInsight,
    tooltipPosition,
    toggleTip,
    toggleInsightExpand
  };
};
