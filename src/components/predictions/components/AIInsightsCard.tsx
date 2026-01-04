import React, { FC, useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { AIInsightsCardProps } from "../types";
import { AIInsightsService } from "../../../services/database/aiInsightsService";
import { useAuth } from "../../../utils/AuthContext";
import { toast } from "react-toastify";
import { AIInsightResponse } from "../../../types";
import { supabase } from "../../../utils/supabaseClient";
import UsageLimitIndicator from "./UsageLimitIndicator";
import "../../../styles/scrollbar.css";

interface AIInsightUsageStatus {
  current_usage: number;
  max_usage: number;
  exceeded: boolean;
  reset_date: string;
}

// Export the ref handle type
export interface AIInsightsCardHandle {
  generateInsights: () => Promise<void>;
}

const AIInsightsCard = forwardRef<AIInsightsCardHandle, AIInsightsCardProps>(({
  insights,
  timeframe,
  modelAccuracy,
  activeTip,
  tooltipPosition,
  onToggleTip,
  predictionData,
  transactionTypePredictions,
  userProfile
}, ref) => {
  const { user } = useAuth();
  const { incomeGrowth, expenseGrowth, savingsGrowth } = insights;
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState<AIInsightResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [usageStatus, setUsageStatus] = useState<AIInsightUsageStatus | null>(null);
  const [showInsightDetails, setShowInsightDetails] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  
  // Ref for auto-scrolling to insights
  const aiInsightsRef = useRef<HTMLDivElement>(null);
  
  // Load cached AI insights on component mount (no auto-generation)
  useEffect(() => {
    if (user?.id) {
      loadCachedAIInsights();
    }
  }, [user?.id]); // Only reload when user changes, not when insights change
  
  /**
   * Load most recent AI insights from database (not cache-key dependent)
   */
  const loadCachedAIInsights = async () => {
    if (!user?.id) return;
    
    try {
      console.log('Loading most recent AI insights from database for user:', user.id);
      
      // Get the most recent AI insights for this user (not expired)
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0 && data[0].insights) {
        const dbInsights = data[0].insights;
        
        console.log('✓ Found cached AI insights in database:', {
          id: data[0].id,
          generated_at: data[0].generated_at,
          ai_service: data[0].ai_service,
          insightsType: typeof dbInsights,
          hasRecommendationsCol: !!data[0].recommendations,
          hasRiskAssessmentCol: !!data[0].risk_assessment,
          hasOpportunityAreasCol: !!data[0].opportunity_areas,
          insightsKeys: dbInsights ? Object.keys(dbInsights) : []
        });
        
        // Handle both old and new data structures
        let reconstructedInsights: AIInsightResponse;
        
        // Check if insights is already a proper AIInsightResponse object
        if (dbInsights && typeof dbInsights === 'object' && 
            ('summary' in dbInsights || 'recommendations' in dbInsights)) {
          // New structure: insights contains the full AIInsightResponse
          reconstructedInsights = {
            summary: dbInsights.summary || '',
            timestamp: dbInsights.timestamp ? new Date(dbInsights.timestamp) : new Date(),
            recommendations: data[0].recommendations || dbInsights.recommendations || [],
            riskAssessment: data[0].risk_assessment || dbInsights.riskAssessment || { 
              level: 'medium', 
              factors: [], 
              mitigationSuggestions: [] 
            },
            opportunityAreas: data[0].opportunity_areas || dbInsights.opportunityAreas || [],
            confidenceLevel: dbInsights.confidenceLevel || 0.75
          };
        } else if (Array.isArray(dbInsights)) {
          // Old fallback structure: insights is an array
          reconstructedInsights = {
            summary: 'Fallback insights loaded from database',
            timestamp: new Date(),
            recommendations: [],
            riskAssessment: { level: 'medium', factors: [], mitigationSuggestions: [] },
            opportunityAreas: [],
            confidenceLevel: 0.7
          };
        } else {
          // Unknown structure
          console.error('Unknown insights structure:', dbInsights);
          return;
        }
        
        console.log('✅ Reconstructed AI insights:', {
          summary: reconstructedInsights.summary?.substring(0, 100) + '...',
          recommendations: reconstructedInsights.recommendations?.length || 0,
          riskLevel: reconstructedInsights.riskAssessment?.level || 'unknown',
          opportunityAreas: reconstructedInsights.opportunityAreas?.length || 0,
          confidence: reconstructedInsights.confidenceLevel
        });
        
        setAiInsights(reconstructedInsights);
        toast.success('Loaded your most recent AI insights');
        
        // Update access tracking
        await supabase
          .from('ai_insights')
          .update({ 
            access_count: (data[0].access_count || 0) + 1,
            last_accessed_at: new Date().toISOString()
          })
          .eq('id', data[0].id);
      } else {
        console.log('No cached AI insights found for user');
      }
    } catch (error) {
      console.error('Error loading cached AI insights:', error);
    }
  };
  
  /**
   * Generate cache key for current data
   */
  const generateCacheKeyForCurrentData = (): string => {
    const dataHash = JSON.stringify({
      timeframe,
      avgIncome: Math.round(userProfile?.avgMonthlyIncome || 0),
      avgExpenses: Math.round(userProfile?.avgMonthlyExpenses || 0),
      categoriesCount: transactionTypePredictions?.length || 0,
      predictionsCount: predictionData?.length || 0
    });
    
    return btoa(dataHash).slice(0, 16);
  };
  
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case "3months": return "3 months";
      case "6months": return "6 months";
      case "1year": return "year";
      default: return "period";
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
    
    // Removed usage limits - allow unlimited AI insights generation
    
    setIsGenerating(true);
    
    try {
      console.log('🔍 DEBUG: Checking prediction data:', predictionData);
      console.log('🔍 DEBUG: Checking user profile:', userProfile);
      
      // Use user profile data directly (no category analysis)
      // IMPORTANT: Include user_id for database storage
      const actualUserContext = userProfile ? {
        ...userProfile,
        userId: user.id, // Add user ID for database storage
        user_id: user.id // Alternative field name
      } : {
        userId: user.id, // Add user ID for database storage
        user_id: user.id, // Alternative field name
        avgMonthlyIncome: 0,
        avgMonthlyExpenses: 0,
        savingsRate: 0,
        budgetCategories: [],
        financialGoals: [],
        spendingPatterns: []
      };
      
      console.log('👤 ACTUAL user context (with user_id):', actualUserContext);
      
      // Use real prediction data
      const actualPredictionData = predictionData && predictionData.length > 0 ? 
        predictionData : [];
      
      console.log('🔮 ACTUAL prediction data:', actualPredictionData);
      
      // Generate AI insights (without category analysis)
      const request = {
        predictionData: actualPredictionData,
        categoryForecasts: [], // No category analysis
        userContext: actualUserContext,
        timeframe: timeframe === '3months' ? 'months_3' as const : 
                   timeframe === '6months' ? 'months_6' as const : 
                   'year_1' as const,
        customPrompt: `Provide specific financial advice and recommendations for a user with the following profile. Focus on actionable insights about transaction type analysis (Income, Expenses, Savings), cash flow optimization, savings strategies, and investment opportunities. Use the OpenRouter API with openai/gpt-oss-120b:free model to generate personalized advice.`
      };
      
      // Force regenerate - bypass cache and create fresh insights
      const response = await AIInsightsService.generateInsights(request, true);
      
      console.log('🔍 AI Insights Response Debug:', {
        response,
        recommendations: response?.recommendations,
        summary: response?.summary,
        riskAssessment: response?.riskAssessment,
        opportunityAreas: response?.opportunityAreas
      });
      
      setAiInsights(response);
      
      // Reset rate limit state on successful generation
      setIsRateLimited(false);
      setRateLimitMessage(null);
      
      // Verify insights were saved to database and reload to get latest
      console.log('✅ AI insights generated and should be saved to database with user_id:', user.id);
      
      // Reload from database to get the absolute latest data
      setTimeout(async () => {
        try {
          await loadCachedAIInsights();
          console.log('✅ Reloaded latest AI insights from database');
        } catch (reloadError) {
          console.error('Error reloading AI insights:', reloadError);
        }
      }, 1500);
      
      // Auto-scroll to insights after generation
      setTimeout(() => {
        if (aiInsightsRef.current) {
          aiInsightsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 500);
      
      toast.success('AI insights generated and updated successfully!');
      
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
  
  // Expose generateAIInsights method via ref for parent component to trigger automatically
  useImperativeHandle(ref, () => ({
    generateInsights: generateAIInsights
  }));

  return (
    <>
      {/* Mobile AI Insights Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-robot text-indigo-500 text-[10px]"></i>
              AI Insights
            </h6>
            <button
              onClick={generateAIInsights}
              disabled={isGenerating}
              className={`px-2.5 py-1 rounded-full text-[9px] font-medium transition-all ${
                isGenerating 
                  ? 'bg-gray-100 text-gray-400' 
                  : 'bg-indigo-500 text-white active:scale-95'
              }`}
            >
              {isGenerating ? (
                <><i className="fas fa-spinner fa-spin mr-1"></i>Generating...</>
              ) : (
                <><i className="fas fa-magic mr-1"></i>Generate</>
              )}
            </button>
          </div>
          
          {/* Content */}
          <div className="p-3">
            {/* Rate Limit Warning */}
            {isRateLimited && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
                <div className="flex items-start gap-2">
                  <i className="fas fa-exclamation-triangle text-amber-500 text-xs mt-0.5"></i>
                  <div>
                    <p className="text-[10px] font-semibold text-amber-800">Rate Limited</p>
                    <p className="text-[9px] text-amber-600">{rateLimitMessage || 'Please try again later.'}</p>
                  </div>
                </div>
              </div>
            )}
            
            {aiInsights ? (
              <div className="space-y-3">
                {/* Summary */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-lightbulb text-emerald-500 text-xs"></i>
                    <span className="text-[10px] font-semibold text-emerald-700">Financial Analysis</span>
                  </div>
                  <p className="text-[10px] text-gray-700 leading-relaxed">
                    {showInsightDetails 
                      ? aiInsights.summary 
                      : `${aiInsights.summary?.substring(0, 200)}...`
                    }
                  </p>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowInsightDetails(!showInsightDetails);
                    }}
                    className="min-h-[44px] min-w-[100px] px-4 py-2 mt-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-600 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <i className={`fas ${showInsightDetails ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i>
                    {showInsightDetails ? 'Show Less' : 'Show More'}
                  </button>
                </div>
                
                {/* Expanded Details Section */}
                {showInsightDetails && (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Full Recommendations */}
                    {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <i className="fas fa-tasks text-blue-500 text-xs"></i>
                          <span className="text-[10px] font-semibold text-blue-700">All Recommendations</span>
                        </div>
                        <div className="space-y-2">
                          {aiInsights.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-2 bg-white rounded-lg p-2.5 shadow-sm">
                              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <p className="text-[10px] text-gray-700 leading-relaxed">
                                {typeof rec === 'string' ? rec.replace(/\*\*/g, '') : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Risk Assessment Details */}
                    {aiInsights.riskAssessment && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <i className="fas fa-shield-alt text-amber-500 text-xs"></i>
                          <span className="text-[10px] font-semibold text-amber-700">Risk Assessment</span>
                        </div>
                        <div className="mb-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            aiInsights.riskAssessment.level === 'high' ? 'bg-rose-100 text-rose-600' :
                            aiInsights.riskAssessment.level === 'medium' ? 'bg-amber-100 text-amber-600' :
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            {aiInsights.riskAssessment.level?.toUpperCase() || 'LOW'} RISK
                          </span>
                        </div>
                        {aiInsights.riskAssessment.factors && aiInsights.riskAssessment.factors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[9px] font-semibold text-gray-600 mb-1.5">Risk Factors:</p>
                            <div className="space-y-1">
                              {aiInsights.riskAssessment.factors.map((factor, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <i className="fas fa-exclamation-circle text-amber-500 text-[8px] mt-0.5"></i>
                                  <p className="text-[9px] text-gray-600">{factor}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiInsights.riskAssessment.mitigationSuggestions && aiInsights.riskAssessment.mitigationSuggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[9px] font-semibold text-gray-600 mb-1.5">Mitigation Tips:</p>
                            <div className="space-y-1">
                              {aiInsights.riskAssessment.mitigationSuggestions.map((tip, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <i className="fas fa-check-circle text-emerald-500 text-[8px] mt-0.5"></i>
                                  <p className="text-[9px] text-gray-600">{tip}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Opportunity Areas */}
                    {aiInsights.opportunityAreas && aiInsights.opportunityAreas.length > 0 && (
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <i className="fas fa-star text-purple-500 text-xs"></i>
                          <span className="text-[10px] font-semibold text-purple-700">Opportunity Areas</span>
                        </div>
                        <div className="space-y-1.5">
                          {aiInsights.opportunityAreas.map((area, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-white rounded-lg p-2 shadow-sm">
                              <i className="fas fa-arrow-right text-purple-500 text-[8px] mt-1"></i>
                              <p className="text-[9px] text-gray-700">{area}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Confidence Level */}
                    {aiInsights.confidenceLevel && (
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                        <span className="text-[9px] text-gray-500">AI Confidence Level</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${(aiInsights.confidenceLevel || 0) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] font-semibold text-indigo-600">
                            {Math.round((aiInsights.confidenceLevel || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Recommendations Preview - Only show when collapsed */}
                {!showInsightDetails && aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                  <div>
                    <p className="text-[9px] font-semibold text-gray-600 uppercase mb-2">Top Recommendations</p>
                    <div className="space-y-1.5">
                      {aiInsights.recommendations.slice(0, 2).map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </span>
                          <p className="text-[9px] text-gray-700 line-clamp-2">
                            {typeof rec === 'string' ? rec.replace(/\*\*/g, '').substring(0, 100) : ''}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Risk Level Badge - Only show when collapsed */}
                {!showInsightDetails && aiInsights.riskAssessment && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[9px] text-gray-500">Risk Level</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-semibold ${
                      aiInsights.riskAssessment.level === 'high' ? 'bg-rose-100 text-rose-600' :
                      aiInsights.riskAssessment.level === 'medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {aiInsights.riskAssessment.level?.toUpperCase() || 'LOW'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-robot text-indigo-500 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">No AI Insights Yet</p>
                <p className="text-[10px] text-gray-500 mb-3">Generate insights for personalized advice</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop AI Insights Card */}
      <div className="row d-none d-md-block">
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
              {/* Compact Usage Indicator */}
              {user?.id && (
                <div className="mr-3">
                  <UsageLimitIndicator 
                    userId={user.id} 
                    serviceType="ai_insights" 
                    compact={true}
                  />
                </div>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={generateAIInsights}
                disabled={isGenerating}
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
              <div className="mb-4" ref={aiInsightsRef}>
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
                  
                  {/* Enhanced Summary with Transaction Type Analysis */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="font-weight-bold text-primary mb-3">
                        <i className="fas fa-chart-bar mr-2"></i>
                        Financial Overview & Transaction Type Analysis
                      </h6>
                      <div className="bg-light p-3 rounded">
                        <div className="mb-3">
                          <textarea
                            readOnly
                            value={(() => {
                              let fullAnalysis = aiInsights.summary || '';
                              
                              // Combine summary with ANY recommendations that are analysis (not action items)
                              if (aiInsights.recommendations && aiInsights.recommendations.length > 0) {
                                const analysisTexts = aiInsights.recommendations
                                  .map(rec => {
                                    if (!rec || typeof rec !== 'string') return '';
                                    
                                    // Clean the text
                                    let cleanText = rec
                                      .replace(/\*\*/g, '')
                                      .replace(/__/g, '')
                                      .replace(/\*/g, '')
                                      .replace(/^Priority\s*\d+\s*[–—-]\s*/i, '')
                                      .replace(/^Priority\s*\d+\s*:\s*/i, '')
                                      .replace(/TOP\s+\d+\s+PRIORITIES/gi, '')
                                      .trim();
                                    
                                    // If it doesn't look like an action recommendation, include it in analysis
                                    // Action items typically start with verbs or have clear directives
                                    const isActionItem = /^(set|build|start|create|reduce|increase|track|review|consider|establish|open|transfer|allocate|limit|cut|save|invest|plan|define|implement|monitor|adjust|re-categorize|pin|categorize|organize|consolidate|automate|pinpoint|trim|explore|use|re-evaluate|make|channel|break|cap|free|expand|identify|once|prioritize)/i.test(cleanText);
                                    
                                    // If it's continuing a sentence or is descriptive analysis, include it
                                    if (!isActionItem || cleanText.startsWith('months of')) {
                                      return cleanText;
                                    }
                                    return '';
                                  })
                                  .filter(text => text.length > 10);
                                
                                if (analysisTexts.length > 0) {
                                  fullAnalysis += ' ' + analysisTexts.join(' ');
                                }
                              }
                              
                              // Clean up the combined text
                              let cleanedAnalysis = fullAnalysis
                                // Remove markdown bold/italic syntax
                                .replace(/\*\*/g, '')
                                .replace(/__/g, '')
                                .replace(/\*/g, '');
                              
                              // Split into sentences and deduplicate more aggressively
                              const sentences = cleanedAnalysis
                                .split(/(?<=[.!?])\s+/)
                                .map(s => s.trim())
                                .filter(s => s.length > 10); // Filter out very short fragments
                              
                              // Track seen sentences by normalized version
                              const seenSentences = new Set();
                              const uniqueSentences = [];
                              
                              for (const sentence of sentences) {
                                // Create a normalized version for comparison
                                const normalized = sentence
                                  .toLowerCase()
                                  .replace(/[₱,\d]/g, 'X') // Replace numbers/currency with X to catch similar sentences
                                  .replace(/\s+/g, ' ')
                                  .trim();
                                
                                // Skip if we've seen this pattern before
                                if (seenSentences.has(normalized)) {
                                  continue;
                                }
                                
                                // Skip incomplete sentences (end with incomplete text)
                                if (sentence.match(/≈₱\s*$/) || sentence.match(/\(\s*$/)) {
                                  continue;
                                }
                                
                                seenSentences.add(normalized);
                                uniqueSentences.push(sentence);
                              }
                              
                              return uniqueSentences.join(' ')
                                // Clean up excessive whitespace
                                .replace(/\s+/g, ' ')
                                .trim();
                            })()}
                            className="form-control font-weight-medium"
                            style={{
                              minHeight: '200px',
                              resize: 'vertical',
                              backgroundColor: '#f8f9fc',
                              border: '1px solid #e3e6f0',
                              borderRadius: '0.35rem',
                              fontSize: '0.95rem',
                              lineHeight: '1.6',
                              padding: '0.75rem',
                              color: '#5a5c69',
                              cursor: 'default',
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'inherit'
                            }}
                            aria-label="Financial Overview Summary"
                          />
                        </div>
                        
                        {/* Transaction Type Forecast - Compact Single Row */}
                        <div className="mt-3">
                          <h6 className="text-info mb-2">
                            <i className="fas fa-exchange-alt mr-2"></i>
                            Transaction Type Forecast ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}):
                          </h6>
                          {transactionTypePredictions && transactionTypePredictions.length > 0 && !transactionTypePredictions[0]?.isEmptyState ? (
                            <div className="row">
                              {(() => {
                                // Filter to show only current month data based on local time
                                const now = new Date();
                                const currentMonth = now.getMonth();
                                const currentYear = now.getFullYear();
                                
                                // Transaction type predictions are already aggregated for the current period
                                // So we just display them as-is (they represent current month vs predicted next month)
                                return transactionTypePredictions;
                              })().map((transactionType, index) => {
                                const getTypeConfig = (type: string) => {
                                  switch (type) {
                                    case 'Income':
                                      return { icon: 'fas fa-arrow-circle-up', color: '#1cc88a' };
                                    case 'Expense':
                                      return { icon: 'fas fa-arrow-circle-down', color: '#e74a3b' };
                                    case 'Savings':
                                      return { icon: 'fas fa-piggy-bank', color: '#36b9cc' };
                                    case 'Total':
                                      return { icon: 'fas fa-balance-scale', color: '#4e73df' };
                                    default:
                                      return { icon: 'fas fa-circle', color: '#858796' };
                                  }
                                };
                                
                                const getStatusBadge = (type: string, changePercent: number) => {
                                  let status = 'Stable';
                                  let badgeClass = 'badge-secondary';
                                  
                                  if (type === 'Total') {
                                    status = changePercent > 0 ? 'Growing' : 'Declining';
                                    badgeClass = changePercent > 0 ? 'badge-success' : 'badge-danger';
                                  } else if (type === 'Income') {
                                    status = changePercent > 0 ? 'Increasing' : changePercent < -5 ? 'Decreasing' : 'Stable';
                                    badgeClass = changePercent > 0 ? 'badge-success' : changePercent < -5 ? 'badge-danger' : 'badge-warning';
                                  } else if (type === 'Expense') {
                                    status = changePercent < 0 ? 'Decreasing' : changePercent < 10 ? 'Stable' : 'Increasing';
                                    badgeClass = changePercent < 0 ? 'badge-success' : changePercent < 10 ? 'badge-warning' : 'badge-danger';
                                  } else if (type === 'Savings') {
                                    status = changePercent > 0 ? 'Growing' : changePercent < -5 ? 'Declining' : 'Stable';
                                    badgeClass = changePercent > 0 ? 'badge-success' : changePercent < -5 ? 'badge-danger' : 'badge-warning';
                                  }
                                  
                                  return { status, badgeClass };
                                };
                                
                                const config = getTypeConfig(transactionType.type);
                                const { status, badgeClass } = getStatusBadge(transactionType.type, transactionType.changePercent);
                                const isIncrease = transactionType.change >= 0;
                                
                                return (
                                  <div key={index} className="col-3 mb-2">
                                    <div className="card shadow-sm h-100" style={{ borderLeft: `3px solid ${config.color}` }}>
                                      <div className="card-body p-2">
                                        {/* Header - Compact */}
                                        <div className="d-flex align-items-center mb-2">
                                          <div 
                                            className="rounded-circle d-flex align-items-center justify-content-center mr-2"
                                             style={{ 
                                              width: '32px',
                                              height: '32px',
                                              backgroundColor: config.color,
                                              color: 'white',
                                              fontSize: '14px'
                                            }}
                                          >
                                            <i className={config.icon}></i>
                                        </div>
                                          <div style={{ minWidth: 0 }}>
                                            <div className="text-xs font-weight-bold text-truncate" style={{ color: config.color }}>
                                              {transactionType.type}
                                            </div>
                                            <span className={`badge ${badgeClass} badge-sm`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                              {status}
                                            </span>
                                            </div>
                                          </div>
                                        
                                        {/* Values - Compact */}
                                        <div className="mb-2">
                                          <div className="text-xs text-muted">This Month</div>
                                          <div className="small font-weight-bold text-gray-800 text-truncate">
                                            ₱{transactionType.current.toLocaleString()}
                                            </div>
                                          </div>
                                        <div className="mb-2">
                                          <div className="text-xs text-muted">Next Month</div>
                                          <div className="small font-weight-bold text-gray-800 text-truncate">
                                            ₱{transactionType.predicted.toLocaleString()}
                                          </div>
                                        </div>
                                        
                                        {/* Change - Compact */}
                                        <div className="pt-2 border-top">
                                          <div className="d-flex justify-content-between align-items-center">
                                            <span className={`text-xs font-weight-bold ${isIncrease ? 'text-danger' : 'text-success'}`}>
                                              {isIncrease ? '+' : ''}₱{Math.abs(transactionType.change).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                            </span>
                                            <span className={`text-xs font-weight-bold ${isIncrease ? 'text-danger' : 'text-success'}`}>
                                              {isIncrease ? '+' : ''}{transactionType.changePercent.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="alert alert-info text-center mb-2">
                              <i className="fas fa-info-circle mr-2"></i>
                              No transaction type forecast data available
                          </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Recommendations */}
                  <div className="mb-4">
                    <h6 className="font-weight-bold text-success mb-3">
                      <i className="fas fa-lightbulb mr-2"></i>
                      Smart Recommendations Based on Your Data
                    </h6>
                    <div className="row">
                      {(() => {
                        // Ensure we have recommendations and they're not empty
                        if (!aiInsights.recommendations || aiInsights.recommendations.length === 0) {
                          return (
                            <div className="col-12">
                              <div className="alert alert-warning">
                                <i className="fas fa-exclamation-triangle mr-2"></i>
                                No specific recommendations available. Please try regenerating AI insights.
                              </div>
                            </div>
                          );
                        }

                        // Process recommendations - ONLY show actual action items, not analysis
                        const processedRecommendations = aiInsights.recommendations.map((rec, index) => {
                          if (!rec || typeof rec !== 'string') return '';
                          
                          // Clean up the recommendation text
                          let cleanRec = rec
                            // Remove markdown formatting
                            .replace(/\*\*/g, '')
                            .replace(/__/g, '')
                            .replace(/\*/g, '')
                            // Remove existing "Priority X" labels (we'll add consistent ones)
                            .replace(/^Priority\s*\d+\s*[–—-]\s*/i, '')
                            .replace(/^Priority\s*\d+\s*:\s*/i, '')
                            .replace(/Priority\s*\d+\s*[–—-]\s*/gi, '')
                            // Remove "TOP X PRIORITIES" headers
                            .replace(/TOP\s+\d+\s+PRIORITIES/gi, '')
                            // Remove bullet points and leading special characters
                            .replace(/^[\s•\-\+\>\d\.\)\]]+\s*/, '')
                            // Fix broken formatting
                            .replace(/\s*–\s*/g, ' – ')
                            .replace(/\s*—\s*/g, ' — ')
                            // Normalize whitespace
                            .replace(/\r\n/g, ' ')
                            .replace(/\n/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                            
                          // Skip if too short or meaningless
                          if (cleanRec.length < 15) {
                            return '';
                          }
                          
                          // FILTER OUT analysis text - only keep action items
                          // Action items typically start with action verbs or imperative phrases
                          const isActionItem = /^(set|build|start|create|reduce|increase|track|review|consider|establish|open|transfer|allocate|limit|cut|save|invest|plan|define|implement|monitor|adjust|re-categorize|pin|categorize|organize|consolidate|automate|pinpoint|trim|explore|use|re-evaluate|make|channel|break|cap|free|expand|identify|once|prioritize)/i.test(cleanRec);
                          
                          // Skip if it's continuing analysis (starts with descriptive/passive text)
                          const isAnalysis = /^(months of|you're|your monthly|the\s|while|however|although|but|with an emergency|top\s+\d+|risk assessment|^\(\d+\))/i.test(cleanRec);
                          
                          // Keep if it's an action item and not analysis
                          if (!isActionItem || isAnalysis) {
                            return ''; // Skip analysis text
                          }
                          
                          return cleanRec;
                        }).filter(rec => rec.length >= 15); // Filter out empty/too short recommendations
                        
                        // Show max 3 priorities only
                        const finalRecommendations = processedRecommendations.slice(0, 3);
                        
                        if (finalRecommendations.length === 0) {
                          return (
                            <div className="col-12">
                              <div className="alert alert-info">
                                <i className="fas fa-info-circle mr-2"></i>
                                Recommendations are being processed. Please try regenerating AI insights for detailed recommendations.
                              </div>
                            </div>
                          );
                        }
                        
                        return finalRecommendations.map((rec, index) => (
                          <div key={index} className="col-12 mb-3">
                            <div className="card border-left-success shadow-sm" style={{ borderLeftWidth: '4px' }}>
                              <div className="card-body p-3">
                                <div className="d-flex align-items-start">
                                  <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center mr-3" 
                                       style={{ width: '28px', height: '28px', fontSize: '14px', minWidth: '28px', flexShrink: 0 }}>
                                    {index + 1}
                                  </div>
                                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                    <textarea
                                      readOnly
                                      value={rec}
                                      className="form-control text-sm border-0"
                                      style={{
                                        minHeight: '80px',
                                        maxHeight: '300px',
                                        resize: 'vertical',
                                        backgroundColor: 'transparent',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.5',
                                        padding: '0.25rem 0',
                                        color: '#5a5c69',
                                        cursor: 'default',
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'inherit',
                                        boxShadow: 'none'
                                      }}
                                      aria-label={`Recommendation ${index + 1}`}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  
                  {showInsightDetails && (
                    <div className="mt-4">
                      {/* Enhanced Risk Assessment & Opportunities */}
                      <div className="row mb-4">
                        {/* Risk Assessment Card */}
                        <div className="col-md-6 mb-3">
                          <div className={`card border-left-${
                            aiInsights.riskAssessment?.level === 'high' ? 'danger' :
                            aiInsights.riskAssessment?.level === 'medium' ? 'warning' : 'success'
                          } shadow-sm h-100`} style={{ borderLeftWidth: '4px' }}>
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="font-weight-bold mb-0">
                                  <i className="fas fa-shield-alt mr-2"></i>
                                  Risk Assessment
                                </h6>
                                <span className={`badge badge-${
                                  aiInsights.riskAssessment?.level === 'high' ? 'danger' :
                                  aiInsights.riskAssessment?.level === 'medium' ? 'warning' : 'success'
                                }`}>
                                  {aiInsights.riskAssessment?.level?.toUpperCase() || 'LOW'}
                                </span>
                              </div>
                              
                              <div className="mb-3">
                                <h6 className="text-sm font-weight-bold text-muted mb-2">Risk Factors:</h6>
                                {aiInsights.riskAssessment?.factors && aiInsights.riskAssessment.factors.length > 0 ? (
                                  <textarea
                                    readOnly
                                    value={(() => {
                                      // Parse and extract ONLY risk factors (not mitigation strategies)
                                      const allText = aiInsights.riskAssessment.factors.join(' ');
                                      
                                      // Split by numbered patterns to separate factors from mitigations
                                      const cleanedFactors = aiInsights.riskAssessment.factors
                                        .map(factor => {
                                          let cleaned = factor
                                            .replace(/\*\*/g, '')
                                            .replace(/__/g, '')
                                            .replace(/\*/g, '')
                                            .replace(/^Risk factors?:\s*/i, '')
                                            .replace(/^Mitigation strategies?:\s*/i, '')
                                            .replace(/^TOP\s+\d+\s+PRIORITIES?\s*/i, '')
                                            .replace(/^RISK ASSESSMENT:\s*\w+\s*/i, '')
                                            .trim();
                                          
                                          // If this contains "TOP PRIORITIES" or "Priority X:", it's not a risk factor
                                          if (/TOP\s+\d+\s+PRIORITIES|Priority\s+\d+:/i.test(cleaned)) {
                                            return '';
                                          }
                                          
                                          // If this contains mitigation/action language, split it
                                          if (cleaned.includes('Immediately') || cleaned.includes('Prioritize') || 
                                              cleaned.includes('Use BudgetMe') || cleaned.includes('Expand your') ||
                                              /review and tighten|set up|establish|allocate|identify and trim/i.test(cleaned)) {
                                            // Try to extract just the factors part (before action items)
                                            const parts = cleaned.split(/(?:TOP\s+\d+\s+PRIORITIES|Priority\s+\d+:|(?:\d+\)?\s*)?(?:Immediately|Prioritize|Use|Review|Set|Establish|Create|Build|Expand|Allocate|Identify))/i);
                                            if (parts.length > 1 && parts[0].trim().length > 15) {
                                              cleaned = parts[0].trim();
                                            } else {
                                              // This is all action items, not risk factors
                                              return '';
                                            }
                                          }
                                          
                                          return cleaned;
                                        })
                                        .map(factor => {
                                          // Clean up the text
                                          return factor
                                            .replace(/^[\d\.\)\]]+\s*/, '')
                                            .replace(/^[-•]\s*/, '')
                                            .replace(/,\s*\d+\)\s*$/, '') // Remove trailing ", 3)"
                                            .trim();
                                        })
                                        .filter(factor => {
                                          if (factor.length < 15) return false;
                                          // Skip if it looks like a mitigation action
                                          if (/^(immediately|prioritize|use|review and|set up|establish|create|build|start)/i.test(factor)) return false;
                                          // Skip section headers
                                          if (/^(risk factors?|mitigation|strategies?):?\s*$/i.test(factor)) return false;
                                          return true;
                                        });
                                      
                                      // Deduplicate with better pattern matching
                                      const seen = new Map();
                                      cleanedFactors.forEach(factor => {
                                        // Normalize by replacing numbers with X to catch similar patterns
                                        const normalized = factor
                                          .toLowerCase()
                                          .replace(/[₱,\d]/g, 'X')
                                          .replace(/\s+/g, ' ')
                                          .trim();
                                        
                                        // Only add if we haven't seen this pattern
                                        if (!seen.has(normalized)) {
                                          seen.set(normalized, factor);
                                        }
                                      });
                                      
                                      const uniqueFactors = Array.from(seen.values());
                                      return uniqueFactors.length > 0 ? uniqueFactors.join('\n\n') : 'No specific risk factors identified.';
                                    })()}
                                    className="form-control text-sm border-0"
                                    style={{
                                      minHeight: '100px',
                                      resize: 'vertical',
                                      backgroundColor: 'transparent',
                                      fontSize: '0.875rem',
                                      lineHeight: '1.5',
                                      padding: '0.5rem',
                                      color: '#5a5c69',
                                      cursor: 'default',
                                      overflowY: 'auto',
                                      whiteSpace: 'pre-wrap',
                                      fontFamily: 'inherit',
                                      boxShadow: 'none'
                                    }}
                                    aria-label="Risk Factors"
                                  />
                                ) : (
                                  <div className="text-sm text-muted">
                                    <i className="fas fa-info-circle mr-2"></i>
                                    No specific risk factors identified at this time.
                                  </div>
                                )}
                              </div>
                              
                              {/* Transaction Type-based risk indicators */}
                              {transactionTypePredictions && transactionTypePredictions.length > 0 && !transactionTypePredictions[0]?.isEmptyState && (
                                <div className="mt-3 pt-3 border-top">
                                  <h6 className="text-sm font-weight-bold text-muted mb-2">High-Risk Transaction Types:</h6>
                                  {transactionTypePredictions
                                    .filter(t => t.type !== 'Total' && t.changePercent > 10)
                                    .map((transaction, index) => {
                                      const getTypeIcon = (type: string) => {
                                        switch (type) {
                                          case 'Income': return 'fas fa-plus-circle text-success';
                                          case 'Expense': return 'fas fa-minus-circle text-danger';
                                          case 'Savings': return 'fas fa-piggy-bank text-info';
                                          default: return 'fas fa-circle';
                                        }
                                      };
                                      
                                      return (
                                        <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                                          <div className="d-flex align-items-center">
                                            <i className={`${getTypeIcon(transaction.type)} mr-2`}></i>
                                            <span className="text-xs font-weight-bold">{transaction.type}</span>
                                          </div>
                                          <span className="text-xs text-danger">+{transaction.changePercent.toFixed(1)}%</span>
                                        </div>
                                      );
                                    })}
                                  {transactionTypePredictions.filter(t => t.type !== 'Total' && t.changePercent > 10).length === 0 && (
                                    <div className="text-xs text-muted">
                                      <i className="fas fa-check-circle mr-1"></i>
                                      No high-risk transaction types detected
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Opportunities Card */}
                        <div className="col-md-6 mb-3">
                          <div className="card border-left-info shadow-sm h-100" style={{ borderLeftWidth: '4px' }}>
                            <div className="card-body">
                              <h6 className="font-weight-bold mb-3">
                                <i className="fas fa-rocket mr-2"></i>
                                Growth Opportunities
                              </h6>
                              
                              <div className="mb-3">
                                {aiInsights.opportunityAreas && aiInsights.opportunityAreas.length > 0 ? (
                                  <textarea
                                    readOnly
                                    value={(() => {
                                      // Clean and deduplicate opportunity areas - NO LIMITS
                                      const cleanedOpportunities = aiInsights.opportunityAreas
                                        .map(opp => 
                                          opp
                                            .replace(/\*\*/g, '')
                                            .replace(/__/g, '')
                                            .replace(/\*/g, '')
                                            .replace(/^[\d\.\)\]]+\s*/, '') // Remove numbering
                                            .replace(/^[-•]\s*/, '') // Remove bullets
                                            .replace(/^Priority\s*\d+\s*[–—:-]\s*/i, '') // Remove priority labels
                                            // Remove section headers that got mixed in
                                            .replace(/^RISK ASSESSMENT:\s*\w+\s*/i, '')
                                            .replace(/^Risk factors?:\s*/i, '')
                                            .replace(/^Mitigation strategies?:\s*/i, '')
                                            .replace(/^OPPORTUNITY AREAS?\s*/i, '')
                                            .trim()
                                        )
                                        .filter(opp => {
                                          // Filter out content that doesn't belong
                                          if (opp.length < 20) return false;
                                          
                                          // Skip section headers
                                          if (/^(risk assessment|risk factors?|mitigation|strategies?|opportunity areas?):?\s*$/i.test(opp)) return false;
                                          
                                          // Skip risk-related content (should be in risk section)
                                          if (/^(months of expenses|below the recommended|emergency fund|rapid rise|no active savings)/i.test(opp)) return false;
                                          
                                          // Skip numbered risk factors or mitigation strategies
                                          if (/^\d+\)\s*(rapid|emergency|no active|use budgetme|automate|set up monthly)/i.test(opp)) return false;
                                          
                                          // Skip if it looks like an action item/recommendation (starts with action verbs)
                                          const isActionItem = /^(set|build|start|create|reduce|increase|track|review|consider|establish|open|transfer|allocate|limit|cut|save|invest|plan|define|implement|monitor|adjust|re-categorize|pin|categorize|use|automate|prioritize|immediately)/i.test(opp);
                                          
                                          // Skip if it contains mitigation/risk language
                                          if (/threatens your|covers less than|budget review|catch spikes|high-yield savings/i.test(opp)) return false;
                                          
                                          return !isActionItem;
                                        });
                                      
                                      // Use Map to track unique opportunities with better deduplication
                                      const seen = new Map();
                                      cleanedOpportunities.forEach(opp => {
                                        // Normalize by replacing numbers with X to catch similar patterns
                                        const normalized = opp
                                          .toLowerCase()
                                          .replace(/[₱,\d]/g, 'X')
                                          .replace(/\s+/g, ' ')
                                          .trim();
                                        
                                        // Only add if we haven't seen this pattern
                                        if (!seen.has(normalized)) {
                                          seen.set(normalized, opp);
                                        }
                                      });
                                      
                                      // NO LIMITS - return all unique opportunities
                                      const uniqueOpportunities = Array.from(seen.values());
                                      return uniqueOpportunities.length > 0 ? uniqueOpportunities.join('\n\n') : 'Analyzing growth opportunities based on your financial data...';
                                    })()}
                                    className="form-control text-sm border-0"
                                    style={{
                                      minHeight: '100px',
                                      resize: 'vertical',
                                      backgroundColor: 'transparent',
                                      fontSize: '0.875rem',
                                      lineHeight: '1.5',
                                      padding: '0.5rem',
                                      color: '#5a5c69',
                                      cursor: 'default',
                                      overflowY: 'auto',
                                      whiteSpace: 'pre-wrap',
                                      fontFamily: 'inherit',
                                      boxShadow: 'none'
                                    }}
                                    aria-label="Growth Opportunities"
                                  />
                                ) : (
                                  <div className="text-sm text-muted">
                                    <i className="fas fa-info-circle mr-2"></i>
                                    Analyzing growth opportunities based on your spending patterns...
                                  </div>
                                )}
                              </div>
                              
                              {/* Transaction Type-based savings opportunities */}
                              {transactionTypePredictions && transactionTypePredictions.length > 0 && !transactionTypePredictions[0]?.isEmptyState && (
                                <div className="mt-3 pt-3 border-top">
                                  <h6 className="text-sm font-weight-bold text-muted mb-2">Savings Opportunities:</h6>
                                  {transactionTypePredictions
                                    .filter(t => {
                                      // Show Expense decreasing or Savings increasing
                                      return (t.type === 'Expense' && t.change < 0) || 
                                             (t.type === 'Savings' && t.change > 0) ||
                                             (t.type === 'Income' && t.change > 0);
                                    })
                                    .map((transaction, index) => {
                                      const getTypeIcon = (type: string) => {
                                        switch (type) {
                                          case 'Income': return 'fas fa-plus-circle text-success';
                                          case 'Expense': return 'fas fa-minus-circle text-success';
                                          case 'Savings': return 'fas fa-piggy-bank text-success';
                                          default: return 'fas fa-circle';
                                        }
                                      };
                                      
                                      const savedAmount = Math.abs(transaction.change);
                                      const message = transaction.type === 'Expense' 
                                        ? `${transaction.type} Decreasing`
                                        : transaction.type === 'Savings'
                                        ? `${transaction.type} Growing`
                                        : `${transaction.type} Increasing`;
                                      
                                      return (
                                        <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                                          <div className="d-flex align-items-center">
                                            <i className={`${getTypeIcon(transaction.type)} mr-2`}></i>
                                            <span className="text-xs font-weight-bold">{message}</span>
                                          </div>
                                          <span className="text-xs text-success">₱{savedAmount.toLocaleString()}</span>
                                        </div>
                                      );
                                    })}
                                  {transactionTypePredictions.filter(t => 
                                    (t.type === 'Expense' && t.change < 0) || 
                                    (t.type === 'Savings' && t.change > 0) ||
                                    (t.type === 'Income' && t.change > 0)
                                  ).length === 0 && (
                                    <div className="text-xs text-muted">
                                      <i className="fas fa-info-circle mr-1"></i>
                                      Monitor your spending to identify savings opportunities
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mitigation Suggestions */}
                      <div className="mb-3">
                        <h6 className="font-weight-bold text-primary">
                          <i className="fas fa-shield-alt mr-2"></i>
                          Risk Mitigation:
                        </h6>
                        <div className="ml-3">
                          {aiInsights.riskAssessment?.mitigationSuggestions && aiInsights.riskAssessment.mitigationSuggestions.length > 0 ? (
                            <textarea
                              readOnly
                              value={(() => {
                                // Parse and extract ONLY mitigation strategies (not risk factors)
                                const cleanedSuggestions = aiInsights.riskAssessment.mitigationSuggestions
                                  .map(sug => {
                                    let cleaned = sug
                                      .replace(/\*\*/g, '')
                                      .replace(/__/g, '')
                                      .replace(/\*/g, '')
                                      .replace(/^Risk factors?:\s*/i, '')
                                      .replace(/^Mitigation strategies?:\s*/i, '')
                                      .replace(/^TOP\s+\d+\s+PRIORITIES?\s*/i, '')
                                      .replace(/^Priority\s+\d+:\s*/i, '')
                                      .replace(/^RISK ASSESSMENT:\s*\w+\s*/i, '')
                                      .trim();
                                    
                                    // Skip if this is labeled as Priority (those go to Smart Recommendations)
                                    if (/^Priority\s+\d+:/i.test(cleaned)) {
                                      return '';
                                    }
                                    
                                    // If contains risk factors followed by mitigations, extract only mitigations
                                    const mitigationMatch = cleaned.match(/\(\d+\)\s*(Re-budget|Prioritize|Set clear|Build|Automate|Establish)[^]*$/i);
                                    
                                    if (mitigationMatch) {
                                      cleaned = mitigationMatch[0];
                                    } else if (/^(?:\(\d+\)|)\s*(?:Expense-to-income|Emergency fund|No active)/i.test(cleaned) && 
                                              !/Re-budget|Prioritize|Set|Build|Automate/i.test(cleaned)) {
                                      // This is just risk factors, not mitigations
                                      return '';
                                    }
                                    
                                    return cleaned;
                                  })
                                  .map(sug => {
                                    // Clean up formatting
                                    return sug
                                      .replace(/^[\d\.\)\]]+\s*/, '')
                                      .replace(/^[-•]\s*/, '')
                                      .replace(/,\s*\d+\)\s*$/, '')
                                      .trim();
                                  })
                                  .filter(sug => {
                                    if (sug.length < 20) return false;
                                    // Skip section headers
                                    if (/^(risk factors?|mitigation|strategies?):?\s*$/i.test(sug)) return false;
                                    // Skip if it's describing a risk, not a solution
                                    if (/^(Rapid|Emergency fund only|No defined|rise in|months of expenses)/i.test(sug)) return false;
                                    // Keep only action-oriented suggestions
                                    if (!/immediately|prioritize|use|review|set|establish|create|build|consider|implement|monitor|add|transfer|consolidate|automate/i.test(sug)) return false;
                                    return true;
                                  });
                                
                                // Deduplicate with better pattern matching
                                const seen = new Map();
                                cleanedSuggestions.forEach(sug => {
                                  // Normalize by replacing numbers with X to catch similar patterns
                                  const normalized = sug
                                    .toLowerCase()
                                    .replace(/[₱,\d]/g, 'X')
                                    .replace(/\s+/g, ' ')
                                    .trim();
                                  
                                  // Only add if we haven't seen this pattern
                                  if (!seen.has(normalized)) {
                                    seen.set(normalized, sug);
                                  }
                                });
                                
                                const uniqueSuggestions = Array.from(seen.values());
                                return uniqueSuggestions.length > 0 ? uniqueSuggestions.join('\n\n') : 'Analyzing risk mitigation strategies...';
                              })()}
                              className="form-control small border-0"
                              style={{
                                minHeight: '100px',
                                resize: 'vertical',
                                backgroundColor: 'transparent',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                                padding: '0.5rem',
                                color: '#858796',
                                cursor: 'default',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'inherit',
                                boxShadow: 'none'
                              }}
                              aria-label="Risk Mitigation Suggestions"
                            />
                          ) : (
                            <div className="mb-1 small text-muted">
                              <i className="fas fa-info-circle mr-2"></i>
                              Analyzing risk mitigation strategies...
                            </div>
                          )}
                        </div>
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
                      Powered by OpenRouter API • Unlimited AI insights generation
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
                    <strong>Financial Predictions:</strong> Income predictions use Facebook's Prophet model or stable baseline analysis from your actual transaction history. Expense predictions are calculated per category based on your spending patterns with realistic 2-3% annual growth assumptions.
                  </p>
                  <p className="mb-0 mt-2">
                    <strong>Calculation Method:</strong> Similar to your transaction summary cards, we calculate totals by transaction type (income/expense) and project forward with minimal variance for stable, realistic forecasts!
                  </p>
                  <p className="mb-0 mt-2">
                    <strong>AI Insights:</strong> Enhanced with OpenRouter API integration providing personalized financial advice, risk assessments, and optimization recommendations based on your unique financial profile.
                  </p>
                  <p className="mb-0 mt-2">
                    <small>* Predictions are based on your actual transaction history. Add more transactions for more accurate forecasts. Results may vary based on unforeseen changes in your financial situation.</small>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
});

AIInsightsCard.displayName = 'AIInsightsCard';

export default AIInsightsCard;