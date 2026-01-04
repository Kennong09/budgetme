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
      <>
        {/* Mobile Loading State */}
        <div className={`block md:hidden mb-4 ${className}`}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
              <span className="text-[10px] text-gray-500">Loading usage information...</span>
            </div>
          </div>
        </div>
        
        {/* Desktop Loading State */}
        <div className={`card border-left-secondary d-none d-md-block ${className}`}>
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm text-secondary mr-3" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <span className="text-muted">Loading usage information...</span>
            </div>
          </div>
        </div>
      </>
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

  // Mobile View Component
  const MobileView = () => (
    <div className={`block md:hidden mb-4 ${className}`}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile Header */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
            <i className={`fas fa-chart-line text-[10px] ${isAtLimit ? 'text-rose-500' : isNearLimit ? 'text-amber-500' : 'text-emerald-500'}`}></i>
            Prophet Usage
          </h6>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
            isAtLimit ? 'bg-rose-100 text-rose-600' :
            isNearLimit ? 'bg-amber-100 text-amber-600' :
            'bg-emerald-100 text-emerald-600'
          }`}>
            {isAtLimit ? 'Limit Reached' : isNearLimit ? 'Near Limit' : 'Active'}
          </span>
        </div>
        
        {/* Mobile Usage Stats */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500">{usageStatus.current_usage} of {usageStatus.max_usage} used</span>
            <span className="text-[10px] font-semibold text-gray-700">{usageStatus.remaining} left</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                isAtLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between text-[9px] text-gray-500 mb-3">
            <span>
              <i className="far fa-clock mr-1"></i>
              Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
            </span>
            <span>{resetDate.toLocaleDateString()}</span>
          </div>
          
          {/* Generate Button */}
          {!isAtLimit && onGeneratePredictions && (
            <button 
              onClick={onGeneratePredictions}
              disabled={generating}
              className="w-full py-2 bg-indigo-500 text-white rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-magic text-[9px]"></i>
                  Generate Predictions
                </>
              )}
            </button>
          )}
          
          {/* Status Messages */}
          {isAtLimit && (
            <div className="mt-2 bg-rose-50 border border-rose-100 rounded-lg p-2">
              <p className="text-[9px] text-rose-700">
                <i className="fas fa-exclamation-circle mr-1"></i>
                Limit reached. Resets on {resetDate.toLocaleDateString()}.
              </p>
            </div>
          )}
          
          {isNearLimit && !isAtLimit && (
            <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-2">
              <p className="text-[9px] text-amber-700">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Only {usageStatus.remaining} prediction{usageStatus.remaining !== 1 ? 's' : ''} left!
              </p>
            </div>
          )}
          
          {!isAtLimit && !isNearLimit && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2">
              <p className="text-[9px] text-blue-700">
                <i className="fas fa-lightbulb mr-1"></i>
                Generate predictions after adding new transactions for best results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MobileView />
      
      {/* Desktop View */}
      <div className={`card ${getCardBorderColor()} shadow d-none d-md-block ${className}`}>
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
    </>
  );
};

// Compact version for header display
export const UsageTrackingCompact: FC<{
  usageStatus: UsageStatus | null;
  className?: string;
}> = ({ usageStatus, className = '' }) => {
  if (!usageStatus) {
    return (
      <>
        {/* Mobile Compact Loading */}
        <span className={`block md:hidden px-2 py-0.5 rounded-full text-[9px] bg-gray-100 text-gray-500 ${className}`}>
          <i className="fas fa-spinner fa-spin mr-1"></i>
          Loading...
        </span>
        
        {/* Desktop Compact Loading */}
        <span className={`badge badge-secondary d-none d-md-inline ${className}`}>
          <i className="fas fa-spinner fa-spin mr-1"></i>
          Loading...
        </span>
      </>
    );
  }

  const isAtLimit = usageStatus.exceeded;
  const isNearLimit = (usageStatus.current_usage / usageStatus.max_usage) >= 0.8;

  const badgeColor = isAtLimit ? 'danger' : isNearLimit ? 'warning' : 'success';

  return (
    <>
      {/* Mobile Compact */}
      <span 
        className={`block md:hidden px-2 py-0.5 rounded-full text-[9px] font-semibold ${
          isAtLimit ? 'bg-rose-100 text-rose-600' :
          isNearLimit ? 'bg-amber-100 text-amber-600' :
          'bg-emerald-100 text-emerald-600'
        } ${className}`}
        title={`Usage: ${usageStatus.current_usage}/${usageStatus.max_usage}`}
      >
        <i className="fas fa-chart-line mr-1"></i>
        {usageStatus.current_usage}/{usageStatus.max_usage}
        {isAtLimit && <i className="fas fa-exclamation-triangle ml-1"></i>}
      </span>
      
      {/* Desktop Compact */}
      <span className={`badge badge-${badgeColor} d-none d-md-inline ${className}`} title={`Usage: ${usageStatus.current_usage}/${usageStatus.max_usage}`}>
        <i className="fas fa-chart-line mr-1"></i>
        {usageStatus.current_usage}/{usageStatus.max_usage}
        {isAtLimit && <i className="fas fa-exclamation-triangle ml-1"></i>}
      </span>
    </>
  );
};

// Usage history component
export const UsageHistory: FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <>
      {/* Mobile Usage History */}
      <div className={`block md:hidden mb-4 ${className}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-history text-indigo-500 text-[10px]"></i>
              Usage History
            </h6>
          </div>
          <div className="p-6 text-center">
            <i className="fas fa-clock text-gray-300 text-2xl mb-2"></i>
            <p className="text-[10px] text-gray-500 mb-1">Coming soon!</p>
            <p className="text-[9px] text-gray-400">Track your prediction history and usage patterns.</p>
          </div>
        </div>
      </div>
      
      {/* Desktop Usage History */}
      <div className={`card d-none d-md-block ${className}`}>
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
    </>
  );
};

export default UsageTrackingDisplay;