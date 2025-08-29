import React, { FC } from 'react';
import { UsageStatus } from '../../../services/database/predictionService';

interface UsageTrackingDisplayProps {
  usageStatus: UsageStatus | null;
  onGeneratePredictions?: () => void;
  generating?: boolean;
  className?: string;
}

const UsageTrackingDisplay: FC<UsageTrackingDisplayProps> = ({
  usageStatus,
  onGeneratePredictions,
  generating = false,
  className = ''
}) => {
  if (!usageStatus) {
    return (
      <div className={`card border-left-secondary ${className}`}>
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm text-secondary mr-3" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <span className="text-muted">Loading usage information...</span>
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = (usageStatus.current_usage / usageStatus.max_usage) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usageStatus.exceeded;
  
  const resetDate = new Date(usageStatus.reset_date);
  const daysUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const getProgressBarColor = () => {
    if (isAtLimit) return 'bg-danger';
    if (isNearLimit) return 'bg-warning';
    return 'bg-success';
  };

  const getCardBorderColor = () => {
    if (isAtLimit) return 'border-left-danger';
    if (isNearLimit) return 'border-left-warning';
    return 'border-left-success';
  };

  return (
    <div className={`card ${getCardBorderColor()} shadow ${className}`}>
      <div className="card-body">
        <div className="row no-gutters align-items-center">
          <div className="col mr-2">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="text-xs font-weight-bold text-uppercase mb-1">
                <i className="fas fa-chart-line mr-1"></i>
                Prophet Predictions Usage
              </div>
              {!isAtLimit && onGeneratePredictions && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={onGeneratePredictions}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic mr-1"></i>
                      Generate Predictions
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="row align-items-center">
              <div className="col-auto">
                <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">
                  {usageStatus.current_usage} / {usageStatus.max_usage}
                </div>
              </div>
              <div className="col">
                <div className="progress progress-sm mr-2">
                  <div 
                    className={`progress-bar ${getProgressBarColor()}`} 
                    role="progressbar" 
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    aria-valuenow={usageStatus.current_usage} 
                    aria-valuemin={0} 
                    aria-valuemax={usageStatus.max_usage}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="mt-2 d-flex justify-content-between align-items-center">
              <div className="text-sm">
                {isAtLimit ? (
                  <span className="text-danger">
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    Usage limit reached
                  </span>
                ) : isNearLimit ? (
                  <span className="text-warning">
                    <i className="fas fa-exclamation-circle mr-1"></i>
                    Approaching limit
                  </span>
                ) : (
                  <span className="text-success">
                    <i className="fas fa-check-circle mr-1"></i>
                    {usageStatus.remaining} predictions remaining
                  </span>
                )}
              </div>
              
              <div className="text-sm text-muted">
                <i className="fas fa-calendar-alt mr-1"></i>
                Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
              </div>
            </div>
            
            {/* Usage Tips */}
            <div className="mt-3">
              {isAtLimit ? (
                <div className="alert alert-danger py-2 mb-0">
                  <small>
                    <strong>Limit Reached:</strong> You've used all {usageStatus.max_usage} predictions for this period. 
                    Your usage will reset on {resetDate.toLocaleDateString()}.
                  </small>
                </div>
              ) : isNearLimit ? (
                <div className="alert alert-warning py-2 mb-0">
                  <small>
                    <strong>Almost at limit:</strong> You have {usageStatus.remaining} prediction{usageStatus.remaining !== 1 ? 's' : ''} left. 
                    Use them wisely!
                  </small>
                </div>
              ) : (
                <div className="alert alert-info py-2 mb-0">
                  <small>
                    <strong>Tip:</strong> Prophet predictions analyze your transaction history to forecast future spending patterns. 
                    Generate predictions when you add new transactions for the most accurate results.
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact version for header display
export const UsageTrackingCompact: FC<{
  usageStatus: UsageStatus | null;
  className?: string;
}> = ({ usageStatus, className = '' }) => {
  if (!usageStatus) {
    return (
      <span className={`badge badge-secondary ${className}`}>
        <i className="fas fa-spinner fa-spin mr-1"></i>
        Loading...
      </span>
    );
  }

  const isAtLimit = usageStatus.exceeded;
  const isNearLimit = (usageStatus.current_usage / usageStatus.max_usage) >= 0.8;

  const badgeColor = isAtLimit ? 'danger' : isNearLimit ? 'warning' : 'success';

  return (
    <span className={`badge badge-${badgeColor} ${className}`} title={`Usage: ${usageStatus.current_usage}/${usageStatus.max_usage}`}>
      <i className="fas fa-chart-line mr-1"></i>
      {usageStatus.current_usage}/{usageStatus.max_usage}
      {isAtLimit && <i className="fas fa-exclamation-triangle ml-1"></i>}
    </span>
  );
};

// Usage history component
export const UsageHistory: FC<{
  className?: string;
}> = ({ className = '' }) => {
  // This would typically fetch usage history from the API
  // For now, we'll show a placeholder
  
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h6 className="font-weight-bold text-primary mb-0">
          <i className="fas fa-history mr-2"></i>
          Usage History
        </h6>
      </div>
      <div className="card-body">
        <div className="text-center py-4">
          <i className="fas fa-clock text-muted mb-3" style={{ fontSize: '2rem' }}></i>
          <p className="text-muted">Usage history tracking coming soon!</p>
          <small className="text-muted">
            This feature will show your prediction generation history and usage patterns.
          </small>
        </div>
      </div>
    </div>
  );
};

export default UsageTrackingDisplay;