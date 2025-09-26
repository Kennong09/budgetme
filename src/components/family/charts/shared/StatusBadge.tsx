import React from 'react';

interface StatusBadgeProps {
  status: string;
  score?: number;
  size?: 'small' | 'medium' | 'large';
  showScore?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  score,
  size = 'medium',
  showScore = true
}) => {
  const getStatusConfig = (status: string, score?: number) => {
    // Use score-based coloring if provided
    if (score !== undefined) {
      if (score >= 90) return { color: '#1cc88a', text: 'Excellent' };
      if (score >= 75) return { color: '#4e73df', text: 'Good' };
      if (score >= 50) return { color: '#f6c23e', text: 'Fair' };
      return { color: '#e74a3b', text: 'Needs Improvement' };
    }

    // Default status-based coloring
    switch (status.toLowerCase()) {
      case 'excellent':
      case 'healthy':
      case 'completed':
        return { color: '#1cc88a', text: status };
      case 'good':
      case 'on track':
      case 'in_progress':
      case 'active':
        return { color: '#4e73df', text: status };
      case 'fair':
      case 'getting started':
      case 'not_started':
      case 'pending':
        return { color: '#f6c23e', text: status };
      case 'needs improvement':
      case 'just beginning':
      case 'cancelled':
      case 'critical':
        return { color: '#e74a3b', text: status };
      default:
        return { color: '#6c757d', text: status };
    }
  };

  const config = getStatusConfig(status, score);
  
  const sizeClasses = {
    small: 'px-2 py-1',
    medium: 'px-3 py-1', 
    large: 'px-4 py-2'
  };

  const textSizes = {
    small: '10px',
    medium: '11px',
    large: '12px'
  };

  return (
    <span 
      className={`badge ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: config.color + '20', 
        color: config.color,
        fontSize: textSizes[size],
        fontWeight: '600',
        textTransform: 'capitalize'
      }}
    >
      {config.text}
      {showScore && score !== undefined && ` (${score})`}
    </span>
  );
};

export default StatusBadge;