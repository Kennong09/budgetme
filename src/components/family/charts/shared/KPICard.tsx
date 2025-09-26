import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  badge?: {
    text: string;
    color: string;
  };
  progressValue?: number;
  progressColor?: string;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  badge,
  progressValue,
  progressColor,
  className = ''
}) => {
  return (
    <div className={`card border-0 shadow-sm h-100 ${className}`}>
      <div className="card-body p-3">
        <div className="d-flex align-items-center justify-content-between">
          <div className="flex-grow-1">
            <h6 className="card-title mb-1 text-muted" style={{ fontSize: '14px', fontWeight: '600', color: '#5a5c69' }}>
              {title}
            </h6>
            <h4 className="mb-0" style={{ color, fontSize: '24px', fontWeight: 'bold' }}>
              {value}
              {badge && (
                <span 
                  className="ms-2 badge" 
                  style={{ 
                    backgroundColor: badge.color + '20', 
                    color: badge.color,
                    fontSize: '10px',
                    fontWeight: '600'
                  }}
                >
                  {badge.text}
                </span>
              )}
            </h4>
            {subtitle && (
              <small className="text-muted" style={{ fontSize: '12px' }}>{subtitle}</small>
            )}
          </div>
          <div className="text-end">
            <i className={`${icon} fa-2x`} style={{ color }}></i>
          </div>
        </div>
        {progressValue !== undefined && (
          <div className="progress mt-2" style={{ height: '4px' }}>
            <div 
              className="progress-bar" 
              style={{ 
                width: `${Math.min(100, Math.max(0, progressValue))}%`, 
                backgroundColor: progressColor || color 
              }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;