import React, { FC, useState, useEffect, useCallback } from "react";
import {
  PredictionHeader,
  ModelDetailsCard,
  PredictionAboutCard,
  PredictionSummaryCards,
  PredictionChart,
  CategoryPredictionsTable,
  AIInsightsCard
} from "./components";
import {
  usePredictionData,
  usePredictionFilters,
  useModelDetailsToggle,
  useTooltips
} from "./hooks";
import { TimeframeType } from "./types";
import type { PredictionDataPoint } from "./types";
import { handleExportCSV } from "./utils";
import { PredictionService, PredictionResponse, UsageStatus } from "../../services/database/predictionService";
import { useAuth } from "../../utils/AuthContext";
import { toast } from "react-toastify";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface ProphetPredictionState {
  loading: boolean;
  error: string | null;
  predictions: PredictionResponse | null;
  usageStatus: UsageStatus | null;
  generating: boolean;
}

const AIPrediction: FC = () => {
  // Authentication context
  const { user } = useAuth();
  
  // Prophet prediction state
  const [prophetState, setProphetState] = useState<ProphetPredictionState>({
    loading: true,
    error: null,
    predictions: null,
    usageStatus: null,
    generating: false
  });
  
  // Timeout mechanism to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Legacy hooks for backward compatibility
  const { timeframe, dataType, setTimeframe, setDataType } = usePredictionFilters();
  const { showModelDetails, showAccuracyReport, setShowModelDetails, setShowAccuracyReport } = useModelDetailsToggle();
  const { activeTip, tooltipPosition, toggleTip } = useTooltips();
  
  // Legacy data hook with Prophet integration
  const {
    loading: legacyLoading,
    categoryPredictions,
    modelAccuracy,
    modelDetails,
    predictionData,
    insights
  } = usePredictionData(timeframe);

  // Load usage status and cached predictions on component mount
  useEffect(() => {
    if (user?.id) {
      loadUsageStatus();
      loadCachedPredictions();
    }
  }, [user?.id]);
  
  // Timeout mechanism to prevent infinite loading
  useEffect(() => {
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    // Set up new timeout only if we're loading
    if (legacyLoading || prophetState.loading) {
      const timeout = setTimeout(() => {
        console.warn('Loading timeout reached, forcing empty state display');
        
        // Force empty state by setting prophet state to not loading
        setProphetState(prev => ({ ...prev, loading: false }));
        
        // If no category predictions yet, we'll show empty state
        if (categoryPredictions.length === 0) {
          toast.info('Loading took longer than expected. Please check your transaction data.');
        }
      }, 5000); // Reduced to 5 seconds for faster response
      
      setLoadingTimeout(timeout);
    }
    
    // Cleanup timeout on unmount or when loading completes
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [legacyLoading, prophetState.loading, categoryPredictions.length]);

  /**
   * Load current usage status from API
   */
  const loadUsageStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const status = await PredictionService.checkUsageLimit(user.id);
      setProphetState(prev => ({ ...prev, usageStatus: status }));
    } catch (error) {
      console.error('Error loading usage status:', error);
      // Don't show error toast for usage status, just log it
    }
  }, [user?.id]);

  /**
   * Load cached predictions if available
   */
  const loadCachedPredictions = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const cached = PredictionService.getCachedPredictions(user.id, timeframe);
      if (cached) {
        setProphetState(prev => ({
          ...prev,
          predictions: cached,
          loading: false
        }));
        toast.info('Loaded cached predictions. Generate new ones for updated data.');
      } else {
        setProphetState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error loading cached predictions:', error);
      setProphetState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id, timeframe]);

  /**
   * Generate new Prophet predictions
   */
  const generateProphetPredictions = useCallback(async () => {
    if (!user?.id) {
      toast.error('Please log in to generate predictions');
      return;
    }

    // Check usage limits before proceeding
    if (prophetState.usageStatus?.exceeded) {
      toast.error(`Usage limit exceeded (${prophetState.usageStatus.current_usage}/${prophetState.usageStatus.max_usage}). Resets on ${new Date(prophetState.usageStatus.reset_date).toLocaleDateString()}`);
      return;
    }

    setProphetState(prev => ({ ...prev, generating: true, error: null }));

    try {
      const predictions = await PredictionService.generateProphetPredictions(
        user.id,
        timeframe as 'months_3' | 'months_6' | 'year_1'
      );

      setProphetState(prev => ({
        ...prev,
        predictions,
        generating: false,
        error: null
      }));

      // Update usage status
      await loadUsageStatus();

      toast.success(`Prophet predictions generated successfully! (${predictions.usage_count}/${predictions.max_usage} used)`);

    } catch (error: any) {
      setProphetState(prev => ({
        ...prev,
        generating: false,
        error: error.message
      }));

      // Handle specific error cases more gracefully
      if (error.message.includes('At least 7 transactions are required')) {
        // Don't show error toast for insufficient data, show empty state instead
        setProphetState(prev => ({
          ...prev,
          predictions: null,
          error: null
        }));
        toast.info('Add more transactions to generate accurate predictions. At least 7 transactions are needed.');
      } else {
        toast.error(error.message);
      }
    }
  }, [user?.id, timeframe, prophetState.usageStatus, loadUsageStatus]);

  /**
   * Clear cached predictions and reload
   */
  const clearPredictionCache = useCallback(() => {
    if (user?.id) {
      PredictionService.clearCache(user.id);
      setProphetState(prev => ({ ...prev, predictions: null }));
      toast.info('Prediction cache cleared');
    }
  }, [user?.id]);

  /**
   * Handle timeframe changes
   */
  const handleTimeframeChange = useCallback((newTimeframe: TimeframeType) => {
    setTimeframe(newTimeframe);
    if (user?.id) {
      // Load cached predictions for new timeframe
      const cached = PredictionService.getCachedPredictions(user.id, newTimeframe);
      if (cached) {
        setProphetState(prev => ({ ...prev, predictions: cached }));
      } else {
        setProphetState(prev => ({ ...prev, predictions: null }));
      }
    }
  }, [setTimeframe, user?.id]);

  // Prepare data for components
  const currentPredictions = prophetState.predictions;
  const currentInsights = currentPredictions?.insights 
    ? {
        incomeGrowth: 0, // Calculate from insights if needed
        expenseGrowth: 0,
        savingsGrowth: 0
      }
    : insights;
  
  const currentModelAccuracy = currentPredictions 
    ? [
        {
          metric: 'Mean Absolute Error (MAE)',
          value: currentPredictions.model_accuracy.mae,
          description: 'Average prediction error in absolute terms'
        },
        {
          metric: 'Mean Absolute Percentage Error (MAPE)',
          value: currentPredictions.model_accuracy.mape,
          description: 'Average percentage error across predictions'
        },
        {
          metric: 'Root Mean Square Error (RMSE)',
          value: currentPredictions.model_accuracy.rmse,
          description: 'Standard deviation of prediction errors'
        },
        {
          metric: 'Training Data Points',
          value: currentPredictions.model_accuracy.data_points,
          description: 'Number of data points used for model training'
        }
      ]
    : modelAccuracy;
  
  const currentCategoryPredictions = currentPredictions 
    ? Object.entries(currentPredictions.category_forecasts).map(([category, forecast]) => ({
        category,
        current: forecast.historicalAverage,
        predicted: forecast.predicted,
        change: forecast.predicted - forecast.historicalAverage,
        changePercent: ((forecast.predicted - forecast.historicalAverage) / forecast.historicalAverage) * 100
      }))
    : categoryPredictions.length === 0 || 
      (categoryPredictions.length > 0 && categoryPredictions.every(cat => cat.current === 0 && cat.predicted === 0)) ||
      prophetState.error?.includes('At least 7 transactions are required')
    ? [
        {
          category: "No Transaction Data",
          current: 0,
          predicted: 0,
          change: 0,
          changePercent: 0,
          isEmptyState: true
        }
      ]
    : categoryPredictions;
  
  const currentPredictionData = currentPredictions
    ? {
        [timeframe]: currentPredictions.predictions.map(pred => ({
          month: new Date(pred.date).toISOString().substr(0, 7), // Convert to YYYY-MM format
          income: 0, // These would need to be calculated from actual data
          expenses: 0,
          savings: 0,
          incomePrediction: pred.predicted,
          expensesPrediction: 0,
          savingsPrediction: 0,
          incomeUpper: pred.upper,
          incomeLower: pred.lower,
          expensesUpper: 0,
          expensesLower: 0
        })),
        '3months': timeframe !== '3months' ? [] : [],
        '6months': timeframe !== '6months' ? [] : [],
        '1year': timeframe !== '1year' ? [] : []
      } as Record<TimeframeType, PredictionDataPoint[]>
    : predictionData;

  // Enhanced loading state detection to prevent infinite loading
  const hasEmptyStateData = categoryPredictions.length === 1 && categoryPredictions[0]?.isEmptyState === true;
  const hasNoTransactionData = categoryPredictions.length === 0 || hasEmptyStateData;
  const legacyHasFinishedLoading = !legacyLoading;
  const prophetHasFinishedInitialLoad = !prophetState.loading;
  
  // Debug logging for loading states
  useEffect(() => {
    console.log('Loading State Debug:', {
      legacyLoading,
      prophetLoading: prophetState.loading,
      prophetGenerating: prophetState.generating,
      categoryPredictionsLength: categoryPredictions.length,
      hasEmptyStateData,
      hasNoTransactionData,
      currentPredictions: !!currentPredictions,
      firstCategoryPrediction: categoryPredictions[0],
      isEmptyStateValue: categoryPredictions[0]?.isEmptyState
    });
  }, [legacyLoading, prophetState.loading, prophetState.generating, categoryPredictions.length, hasEmptyStateData, hasNoTransactionData, currentPredictions]);
  
  // Early determination of empty state to prevent loading confusion
  const shouldShowEmptyState = !prophetState.generating && 
    !currentPredictions && 
    hasEmptyStateData;
  
  // Force empty state after timeout or if we detect empty state data
  const isLoading = !shouldShowEmptyState && !hasEmptyStateData && (
    prophetState.generating ||
    (legacyLoading && !hasEmptyStateData) ||
    (prophetState.loading && !hasEmptyStateData)
  );







  if (isLoading) {
    console.log('Showing loading state:', {
      isLoading,
      shouldShowEmptyState,
      prophetGenerating: prophetState.generating,
      legacyLoading,
      prophetLoading: prophetState.loading,
      hasEmptyStateData
    });
    
    return (
      <div className="container-fluid">
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-weight-light">
            {prophetState.generating ? 'Generating Prophet Predictions' : 'Loading AI Predictions'}
          </h5>
          <p className="text-gray-500">
            {prophetState.generating 
              ? 'Analyzing your financial data with Facebook Prophet...'
              : 'Please wait while we analyze your financial data...'}
          </p>
          {prophetState.usageStatus && (
            <small className="text-muted">
              Usage: {prophetState.usageStatus.current_usage}/{prophetState.usageStatus.max_usage} predictions
            </small>
          )}
        </div>
      </div>
    );
  }

  // Show interactive empty state when no transaction data is available
  if (shouldShowEmptyState) {
    console.log('Showing empty state:', {
      shouldShowEmptyState,
      isLoading,
      categoryPredictions: categoryPredictions.map(cp => ({ category: cp.category, isEmptyState: cp.isEmptyState })),
      prophetGenerating: prophetState.generating,
      currentPredictions: !!currentPredictions
    });
    
    return (
      <div className="container-fluid">
        {/* Usage Status Banner */}
        {prophetState.usageStatus && (
          <div className={`alert ${prophetState.usageStatus.exceeded ? 'alert-warning' : 'alert-info'} mb-4`}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Usage Status:</strong> {prophetState.usageStatus.current_usage}/{prophetState.usageStatus.max_usage} predictions used
                {prophetState.usageStatus.exceeded && (
                  <span className="ml-2 text-warning">
                    • Limit reached • Resets on {new Date(prophetState.usageStatus.reset_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interactive Empty State */}
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            <div className="card shadow-lg border-0 animate__animated animate__fadeIn">
              <div className="card-body text-center py-5">
                <div className="mb-4">
                  <i className="fas fa-chart-line fa-4x text-primary opacity-50"></i>
                </div>
                <h3 className="text-gray-800 mb-3">Welcome to AI Predictions</h3>
                <p className="text-gray-600 mb-4 lead">
                  Get started by adding your financial transactions to unlock powerful AI-driven insights and forecasts.
                </p>
                
                <div className="row mb-4">
                  <div className="col-md-4">
                    <div className="p-3">
                      <i className="fas fa-plus-circle fa-2x text-success mb-2"></i>
                      <h6 className="font-weight-bold">Add Transactions</h6>
                      <small className="text-muted">Record your income and expenses</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3">
                      <i className="fas fa-robot fa-2x text-info mb-2"></i>
                      <h6 className="font-weight-bold">AI Analysis</h6>
                      <small className="text-muted">Get intelligent spending insights</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3">
                      <i className="fas fa-crystal-ball fa-2x text-warning mb-2"></i>
                      <h6 className="font-weight-bold">Future Forecasts</h6>
                      <small className="text-muted">Predict your financial future</small>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info text-left mb-4">
                  <h6 className="alert-heading">
                    <i className="fas fa-lightbulb mr-2"></i>
                    Quick Start Guide:
                  </h6>
                  <ul className="mb-0 small">
                    <li>Add at least <strong>7 transactions</strong> for reliable AI predictions</li>
                    <li>Include various categories (Food, Transportation, Entertainment, etc.)</li>
                    <li>Use consistent date ranges for better forecast accuracy</li>
                    <li>Both income and expense transactions improve predictions</li>
                  </ul>
                </div>

                <div className="d-flex justify-content-center flex-wrap gap-2">
                  <a href="/transactions/add" className="btn btn-primary btn-lg mr-2 mb-2">
                    <i className="fas fa-plus mr-2"></i>
                    Add Your First Transaction
                  </a>
                  <a href="/transactions" className="btn btn-outline-primary btn-lg mb-2">
                    <i className="fas fa-list mr-2"></i>
                    View All Transactions
                  </a>
                </div>

                <div className="mt-4">
                  <small className="text-muted">
                    <i className="fas fa-shield-alt mr-1"></i>
                    Your financial data is secure and private
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Help Cards */}
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card border-left-primary shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Need Help?
                    </div>
                    <div className="text-gray-800 small">
                      Check out our <a href="/help" className="text-primary">help guide</a> for tips on getting started with financial tracking.
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-question-circle fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-left-success shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                      Demo Data
                    </div>
                    <div className="text-gray-800 small">
                      Want to see how it works? <button className="btn btn-link btn-sm p-0 text-success" onClick={() => toast.info('Demo data feature coming soon!')}>Load sample data</button> to explore features.
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-eye fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Usage Status Banner */}
      {prophetState.usageStatus && (
        <div className={`alert ${prophetState.usageStatus.exceeded ? 'alert-warning' : 'alert-info'} mb-4`}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Usage Status:</strong> {prophetState.usageStatus.current_usage}/{prophetState.usageStatus.max_usage} predictions used
              {prophetState.usageStatus.exceeded && (
                <span className="ml-2 text-warning">
                  • Limit reached • Resets on {new Date(prophetState.usageStatus.reset_date).toLocaleDateString()}
                </span>
              )}
            </div>
            {!prophetState.usageStatus.exceeded && (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={generateProphetPredictions}
                disabled={prophetState.generating}
              >
                {prophetState.generating ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status" />
                    Generating...
                  </>
                ) : (
                  'Generate Prophet Predictions'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {prophetState.error && (
        <div className="alert alert-danger mb-4">
          <strong>Error:</strong> {prophetState.error}
          <button 
            className="btn btn-sm btn-outline-danger ml-3" 
            onClick={() => setProphetState(prev => ({ ...prev, error: null }))}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Prophet Predictions Banner */}
      {currentPredictions && (
        <div className="alert alert-success mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Prophet Predictions Active</strong>
              <small className="d-block text-muted">
                Generated: {new Date(currentPredictions.generated_at).toLocaleString()} • 
                Expires: {new Date(currentPredictions.expires_at).toLocaleString()}
              </small>
            </div>
            <div>
              <button className="btn btn-sm btn-outline-secondary mr-2" onClick={clearPredictionCache}>
                Clear Cache
              </button>
              <span className="badge badge-success">
                Confidence: {(currentPredictions.confidence_score * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <PredictionHeader
        showModelDetails={showModelDetails}
        onToggleModelDetails={() => setShowModelDetails(!showModelDetails)}
        onExportCSV={handleExportCSV}
        // Enhanced header props
        usageStatus={prophetState.usageStatus}
        onGeneratePredictions={generateProphetPredictions}
        generating={prophetState.generating}
        hasProphetData={!!currentPredictions}
      />

      <ModelDetailsCard
        showModelDetails={showModelDetails}
        modelDetails={currentPredictions ? [
          ...modelDetails,
          {
            name: 'Model Type',
            value: 'Facebook Prophet',
            description: 'Advanced time series forecasting model optimized for business metrics'
          },
          {
            name: 'Seasonality Mode',
            value: 'Additive',
            description: 'Seasonal effects are added to the trend component'
          },
          {
            name: 'Confidence Interval',
            value: '80%',
            description: 'Prediction uncertainty bounds for forecast intervals'
          },
          {
            name: 'Forecast Horizon',
            value: currentPredictions.timeframe,
            description: 'Time period covered by the prediction model'
          },
          {
            name: 'Training Data Points',
            value: currentPredictions.model_accuracy.data_points.toString(),
            description: 'Number of historical data points used to train the model'
          }
        ] : modelDetails}
        modelAccuracy={currentModelAccuracy}
        activeTip={activeTip}
        tooltipPosition={tooltipPosition}
        onToggleTip={toggleTip}
        onClose={() => setShowModelDetails(false)}
      />

      <PredictionAboutCard
        showAccuracyReport={showAccuracyReport}
        modelAccuracy={currentModelAccuracy}
        activeTip={activeTip}
        tooltipPosition={tooltipPosition}
        onToggleAccuracyReport={() => setShowAccuracyReport(!showAccuracyReport)}
        onToggleTip={toggleTip}
      />

      <PredictionSummaryCards
        insights={currentInsights}
        activeTip={activeTip}
        tooltipPosition={tooltipPosition}
        onToggleTip={toggleTip}
      />

      <PredictionChart
        timeframe={timeframe}
        dataType={dataType}
        data={currentPredictionData}
        modelAccuracy={currentModelAccuracy}
        activeTip={activeTip}
        tooltipPosition={tooltipPosition}
        onTimeframeChange={handleTimeframeChange}
        onDataTypeChange={setDataType}
        onToggleTip={toggleTip}
      />

      <CategoryPredictionsTable
        categoryPredictions={currentCategoryPredictions}
        activeTip={activeTip}
        tooltipPosition={tooltipPosition}
        onToggleTip={toggleTip}
      />

      <AIInsightsCard
        insights={currentInsights}
        timeframe={timeframe}
        modelAccuracy={currentModelAccuracy}
        activeTip={activeTip}
        tooltipPosition={tooltipPosition}
        onToggleTip={toggleTip}
      />
    </div>
  );
}
export default AIPrediction;

// The AIPrediction component has been refactored into smaller, maintainable components:
// - PredictionHeader: Header with title and export buttons
// - ModelDetailsCard: Collapsible Prophet model information
// - PredictionAboutCard: About predictions with accuracy report
// - PredictionSummaryCards: Three summary cards for growth metrics
// - PredictionChart: Interactive chart with filters
// - CategoryPredictionsTable: Category spending forecast table
// - AIInsightsCard: AI insights and model confidence metrics
// 
// Business logic and data management has been extracted to:
// - Custom hooks: usePredictionData, usePredictionFilters, useModelDetailsToggle, useTooltips
// - Utility functions: generateModelMetadata, generateCategoryPredictions, etc.
// - Type definitions: All interfaces and types are now in separate files
