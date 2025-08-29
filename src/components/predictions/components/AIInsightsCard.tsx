import React, { FC, useState, useEffect } from "react";
import { AIInsightsCardProps } from "../types";
import { AIInsightsService } from "../../../services/database/aiInsightsService";
import { useAuth } from "../../../utils/AuthContext";
import { toast } from "react-toastify";
import { AIInsightResponse } from "../../../types";

interface AIInsightUsageStatus {
  current_usage: number;
  max_usage: number;
  exceeded: boolean;
  reset_date: string;
}

const AIInsightsCard: FC<AIInsightsCardProps> = ({
  insights,
  timeframe,
  modelAccuracy,
  activeTip,
  tooltipPosition,
  onToggleTip,
  predictionData,
  categoryForecasts,
  userProfile
}) => {
  const { user } = useAuth();
  const { incomeGrowth, expenseGrowth, savingsGrowth } = insights;
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState<AIInsightResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [usageStatus, setUsageStatus] = useState<AIInsightUsageStatus | null>(null);
  const [showInsightDetails, setShowInsightDetails] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  
  // Load usage status on component mount
  useEffect(() => {
    if (user?.id) {
      loadUsageStatus();
    }
  }, [user?.id]);
  
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case "3months": return "3 months";
      case "6months": return "6 months";
      case "1year": return "year";
      default: return "period";
    }
  };
  
  /**
   * Load current usage status for AI insights
   */
  const loadUsageStatus = async (): Promise<void> => {
    try {
      // For now, implement local storage-based usage tracking
      const storedUsage = localStorage.getItem(`ai_insights_usage_${user?.id}`);
      const today = new Date().toDateString();
      
      if (storedUsage) {
        const usage = JSON.parse(storedUsage);
        
        // Reset if it's a new day
        if (usage.date !== today) {
          const resetUsage = { current_usage: 0, max_usage: 5, exceeded: false, reset_date: today };
          localStorage.setItem(`ai_insights_usage_${user?.id}`, JSON.stringify({ ...resetUsage, date: today }));
          setUsageStatus(resetUsage);
        } else {
          setUsageStatus({
            current_usage: usage.current_usage,
            max_usage: usage.max_usage,
            exceeded: usage.current_usage >= usage.max_usage,
            reset_date: usage.date
          });
        }
      } else {
        const initialUsage = { current_usage: 0, max_usage: 5, exceeded: false, reset_date: today };
        localStorage.setItem(`ai_insights_usage_${user?.id}`, JSON.stringify({ ...initialUsage, date: today }));
        setUsageStatus(initialUsage);
      }
    } catch (error) {
      console.error('Error loading usage status:', error);
    }
  };
  
  /**
   * Generate AI insights using OpenRouter API
   */
  const generateAIInsights = async (): Promise<void> => {
    if (!user?.id) {
      toast.error('Please log in to generate AI insights');
      return;
    }
    
    if (usageStatus?.exceeded) {
      toast.error(`Daily limit reached (${usageStatus.current_usage}/${usageStatus.max_usage}). Resets tomorrow.`);
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Use props data if available, otherwise use mock data for demonstration
      const actualPredictionData = predictionData && predictionData.length > 0 ? 
        predictionData.map(p => ({
          date: typeof p.date === 'string' ? new Date(p.date) : p.date,
          predicted: p.predicted || p.yhat || 2500,
          upper: p.upper || p.yhat_upper || 3000,
          lower: p.lower || p.yhat_lower || 2000,
          trend: p.trend || 0.05,
          seasonal: p.seasonal || 100,
          confidence: p.confidence || 0.85
        })) : [
        {
          date: new Date(),
          predicted: 2500,
          upper: 3000,
          lower: 2000,
          trend: 0.05,
          seasonal: 100,
          confidence: 0.85
        }
      ];
      
      const actualCategoryForecasts = categoryForecasts && categoryForecasts.length > 0 ?
        categoryForecasts.map(cf => ({
          category: cf.category || "Food",
          historicalAverage: cf.historical_average || cf.historicalAverage || 800,
          predicted: cf.predicted_average || cf.predicted || 850,
          confidence: cf.confidence || 0.8,
          trend: cf.trend || 'increasing' as const
        })) : [
        {
          category: "Food",
          historicalAverage: 800,
          predicted: 850,
          confidence: 0.8,
          trend: 'increasing' as const
        }
      ];
      
      const actualUserContext = userProfile || {
        avgMonthlyIncome: 5000,
        avgMonthlyExpenses: 3500,
        savingsRate: 0.3,
        budgetCategories: ['Food', 'Transportation', 'Entertainment'],
        financialGoals: [],
        spendingPatterns: []
      };
      
      // Generate AI insights
      const request = {
        predictionData: actualPredictionData,
        categoryForecasts: actualCategoryForecasts,
        userContext: actualUserContext,
        timeframe: timeframe === '3months' ? 'months_3' as const : 
                   timeframe === '6months' ? 'months_6' as const : 
                   'year_1' as const,
        customPrompt: `Provide specific financial advice and recommendations for a user with the following profile. Focus on actionable insights about spending optimization, savings strategies, and investment opportunities. Use the OpenRouter API with openai/gpt-oss-20b:free model to generate personalized advice.`
      };
      
      const response = await AIInsightsService.generateInsights(request);
      setAiInsights(response);
      
      // Reset rate limit state on successful generation
      setIsRateLimited(false);
      setRateLimitMessage(null);
      
      // Update usage count
      const newUsage = (usageStatus?.current_usage || 0) + 1;
      const today = new Date().toDateString();
      const updatedUsage = {
        current_usage: newUsage,
        max_usage: 5,
        exceeded: newUsage >= 5,
        date: today
      };
      
      localStorage.setItem(`ai_insights_usage_${user?.id}`, JSON.stringify(updatedUsage));
      setUsageStatus({
        current_usage: newUsage,
        max_usage: 5,
        exceeded: newUsage >= 5,
        reset_date: today
      });
      
      toast.success(`AI insights generated successfully! (${newUsage}/5 used today)`);
      
    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      
      // Check if this is a rate limiting error
      if (error.message && error.message.includes('Rate limit exceeded')) {
        setIsRateLimited(true);
        setRateLimitMessage(error.message);
        toast.error(error.message);
        // Don't increment usage for rate limit errors
        return;
      }
      
      // Reset rate limit state for other errors
      setIsRateLimited(false);
      setRateLimitMessage(null);
      toast.error(error.message || 'Failed to generate AI insights');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              AI-Powered Insights
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => onToggleTip('aiInsights', e)}
                  aria-label="AI Insights information"
                ></i>
              </div>
            </h6>
            <div className="d-flex align-items-center">
              {usageStatus && (
                <span className={`badge mr-2 ${
                  usageStatus.exceeded ? 'badge-warning' : 'badge-info'
                }`}>
                  {usageStatus.current_usage}/{usageStatus.max_usage} used
                </span>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={generateAIInsights}
                disabled={isGenerating || usageStatus?.exceeded}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status" />
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-robot mr-2"></i>
                    Generate AI Insights
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Rate Limiting Message */}
            {isRateLimited && (
              <div className="alert alert-warning mb-4">
                <div className="d-flex">
                  <div className="mr-3">
                    <i className="fas fa-exclamation-triangle fa-2x text-warning"></i>
                  </div>
                  <div>
                    <h6 className="alert-heading">AI Insights Rate Limited</h6>
                    <p className="mb-2">
                      {rateLimitMessage || 'The AI insights service is temporarily rate limited. Please try again later.'}
                    </p>
                    <p className="mb-0 small text-muted">
                      <strong>Note:</strong> No fallback insights are generated when rate limited to ensure transparency about AI availability.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* AI Insights Section */}
            {aiInsights && (
              <div className="mb-4">
                <div className="alert alert-success border-left-success" style={{ borderLeftWidth: "4px" }}>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="alert-heading mb-0">
                      <i className="fas fa-lightbulb mr-2"></i>
                      AI Financial Analysis
                    </h5>
                    <button
                      className="btn btn-sm btn-outline-info"
                      onClick={() => setShowInsightDetails(!showInsightDetails)}
                    >
                      {showInsightDetails ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                  
                  {/* Summary */}
                  <p className="mb-3 lead">{aiInsights.summary}</p>
                  
                  {/* Recommendations */}
                  <div className="mb-3">
                    <h6 className="font-weight-bold text-success">
                      <i className="fas fa-check-circle mr-2"></i>
                      Top Recommendations:
                    </h6>
                    <ul className="list-unstyled ml-3">
                      {aiInsights.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="mb-2">
                          <i className="fas fa-arrow-right text-success mr-2"></i>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {showInsightDetails && (
                    <div className="mt-4">
                      {/* Risk Assessment */}
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <h6 className="font-weight-bold text-warning">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            Risk Assessment: <span className={`badge badge-${
                              aiInsights.riskAssessment.level === 'high' ? 'danger' :
                              aiInsights.riskAssessment.level === 'medium' ? 'warning' : 'success'
                            }`}>{aiInsights.riskAssessment.level.toUpperCase()}</span>
                          </h6>
                          <ul className="small text-muted">
                            {aiInsights.riskAssessment.factors.map((factor, index) => (
                              <li key={index}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="col-md-6">
                          <h6 className="font-weight-bold text-info">
                            <i className="fas fa-chart-line mr-2"></i>
                            Opportunities:
                          </h6>
                          <ul className="small text-muted">
                            {aiInsights.opportunityAreas.map((opp, index) => (
                              <li key={index}>{opp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      {/* Mitigation Suggestions */}
                      <div className="mb-3">
                        <h6 className="font-weight-bold text-primary">
                          <i className="fas fa-shield-alt mr-2"></i>
                          Risk Mitigation:
                        </h6>
                        <ul className="list-unstyled ml-3">
                          {aiInsights.riskAssessment.mitigationSuggestions.map((suggestion, index) => (
                            <li key={index} className="mb-1 small text-muted">
                              <i className="fas fa-caret-right mr-2"></i>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Confidence and Metadata */}
                      <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                        <div>
                          <small className="text-muted">
                            <i className="fas fa-clock mr-1"></i>
                            Generated: {new Date(aiInsights.timestamp).toLocaleString()}
                          </small>
                        </div>
                        <div>
                          <span className="badge badge-info">
                            Confidence: {(aiInsights.confidenceLevel * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Usage Information */}
            {!aiInsights && !isRateLimited && (
              <div className="alert alert-info mb-4">
                <div className="d-flex">
                  <div className="mr-3">
                    <i className="fas fa-robot fa-2x text-info"></i>
                  </div>
                  <div>
                    <h6 className="alert-heading">AI-Powered Financial Insights</h6>
                    <p className="mb-2">
                      Get personalized financial advice and recommendations using advanced AI analysis.
                      Our AI analyzes your spending patterns, income trends, and financial goals to provide actionable insights.
                    </p>
                    <div className="mb-2">
                      <strong>Features:</strong>
                      <ul className="mb-0 mt-1">
                        <li>Personalized financial recommendations</li>
                        <li>Risk assessment and mitigation strategies</li>
                        <li>Investment and savings opportunities</li>
                        <li>Budget optimization suggestions</li>
                      </ul>
                    </div>
                    <small className="text-muted">
                      <i className="fas fa-info-circle mr-1"></i>
                      Powered by OpenAI GPT model • {usageStatus ? `${usageStatus.current_usage}/${usageStatus.max_usage}` : '0/5'} daily uses remaining
                    </small>
                  </div>
                </div>
              </div>
            )}
            
            <div className="row">
              <div className="col-lg-4 mb-4">
                <div className="card border-left-primary shadow h-100 py-0">
                  <div className="card-body py-2">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 d-flex align-items-center">
                          Income Projection
                          <div className="ml-2 position-relative">
                            <i 
                              className="fas fa-info-circle text-gray-400 cursor-pointer" 
                              onClick={(e) => onToggleTip('incomeProjection', e)}
                              aria-label="Income projection information"
                            ></i>
                          </div>
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {incomeGrowth > 0 ? "+" : ""}{incomeGrowth.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Your income is predicted to {incomeGrowth > 0 ? "increase" : "decrease"} over the next {getTimeframeLabel()}.
                        </div>
                      </div>
                      <div className="col-auto">
                        <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4 mb-4">
                <div className="card border-left-danger shadow h-100 py-0">
                  <div className="card-body py-2">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="text-xs font-weight-bold text-danger text-uppercase mb-1 d-flex align-items-center">
                          Expense Projection
                          <div className="ml-2 position-relative">
                            <i 
                              className="fas fa-info-circle text-gray-400 cursor-pointer" 
                              onClick={(e) => onToggleTip('expenseProjection', e)}
                              aria-label="Expense projection information"
                            ></i>
                          </div>
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {expenseGrowth > 0 ? "+" : ""}{expenseGrowth.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Your expenses are projected to {expenseGrowth > 0 ? "rise" : "fall"} over the selected period.
                        </div>
                      </div>
                      <div className="col-auto">
                        <i className="fas fa-chart-area fa-2x text-gray-300"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4 mb-4">
                <div className="card border-left-success shadow h-100 py-0">
                  <div className="card-body py-2">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="text-xs font-weight-bold text-success text-uppercase mb-1 d-flex align-items-center">
                          Savings Potential
                          <div className="ml-2 position-relative">
                            <i 
                              className="fas fa-info-circle text-gray-400 cursor-pointer" 
                              onClick={(e) => onToggleTip('savingsProjection', e)}
                              aria-label="Savings projection information"
                            ></i>
                          </div>
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {savingsGrowth > 0 ? "+" : ""}{savingsGrowth.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Your savings are predicted to {savingsGrowth > 0 ? "grow" : "decline"} during this timeframe.
                        </div>
                      </div>
                      <div className="col-auto">
                        <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h4 className="small font-weight-bold text-gray-700">
                  Prophet Model Confidence 
                  <i 
                    className="fas fa-info-circle text-gray-400 ml-2 cursor-pointer" 
                    onClick={(e) => onToggleTip('modelConfidence', e)}
                  ></i>
                </h4>
                <span className="font-weight-bold text-info">{modelAccuracy[4]?.value}%</span>
              </div>
              <div className="progress" style={{ height: "10px", borderRadius: "5px" }}>
                <div 
                  className="progress-bar bg-info progress-bar-striped" 
                  role="progressbar" 
                  style={{ 
                    width: `${modelAccuracy[4]?.value}%`,
                    borderRadius: "5px" 
                  }}
                  aria-valuenow={modelAccuracy[4]?.value} 
                  aria-valuemin={0} 
                  aria-valuemax={100}
                ></div>
              </div>
              <div className="d-flex justify-content-between mt-1">
                <small className="text-muted">MAPE: {modelAccuracy[0]?.value}%</small>
                <small className="text-muted">R² Score: {modelAccuracy[3]?.value}</small>
              </div>
            </div>

            <div className="alert alert-info border-left-info" style={{ borderLeftWidth: "4px", background: "rgba(54, 185, 204, 0.05)" }}>
              <div className="d-flex">
                <div className="mr-3">
                  <i className="fa-solid fa-magnifying-glass-chart fa-2x text-gray-300"></i>
                </div>
                <div>
                  <p className="mb-0">
                    <strong>AI-powered predictions:</strong> These forecasts are generated using Facebook's Prophet model trained on your historical financial patterns. The predictions analyze seasonal trends, growth patterns, and recurring behaviors in your spending and income.
                  </p>
                  <p className="mb-0 mt-2">
                    <strong>AI Insights:</strong> Enhanced with OpenRouter API integration providing personalized financial advice, risk assessments, and optimization recommendations based on your unique financial profile.
                  </p>
                  <p className="mb-0 mt-2">
                    <small>* AI insights are generated using advanced language models. Actual results may vary based on unforeseen changes in your financial situation.</small>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsCard;