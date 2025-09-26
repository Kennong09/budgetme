import React from 'react';

interface DataSourceNotificationProps {
  source: 'view' | 'table_with_category' | 'table_only' | 'error';
  className?: string;
  showDetails?: boolean;
}

/**
 * Component to display data source status to users
 * Provides transparency about fallback mechanisms
 * Note: No notification is shown for 'view' source (normal operation)
 */
export const DataSourceNotification: React.FC<DataSourceNotificationProps> = ({
  source,
  className = '',
  showDetails = false
}) => {
  // Return null immediately for normal operation (view source)
  // No notification needed when system is working properly
  if (source === 'view') {
    return null;
  }

  const getNotificationConfig = () => {
    switch (source) {
      case 'table_with_category':
        return {
          icon: <i className="fas fa-database"></i>,
          title: 'Limited System Access',
          message: 'Budget features are available with some calculated fields.',
          bgColor: 'bg-warning',
          textColor: 'text-dark',
          borderColor: 'border-warning',
          iconColor: 'text-dark',
          show: true
        };
      case 'table_only':
        return {
          icon: <i className="fas fa-info-circle"></i>,
          title: 'Basic System Access',
          message: 'Budget data available with limited features. Some categories may not display properly.',
          bgColor: 'bg-info',
          textColor: 'text-white',
          borderColor: 'border-info',
          iconColor: 'text-white',
          show: true
        };
      case 'error':
        return {
          icon: <i className="fas fa-exclamation-triangle"></i>,
          title: 'System Unavailable',
          message: 'Budget data cannot be loaded. Please try refreshing the page.',
          bgColor: 'bg-danger',
          textColor: 'text-white',
          borderColor: 'border-danger',
          iconColor: 'text-white',
          show: true
        };
      default:
        return {
          icon: <i className="fas fa-question-circle"></i>,
          title: 'Unknown Status',
          message: 'System status is unknown.',
          bgColor: 'bg-secondary',
          textColor: 'text-white',
          borderColor: 'border-secondary',
          iconColor: 'text-white',
          show: true
        };
    }
  };

  const config = getNotificationConfig();

  // Don't render if configured not to show
  if (!config.show && !showDetails) {
    return null;
  }

  return (
    <div className={`alert ${config.bgColor} ${config.borderColor} d-flex align-items-center ${className}`}>
      <div className={`${config.iconColor} mr-3`}>
        {config.icon}
      </div>
      <div className="flex-grow-1">
        <h6 className={`alert-heading mb-1 ${config.textColor}`}>
          {config.title}
        </h6>
        <p className={`mb-0 ${config.textColor}`} style={{ opacity: 0.9 }}>
          {config.message}
        </p>
        {showDetails && (
          <small className={`d-block mt-1 ${config.textColor}`} style={{ opacity: 0.75 }}>
            <strong>Data Source:</strong> {source}
          </small>
        )}
      </div>
    </div>
  );
};

export default DataSourceNotification;