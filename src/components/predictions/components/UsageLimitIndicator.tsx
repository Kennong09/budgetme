import React, { FC, useState, useEffect } from "react";
import { PredictionService } from "../../../services/database/predictionService";

interface UsageLimitIndicatorProps {
  userId: string;
  serviceType?: 'prophet' | 'ai_insights';
  compact?: boolean;
}

interface UsageData {
  current_usage: number;
  limit: number;
  remaining: number;
  reset_date: string;
  tier?: string;
  rate_limited?: boolean;
  suspended?: boolean;
  loading: boolean;
  error?: string;
}

const UsageLimitIndicator: FC<UsageLimitIndicatorProps> = ({ 
  userId, 
  serviceType = 'prophet',
  compact = false 
}) => {
  const [usageData, setUsageData] = useState<UsageData>({
    current_usage: 0,
    limit: 10,
    remaining: 10,
    reset_date: new Date().toISOString(),
    loading: true
  });

  useEffect(() => {
    loadUsageData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUsageData, 30000);
    return () => clearInterval(interval);
  }, [userId, serviceType]);

  const loadUsageData = async () => {
    try {
      const data = await PredictionService.checkUsageLimitsFromDB(userId, serviceType);
      
      // Debug logging
      console.log('📊 Usage API Response:', data);
      
      // Validate and fix data consistency
      const limit = data.limit || 10;
      
      // Ensure remaining never exceeds limit (safety check)
      let remaining = data.remaining !== undefined ? data.remaining : limit;
      if (remaining > limit) {
        console.warn('⚠️ Remaining exceeds limit, capping to limit:', { remaining, limit });
        remaining = limit;
      }
      
      // Calculate current_usage from limit and remaining if data is inconsistent
      // Formula: current_usage = limit - remaining
      let currentUsage = data.current_usage || 0;
      
      // If current_usage doesn't match the calculation, recalculate it
      const calculatedUsage = Math.max(0, limit - remaining);
      if (currentUsage !== calculatedUsage) {
        console.warn('⚠️ Usage data inconsistency detected, recalculating:', {
          reported_current_usage: currentUsage,
          calculated_current_usage: calculatedUsage,
          limit,
          remaining
        });
        currentUsage = calculatedUsage;
      }
      
      // Additional validation: ensure current_usage + remaining = limit
      if (currentUsage + remaining !== limit) {
        console.warn('⚠️ Usage math doesn\'t add up, forcing consistency:', {
          currentUsage,
          remaining,
          limit,
          sum: currentUsage + remaining
        });
        // Prioritize remaining value, recalculate current_usage
        currentUsage = Math.max(0, limit - remaining);
      }
      
      setUsageData({
        current_usage: Math.max(0, currentUsage), // Ensure non-negative
        limit: limit,
        remaining: Math.max(0, remaining), // Ensure non-negative
        reset_date: data.reset_date,
        tier: data.tier,
        rate_limited: data.rate_limited,
        suspended: data.suspended,
        loading: false
      });
      
      console.log('✅ Final usage data:', {
        current_usage: Math.max(0, currentUsage),
        limit,
        remaining: Math.max(0, remaining)
      });
    } catch (error: any) {
      console.error('Failed to load usage data:', error);
      setUsageData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const getUsagePercentage = () => {
    return (usageData.current_usage / usageData.limit) * 100;
  };

  const getProgressBarClass = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-success';
  };

  const getStatusBadgeClass = () => {
    if (usageData.suspended) return 'badge-danger';
    if (usageData.rate_limited) return 'badge-danger';
    if (usageData.remaining === 0) return 'badge-danger';
    if (usageData.remaining <= 2) return 'badge-warning';
    return 'badge-success';
  };

  const getStatusText = () => {
    if (usageData.suspended) return 'Suspended';
    if (usageData.rate_limited) return 'Rate Limited';
    if (usageData.remaining === 0) return 'Limit Reached';
    if (usageData.remaining <= 2) return 'Low Usage';
    return 'Active';
  };

  const formatResetDate = () => {
    try {
      const resetDate = new Date(usageData.reset_date);
      const now = new Date();
      const diffMs = resetDate.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      } else {
        return 'Less than 1 hour';
      }
    } catch {
      return 'Unknown';
    }
  };

  if (usageData.loading) {
    return (
      <div className="d-flex align-items-center text-muted small">
        <i className="fas fa-spinner fa-spin mr-2"></i>
        Loading usage data...
      </div>
    );
  }

  if (usageData.error) {
    return (
      <div className="alert alert-warning small mb-0 py-2">
        <i className="fas fa-exclamation-triangle mr-2"></i>
        Unable to load usage data
      </div>
    );
  }

  // Compact view (for header/toolbar)
  if (compact) {
    return (
      <div className="d-flex align-items-center">
        <span className={`badge ${getStatusBadgeClass()} px-2 py-1`}>
          {usageData.remaining} / {usageData.limit} Remaining
        </span>
      </div>
    );
  }

  // Mobile full view
  const MobileView = () => (
    <div className="block md:hidden mb-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
            <i className={`fas fa-chart-line text-${usageData.remaining === 0 ? 'rose' : 'indigo'}-500 text-[10px]`}></i>
            {serviceType === 'prophet' ? 'Prediction' : 'Insights'} Usage
          </h6>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
            usageData.remaining === 0 ? 'bg-rose-100 text-rose-600' :
            usageData.remaining <= 2 ? 'bg-amber-100 text-amber-600' :
            'bg-emerald-100 text-emerald-600'
          }`}>
            {getStatusText()}
          </span>
        </div>
        
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500">{usageData.current_usage} of {usageData.limit} used</span>
            <span className="text-[10px] font-semibold text-gray-700">{usageData.remaining} left</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressBarClass()}`}
              style={{ width: `${getUsagePercentage()}%` }}
            ></div>
          </div>
          
          <div className="flex items-center text-[9px] text-gray-500">
            <i className="far fa-clock mr-1"></i>
            Resets in {formatResetDate()}
            {usageData.tier && (
              <span className="ml-2">• Tier: {usageData.tier}</span>
            )}
          </div>
          
          {usageData.remaining === 0 && (
            <div className="mt-2 bg-rose-50 border border-rose-100 rounded-lg p-2">
              <p className="text-[9px] text-rose-700">
                <i className="fas fa-exclamation-circle mr-1"></i>
                Limit reached. Resets in {formatResetDate()}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Full view (for warnings/banners)
  return (
    <>
      <MobileView />
      
      {/* Desktop Full View */}
      <div className="card shadow-sm border-left-primary mb-4 d-none d-md-block">
      <div className="card-body py-3">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center mb-2">
              <i className={`fas fa-chart-line mr-2 ${usageData.remaining === 0 ? 'text-danger' : 'text-primary'}`}></i>
              <h6 className="m-0 font-weight-bold">
                {serviceType === 'prophet' ? 'AI Prediction' : 'AI Insights'} Usage
              </h6>
              <span className={`badge ${getStatusBadgeClass()} ml-2 px-2`}>
                {getStatusText()}
              </span>
            </div>

            <div className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted">
                  {usageData.current_usage} of {usageData.limit} requests used
                </span>
                <span className="small font-weight-bold">
                  {usageData.remaining} remaining
                </span>
              </div>
              <div className="progress" style={{ height: '10px' }}>
                <div
                  className={`progress-bar ${getProgressBarClass()}`}
                  role="progressbar"
                  style={{ width: `${getUsagePercentage()}%` }}
                  aria-valuenow={usageData.current_usage}
                  aria-valuemin={0}
                  aria-valuemax={usageData.limit}
                ></div>
              </div>
            </div>

            <div className="d-flex align-items-center small text-muted">
              <i className="far fa-clock mr-1"></i>
              Resets in <strong className="ml-1">{formatResetDate()}</strong>
              {usageData.tier && (
                <span className="ml-3">
                  <i className="fas fa-layer-group mr-1"></i>
                  Tier: <strong>{usageData.tier}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="col-md-4 text-right">
            <div className="text-center">
              <div className="display-4 font-weight-bold" style={{ 
                color: usageData.remaining === 0 ? '#e74a3b' : usageData.remaining <= 2 ? '#f6c23e' : '#1cc88a' 
              }}>
                {usageData.remaining}
              </div>
              <div className="small text-muted">Requests Left</div>
            </div>
          </div>
        </div>

        {/* Warning Messages */}
        {usageData.suspended && (
          <div className="alert alert-danger mb-0 mt-3">
            <i className="fas fa-ban mr-2"></i>
            <strong>Account Suspended:</strong> Your account has been suspended. Please contact support.
          </div>
        )}

        {usageData.rate_limited && !usageData.suspended && (
          <div className="alert alert-warning mb-0 mt-3">
            <i className="fas fa-hourglass-half mr-2"></i>
            <strong>Rate Limited:</strong> You've made too many requests. Please wait before trying again.
          </div>
        )}

        {usageData.remaining === 0 && !usageData.suspended && !usageData.rate_limited && (
          <div className="alert alert-danger mb-0 mt-3">
            <i className="fas fa-exclamation-circle mr-2"></i>
            <strong>Usage Limit Reached:</strong> You've reached your {serviceType === 'prophet' ? 'prediction' : 'insights'} limit. 
            Your quota will reset in {formatResetDate()}.
          </div>
        )}

        {usageData.remaining > 0 && usageData.remaining <= 2 && !usageData.suspended && !usageData.rate_limited && (
          <div className="alert alert-warning mb-0 mt-3">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            <strong>Low Usage Warning:</strong> You have only {usageData.remaining} {serviceType === 'prophet' ? 'prediction' : 'insights'} request{usageData.remaining > 1 ? 's' : ''} remaining.
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default UsageLimitIndicator;
