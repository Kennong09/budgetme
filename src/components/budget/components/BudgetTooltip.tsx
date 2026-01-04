import React, { FC, memo, useEffect, useRef, useCallback, useMemo } from 'react';

interface TooltipPosition {
  top: number;
  left: number;
}

interface BudgetTooltipProps {
  isVisible: boolean;
  position: TooltipPosition | null;
  title: string;
  description: string;
  onClose: () => void;
  category?: 'workflow' | 'form' | 'process' | 'analytics';
}

const BudgetTooltip: FC<BudgetTooltipProps> = memo(({
  isVisible,
  position,
  title,
  description,
  onClose,
  category = 'process'
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  const handleClickOutside = useCallback((event: MouseEvent | TouchEvent) => {
    if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside as EventListener);
      document.addEventListener('touchstart', handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [isVisible, handleClickOutside]);

  // Handle escape key to close
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {

    if (isVisible) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible, handleEscapeKey]);

  // Dynamic positioning with boundary detection
  const calculatePosition = (): React.CSSProperties => {
    if (!position || !tooltipRef.current) {
      return { display: 'none' };
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { top, left } = position;

    // Boundary detection and adjustment
    // Adjust horizontal position if tooltip would overflow viewport
    if (left + tooltipRect.width > viewportWidth - 20) {
      left = viewportWidth - tooltipRect.width - 20;
    }
    if (left < 20) {
      left = 20;
    }

    // Adjust vertical position if tooltip would overflow viewport
    if (top + tooltipRect.height > viewportHeight - 20) {
      top = position.top - tooltipRect.height - 10; // Position above trigger
    }
    if (top < 20) {
      top = 20;
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translateX(-50%)',
      zIndex: 1000
    };
  };

  // Get category-specific styling
  const categoryIcon = useMemo(() => {
    const iconMap = {
      workflow: 'fas fa-route text-primary',
      form: 'fas fa-edit text-info',
      process: 'fas fa-info-circle text-warning',
      analytics: 'fas fa-chart-line text-success'
    };
    return iconMap[category];
  }, [category]);

  if (!isVisible || !position) {
    return null;
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="d-md-none"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999
        }}
        onClick={onClose}
      ></div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="budget-tooltip animate__animated animate__fadeIn animate__faster"
        style={{
          ...calculatePosition(),
          background: 'white',
          padding: window.innerWidth < 768 ? '10px 12px' : '12px 15px',
          borderRadius: '8px',
          boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)',
          maxWidth: window.innerWidth < 768 ? '260px' : '300px',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          fontSize: window.innerWidth < 768 ? '0.8125rem' : '0.875rem',
          lineHeight: '1.4'
        }}
        role="tooltip"
        aria-live="polite"
        tabIndex={-1}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="p-0 float-right bg-transparent border-0 cursor-pointer hover:text-gray-700 transition-colors"
          style={{ 
            marginTop: '-2px',
            marginRight: '-5px',
            color: '#858796',
            fontSize: window.innerWidth < 768 ? '0.7rem' : '0.75rem'
          }}
          aria-label="Close tooltip"
        >
          <i className="fas fa-times"></i>
        </button>

        {/* Title with category icon */}
        <div className="tooltip-title d-flex align-items-center mb-2">
          <i className={`${categoryIcon} mr-2`} style={{ fontSize: window.innerWidth < 768 ? '0.8125rem' : '0.875rem' }}></i>
          <span style={{ fontWeight: 600, color: '#5a5c69', fontSize: window.innerWidth < 768 ? '0.8125rem' : '0.875rem' }}>
            {title}
          </span>
        </div>

        {/* Description */}
        <div className="tooltip-description" style={{ color: '#858796', margin: 0, fontSize: window.innerWidth < 768 ? '0.75rem' : '0.875rem' }}>
          {description}
        </div>

        {/* Arrow pointer */}
        <div
          style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid white',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))'
          }}
        ></div>
      </div>
    </>
  );
});

BudgetTooltip.displayName = 'BudgetTooltip';

export default BudgetTooltip;