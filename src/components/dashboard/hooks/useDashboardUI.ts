import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Stable ref for tooltip position calculation
  const calculateTooltipPosition = useRef((element: Element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + (rect.width / 2) + window.scrollX
    };
  }).current;

  // Stable toggle tip function with useCallback
  const toggleTip = useCallback((tipId: string, event?: React.MouseEvent): void => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event && event.currentTarget) {
        const position = calculateTooltipPosition(event.currentTarget);
        setTooltipPosition(position);
      }
    }
  }, [activeTip]);

  // Stable toggle expanded insight with useCallback
  const toggleInsightExpand = useCallback((insightTitle: string) => {
    setExpandedInsight(current => 
      current === insightTitle ? null : insightTitle
    );
  }, []);

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
