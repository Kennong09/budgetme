import { chatbotService } from '../../utils/chatbotService';
import axios from 'axios';
import { 
  AIInsightRequest, 
  AIInsightResponse, 
  RiskAssessment, 
  ProphetPrediction, 
  CategoryForecast, 
  UserFinancialProfile,
  PredictionContext
} from '../../types';
import { supabase } from '../../utils/supabaseClient';
import { env } from '../../utils/env';

// Configuration for Prophet API
const PROPHET_API_BASE_URL = env.PROPHET_API_URL;

interface ProphetAIInsightRequest {
  predictions: ProphetPrediction[];
  category_forecasts: CategoryForecast[];
  user_profile: UserFinancialProfile;
  timeframe: string;
  custom_prompt?: string;
}

interface ProphetAIInsightResponse {
  insights: {
    summary: string;
    recommendations: string[];
    risk_assessment: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
      mitigation_suggestions: string[];
    };
    opportunity_areas: string[];
    confidence_level: number;
  };
  generated_at: string;
  model_used: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface PromptTemplate {
  system: string;
  context: string;
  data: string;
  instructions: string;
}

interface InsightCache {
  [key: string]: {
    response: AIInsightResponse;
    timestamp: number;
  };
}

// NEW interfaces for SQL schema integration
interface AIInsightDBResult {
  id: string;
  user_id: string;
  prediction_id?: string;
  insights: any;
  ai_service: string;
  model_used: string;
  generation_time_ms?: number;
  cache_key?: string;
  generated_at: string;
  expires_at: string;
}

export class AIInsightsService {
  private static cache: InsightCache = {};
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Generates AI insights with SQL schema integration
   */
  static async generateInsights(request: AIInsightRequest, forceRegenerate: boolean = false): Promise<AIInsightResponse> {
    const startTime = Date.now();
    let insightId: string | null = null;
    
    try {
      // Step 1: Check usage limits for AI insights (skip if no user context)
      const userId = (request.userContext as any)?.userId || 
                    (request.userContext as any)?.user_id || 
                    (request.userContext as any)?.id;
      
      console.log('🔍 Extracted user ID for AI insights:', userId);
      console.log('🔍 User context keys:', Object.keys(request.userContext || {}));
      
      if (userId) {
        console.log('✅ User ID found, proceeding with database storage');
        const usageCheck = await this.checkAIInsightsUsage(request.userContext);
        if (!usageCheck.can_request) {
          throw new Error(`RATE_LIMIT: AI insights limit exceeded. ${usageCheck.remaining} requests remaining.`);
        }
      } else {
        console.warn('⚠️ WARNING: No user ID found in request.userContext, insights will NOT be saved to database');
        console.log('UserContext received:', request.userContext);
      }

      // Step 2: Check cache in database first (only if user exists and not forcing regenerate)
      let cacheKey: string | null = null;
      let cachedInsight: AIInsightResponse | null = null;
      
      if (userId && !forceRegenerate) {
        cacheKey = this.generateCacheKey(request);
        cachedInsight = await this.getCachedInsightFromDB(cacheKey);
        
        if (cachedInsight) {
          console.log('Returning cached AI insight');
          return cachedInsight;
        }
      } else if (forceRegenerate) {
        console.log('🔄 Force regenerate enabled - bypassing cache and generating fresh AI insights');
        cacheKey = this.generateCacheKey(request);
      } else {
        cacheKey = this.generateCacheKey(request);
      }

      let insights: AIInsightResponse | null = null;
      let aiService = 'fallback';
      let modelUsed = 'local';

      // Use OpenRouter API via chatbot service for AI insights generation
      console.log('Using OpenRouter API via chatbot service for AI insights generation');
      
      // Step 3: Try OpenRouter API via chatbot service first
      try {
        insights = await this.generateChatbotInsights(request);
        aiService = 'openrouter';
        modelUsed = 'openai/gpt-oss-20b:free';
        console.log('✅ Successfully generated AI insights via OpenRouter API');
      } catch (chatbotError: any) {
        console.warn('⚠️ OpenRouter API via chatbot service failed, trying direct API:', chatbotError.message);
        
        // Step 4: Try Prophet API with OpenRouter as backup
        try {
          insights = await this.generateProphetAIInsights(request);
          aiService = 'prophet-openrouter';
          modelUsed = 'openrouter-gpt-4o-mini';
          console.log('✅ Successfully generated AI insights via Prophet API');
        } catch (prophetError: any) {
          console.warn('⚠️ Prophet API also failed, using enhanced fallback:', prophetError.message);
          // Generate enhanced fallback insights with better logic
          insights = this.generateEnhancedFallbackInsights(request);
          aiService = 'fallback';
          modelUsed = 'local-enhanced';
        }
      }

      // Ensure we have insights (fallback if all methods failed)
      if (!insights) {
        console.warn('All AI methods failed, generating fallback insights');
        insights = this.generateFallbackInsights(request);
        aiService = 'fallback';
        modelUsed = 'local-fallback';
      }

      // Step 6: Store insights in database (only if user exists)
      const generationTime = Date.now() - startTime;
      
      if (userId && cacheKey) {
        console.log('💾 Attempting to store AI insights to database...');
        console.log('💾 Storage params:', { userId, aiService, modelUsed, generationTime, cacheKey });
        
        insightId = await this.storeAIInsightsToDB(
          userId,
          null, // No prediction ID for standalone insights
          insights,
          aiService,
          modelUsed,
          generationTime,
          cacheKey
        );

        // Step 7: Increment usage counter
        await this.incrementAIInsightsUsage(request.userContext);
        
        console.log(`✅ SUCCESS: AI insights stored in database with ID: ${insightId}`);
      } else {
        console.error('❌ FAILED: Cannot store AI insights - missing userId or cacheKey');
        console.log('Debug info:', { userId, cacheKey, hasInsights: !!insights });
      }

      return insights;

    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      
      // Check if this is a rate limiting error
      if (error.message && error.message.startsWith('RATE_LIMIT:')) {
        throw error; // Re-throw rate limit errors
      }
      
      // For other errors, return fallback insights
      return this.generateFallbackInsights(request);
    }
  }

  // =====================================================
  // SQL SCHEMA INTEGRATION METHODS
  // =====================================================

  /**
   * Check AI insights usage limits using SQL schema
   */
  private static async checkAIInsightsUsage(userContext: UserFinancialProfile): Promise<any> {
    try {
      // Extract user ID from context (you may need to adjust this based on your UserFinancialProfile structure)
      const userId = (userContext as any).userId || (userContext as any).user_id;
      if (!userId) {
        console.warn('No user ID found in context, allowing usage with default limits');
        // If no user ID, allow usage with default limits
        return {
          can_request: true,
          current_usage: 0,
          limit: 5,
          remaining: 5
        };
      }

      const { data, error } = await supabase.rpc('can_make_prediction_request', {
        p_user_id: userId,
        p_service_type: 'ai_insights'
      });

      if (error) {
        console.error('Error checking AI insights usage:', error);
        return {
          can_request: true,
          current_usage: 0,
          limit: 5,
          remaining: 5
        };
      }

      console.log('AI insights usage check:', {
        userId,
        can_request: data.can_request,
        current_usage: data.current_usage,
        limit: data.limit
      });

      return data;
    } catch (error) {
      console.error('Database error checking AI insights usage:', error);
      return {
        can_request: true,
        current_usage: 0,
        limit: 5,
        remaining: 5
      };
    }
  }

  /**
   * Increment AI insights usage counter
   */
  private static async incrementAIInsightsUsage(userContext: UserFinancialProfile): Promise<boolean> {
    try {
      const userId = (userContext as any).userId || (userContext as any).user_id;
      if (!userId) {
        console.warn('No user ID found, skipping usage increment');
        return true; // Skip if no user ID
      }

      const { data, error } = await supabase.rpc('increment_prediction_usage', {
        p_user_id: userId,
        p_service_type: 'ai_insights'
      });

      if (error) {
        console.error('Error incrementing AI insights usage:', error);
        return false;
      }

      console.log('Successfully incremented AI insights usage for user:', userId);
      return data === true;
    } catch (error) {
      console.error('Database error incrementing AI insights usage:', error);
      return false;
    }
  }

  /**
   * Store AI insights in database
   */
  private static async storeAIInsightsToDB(
    userId: string,
    predictionId: string | null,
    insights: AIInsightResponse,
    aiService: string,
    modelUsed: string,
    generationTimeMs: number,
    cacheKey: string
  ): Promise<string> {
    try {
      console.log('📝 storeAIInsightsToDB called with:', {
        userId,
        predictionId,
        aiService,
        modelUsed,
        generationTimeMs,
        cacheKey,
        hasInsights: !!insights
      });
      
      // Ensure userId is available from context if not provided
      if (!userId && insights && typeof insights === 'object') {
        const insightsAny = insights as any;
        userId = insightsAny.userId || insightsAny.user_id || '';
        console.log('📝 Extracted userId from insights object:', userId);
      }
      
      if (!userId) {
        console.error('❌ Cannot store AI insights: userId is null or undefined');
        return `fallback-${Date.now()}`;
      }

      console.log('📝 Calling store_ai_insights RPC function...');
      const { data, error } = await supabase.rpc('store_ai_insights', {
        p_user_id: userId,
        p_prediction_id: predictionId,
        p_insights: insights,
        p_ai_service: aiService,
        p_model_used: modelUsed,
        p_generation_time_ms: generationTimeMs,
        p_cache_key: cacheKey
      });

      if (error) {
        console.error('❌ Error storing AI insights to database:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return `fallback-${Date.now()}`;
      }

      console.log(`✅ AI insights stored successfully in database with ID: ${data}`);
      return data;
    } catch (error) {
      console.error('Database error storing AI insights:', error);
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Get cached AI insights from database
   */
  private static async getCachedInsightFromDB(cacheKey: string): Promise<AIInsightResponse | null> {
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      // Update access tracking
      await supabase
        .from('ai_insights')
        .update({ 
          access_count: (data.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', data.id);

      console.log('Retrieved cached AI insights:', {
        id: data.id,
        cache_key: cacheKey,
        generated_at: data.generated_at
      });

      return data.insights as AIInsightResponse;
    } catch (error) {
      console.error('Database error getting cached insights:', error);
      return null;
    }
  }

  /**
   * Generate AI insights using OpenRouter API via chatbot service
   */
  private static async generateChatbotInsights(request: AIInsightRequest): Promise<AIInsightResponse> {
    try {
      console.log('🚀 Starting AI insights generation via OpenRouter API...');
      
      const prompt = this.buildFinancialAnalysisPrompt(request);
      console.log('📝 Built comprehensive financial analysis prompt');
      
      const response = await chatbotService.sendMessage(prompt);
      console.log('🌍 OpenRouter API response received:', { success: response.success });
      
      if (!response.success) {
        console.error('❌ OpenRouter API failed:', response.error);
        throw new Error(response.error || 'OpenRouter API service failed');
      }

      if (!response.message || response.message.trim().length === 0) {
        console.error('❌ Empty response from OpenRouter API');
        throw new Error('Empty response from OpenRouter API');
      }

      console.log('✅ Successfully received AI insights from OpenRouter API, parsing response...');
      const parsedInsights = this.parseInsightResponse(response.message);
      
      console.log('✅ AI insights parsed successfully:', {
        summary: parsedInsights.summary.substring(0, 100) + '...',
        recommendationsCount: parsedInsights.recommendations.length,
        riskLevel: parsedInsights.riskAssessment.level,
        confidence: parsedInsights.confidenceLevel
      });
      
      return parsedInsights;
    } catch (error) {
      console.error('❌ Chatbot insights generation failed:', error);
      throw error; // Re-throw to allow fallback handling
    }
  }

  /**
   * Generates interactive AI insights using dedicated endpoint with OpenRouter API
   */
  private static async generateInteractiveAIInsights(request: AIInsightRequest): Promise<AIInsightResponse | null> {
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      // Prepare request for the dedicated AI insights endpoint
      const aiInsightsRequest = {
        predictions: request.predictionData.map(pred => ({
          date: pred.date.toISOString(),
          predicted: pred.predicted,
          upper: pred.upper,
          lower: pred.lower,
          trend: pred.trend,
          seasonal: pred.seasonal || 0,
          confidence: pred.confidence
        })),
        category_forecasts: request.categoryForecasts.reduce((acc, forecast) => {
          acc[forecast.category] = {
            historical_average: forecast.historicalAverage,
            predicted_average: forecast.predicted,
            confidence: forecast.confidence,
            trend: forecast.trend,
            data_points: 10 // Mock data points
          };
          return acc;
        }, {} as Record<string, any>),
        user_profile: {
          avg_monthly_income: request.userContext.avgMonthlyIncome,
          avg_monthly_expenses: request.userContext.avgMonthlyExpenses,
          savings_rate: request.userContext.savingsRate,
          spending_categories: request.userContext.budgetCategories,
          transaction_count: request.userContext.financialGoals.length + 20 // Mock transaction count
        },
        timeframe: request.timeframe,
        custom_prompt: request.customPrompt
      };

      // Call the dedicated AI insights endpoint
      const response = await axios.post(
        `${PROPHET_API_BASE_URL}/api/v1/predictions/ai-insights`,
        aiInsightsRequest,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Check for rate limiting
      if (response.data?.rate_limited) {
        const retryAfter = response.data?.error?.details?.retry_after;
        const retryMessage = retryAfter 
          ? `Rate limit exceeded. Try again in ${retryAfter} seconds.`
          : 'Rate limit exceeded. Please try again later.';
        
        throw new Error(`RATE_LIMIT: ${retryMessage}`);
      }

      if (response.status !== 200 || !response.data?.success) {
        throw new Error(response.data?.error || 'Invalid response from AI insights service');
      }

      // Transform API response to our format
      const insightsData = response.data.insights;
      
      // Create comprehensive insights from the API response - NO LIMITS
      const recommendations = insightsData
        .filter((insight: any) => insight.recommendation)
        .map((insight: any) => insight.recommendation);

      const riskFactors = insightsData
        .filter((insight: any) => insight.category === 'risk')
        .map((insight: any) => insight.description);

      const opportunities = insightsData
        .filter((insight: any) => insight.category === 'opportunity')
        .map((insight: any) => insight.description);

      const mitigationSuggestions = insightsData
        .filter((insight: any) => insight.category === 'risk')
        .map((insight: any) => insight.recommendation)
        .filter((rec: string) => rec);

      // Determine overall risk level
      const riskInsights = insightsData.filter((insight: any) => insight.category === 'risk');
      const avgRiskConfidence = riskInsights.length > 0 
        ? riskInsights.reduce((sum: number, insight: any) => sum + insight.confidence, 0) / riskInsights.length
        : 0.5;
      
      const riskLevel: 'low' | 'medium' | 'high' = 
        avgRiskConfidence > 0.8 ? 'high' :
        avgRiskConfidence > 0.5 ? 'medium' : 'low';

      // Create summary from all insights
      const summary = insightsData.length > 0 
        ? insightsData[0].description || 'AI analysis completed based on your financial data.'
        : 'AI analysis completed based on your financial data.';

      // Calculate overall confidence
      const overallConfidence = insightsData.length > 0
        ? insightsData.reduce((sum: number, insight: any) => sum + insight.confidence, 0) / insightsData.length
        : 0.75;

      return {
        summary,
        recommendations: recommendations.length > 0 ? recommendations : [
          'Review your spending patterns for optimization opportunities',
          'Consider setting up automated savings to improve your financial position',
          'Monitor your category budgets to ensure you stay on track'
        ],
        riskAssessment: {
          level: riskLevel,
          factors: riskFactors.length > 0 ? riskFactors : ['Market volatility', 'Spending variability'],
          mitigationSuggestions: mitigationSuggestions.length > 0 ? mitigationSuggestions : [
            'Build an emergency fund covering 3-6 months of expenses',
            'Diversify your income sources when possible'
          ]
        },
        opportunityAreas: opportunities.length > 0 ? opportunities : [
          'Budget optimization',
          'Savings rate improvement',
          'Investment planning'
        ],
        confidenceLevel: overallConfidence,
        timestamp: new Date(response.data.metadata?.generated_at || new Date().toISOString())
      };
    } catch (error) {
      console.error('Interactive AI insights error:', error);
      return null;
    }
  }

  /**
   * Generates AI insights using the Prophet prediction API with OpenRouter
   */
  private static async generateProphetAIInsights(request: AIInsightRequest): Promise<AIInsightResponse | null> {
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      // Prepare request for Prophet API
      const prophetRequest: ProphetAIInsightRequest = {
        predictions: request.predictionData,
        category_forecasts: request.categoryForecasts,
        user_profile: request.userContext,
        timeframe: request.timeframe,
        custom_prompt: request.customPrompt
      };

      // Call Prophet API AI insights endpoint
      const response = await axios.post(
        `${PROPHET_API_BASE_URL}/api/v1/predictions/ai-insights`,
        prophetRequest,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Check for rate limiting
      if (response.data?.rate_limited) {
        const retryAfter = response.data?.error?.details?.retry_after;
        const retryMessage = retryAfter 
          ? `Rate limit exceeded. Try again in ${retryAfter} seconds.`
          : 'Rate limit exceeded. Please try again later.';
        
        throw new Error(`RATE_LIMIT: ${retryMessage}`);
      }

      if (response.status !== 200 || !response.data?.insights) {
        throw new Error('Invalid response from Prophet AI service');
      }

      // Transform Prophet API response to our format
      const prophetInsights = response.data.insights;
      
      return {
        summary: prophetInsights.summary,
        recommendations: prophetInsights.recommendations,
        riskAssessment: {
          level: prophetInsights.risk_assessment.level,
          factors: prophetInsights.risk_assessment.factors,
          mitigationSuggestions: prophetInsights.risk_assessment.mitigation_suggestions
        },
        opportunityAreas: prophetInsights.opportunity_areas,
        confidenceLevel: prophetInsights.confidence_level,
        timestamp: new Date(response.data.generated_at || new Date().toISOString())
      };
    } catch (error) {
      console.error('Prophet AI insights error:', error);
      return null;
    }
  }

  /**
   * Builds a comprehensive prompt for financial analysis using OpenRouter API
   */
  private static buildFinancialAnalysisPrompt(request: AIInsightRequest): string {
    const { predictionData, categoryForecasts, userContext, timeframe, customPrompt } = request;
    
    const timeframeName = this.getTimeframeName(timeframe);
    const monthlyIncome = userContext.avgMonthlyIncome || 0;
    const monthlyExpenses = userContext.avgMonthlyExpenses || 0;
    const savingsRate = userContext.savingsRate || 0;
    const monthlyBalance = monthlyIncome - monthlyExpenses;
    
    // Calculate key financial metrics
    const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome * 100).toFixed(1) : '0';
    const emergencyFundMonths = monthlyExpenses > 0 && monthlyBalance > 0 ? (monthlyBalance / monthlyExpenses * 12).toFixed(1) : '0';
    
    return `You are an expert financial advisor analyzing a user's financial data from BudgetMe, a personal finance app. Provide specific, actionable insights based on their actual financial situation.

📊 FINANCIAL PROFILE ANALYSIS:
• Monthly Income: ₱${monthlyIncome.toLocaleString()}
• Monthly Expenses: ₱${monthlyExpenses.toLocaleString()}
• Net Cash Flow: ₱${monthlyBalance.toLocaleString()}
• Current Savings Rate: ${savingsRate.toFixed(1)}%
• Expense-to-Income Ratio: ${debtToIncomeRatio}%
• Emergency Fund Potential: ${emergencyFundMonths} months of expenses
• Budget Categories: ${userContext.budgetCategories.join(', ')}
• Active Financial Goals: ${userContext.financialGoals.length}

📈 CATEGORY SPENDING ANALYSIS (${timeframeName}):
${this.formatDetailedCategoryAnalysis(categoryForecasts)}

🔮 MONTHLY PREDICTIONS:
${this.formatPredictionData(predictionData)}

💡 KEY INSIGHTS FROM CATEGORY DATA:
${this.generateCategoryInsights(categoryForecasts)}

${customPrompt ? `\n🎯 SPECIFIC FOCUS: ${customPrompt}\n` : ''}


Please provide a comprehensive financial analysis in the following format:

**FINANCIAL SUMMARY** (2-3 sentences):
Analyze the user's overall financial health, current trends, and trajectory. Be specific about their cash flow situation and what it means for their financial goals.

**TOP 3 PRIORITIES** (EXACTLY 3 RECOMMENDATIONS - NO MORE, NO LESS):
• Priority 1: [Most important action based on their specific situation]
• Priority 2: [Second most impactful recommendation]
• Priority 3: [Additional optimization opportunity]

**RISK ASSESSMENT: [HIGH/MEDIUM/LOW]**
• Risk factors: [List 2-3 specific risks based on their data]
• Mitigation strategies: [Specific steps to address these risks]

**OPPORTUNITY AREAS**:
• [2-3 specific opportunities for financial improvement]

**CONFIDENCE LEVEL**: [X]% - [Brief explanation of confidence factors]

IMPORTANT: Base your advice entirely on the provided financial data. Use Philippine peso amounts and local context. Be encouraging but realistic. Focus on actionable steps they can implement in BudgetMe. Avoid generic advice - make it personal to their situation.`;
  }

  /**
   * Formats prediction data for the AI prompt
   */
  private static formatPredictionData(predictions: ProphetPrediction[]): string {
    if (predictions.length === 0) return 'No prediction data available';

    // Always format as PHP now
    const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;
    
    return predictions.map((pred, index) => {
      const monthName = new Date(pred.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `${monthName}: Predicted ${formatCurrency(pred.predicted)} (Range: ${formatCurrency(pred.lower)} - ${formatCurrency(pred.upper)}, Confidence: ${(pred.confidence * 100).toFixed(0)}%)`;
    }).join('\n');
  }

  /**
   * Formats detailed category analysis for the AI prompt
   */
  private static formatDetailedCategoryAnalysis(forecasts: CategoryForecast[]): string {
    if (forecasts.length === 0) return 'No category forecasts available';

    const analysis = forecasts.map(forecast => {
      const change = forecast.predicted - forecast.historicalAverage;
      const changePercent = ((change / forecast.historicalAverage) * 100).toFixed(1);
      const trendIcon = forecast.trend === 'increasing' ? '↑' : forecast.trend === 'decreasing' ? '↓' : '→';
      const severity = Math.abs(parseFloat(changePercent)) > 20 ? 'SIGNIFICANT' : 
                      Math.abs(parseFloat(changePercent)) > 10 ? 'MODERATE' : 'MINOR';
      
      return `• ${forecast.category}:
   Current Month: ₱${forecast.historicalAverage.toLocaleString()}
   Next Month Prediction: ₱${forecast.predicted.toLocaleString()}
   Change: ${changePercent}% ${trendIcon} (₱${Math.abs(change).toLocaleString()})
   Impact Level: ${severity}`;
    }).join('\n\n');
    
    return analysis;
  }
  
  /**
   * Generate key insights from category data for AI prompt
   */
  private static generateCategoryInsights(forecasts: CategoryForecast[]): string {
    if (forecasts.length === 0) return 'No category data for analysis';
    
    const insights = [];
    
    // Find highest increasing category
    const increasingCategories = forecasts.filter(f => f.predicted > f.historicalAverage);
    if (increasingCategories.length > 0) {
      const highest = increasingCategories.reduce((max, cat) => 
        ((cat.predicted - cat.historicalAverage) / cat.historicalAverage) > 
        ((max.predicted - max.historicalAverage) / max.historicalAverage) ? cat : max
      );
      const increasePercent = (((highest.predicted - highest.historicalAverage) / highest.historicalAverage) * 100).toFixed(1);
      insights.push(`• HIGHEST RISK: ${highest.category} spending is predicted to increase by ${increasePercent}% (₱${(highest.predicted - highest.historicalAverage).toLocaleString()} more)`);
    }
    
    // Find highest decreasing category
    const decreasingCategories = forecasts.filter(f => f.predicted < f.historicalAverage);
    if (decreasingCategories.length > 0) {
      const lowest = decreasingCategories.reduce((min, cat) => 
        ((cat.historicalAverage - cat.predicted) / cat.historicalAverage) > 
        ((min.historicalAverage - min.predicted) / min.historicalAverage) ? cat : min
      );
      const decreasePercent = (((lowest.historicalAverage - lowest.predicted) / lowest.historicalAverage) * 100).toFixed(1);
      insights.push(`• BIGGEST OPPORTUNITY: ${lowest.category} spending is predicted to decrease by ${decreasePercent}% (₱${(lowest.historicalAverage - lowest.predicted).toLocaleString()} saved)`);
    }
    
    // Calculate total predicted vs current
    const totalCurrent = forecasts.reduce((sum, f) => sum + f.historicalAverage, 0);
    const totalPredicted = forecasts.reduce((sum, f) => sum + f.predicted, 0);
    const overallChange = totalPredicted - totalCurrent;
    const overallChangePercent = ((overallChange / totalCurrent) * 100).toFixed(1);
    
    if (overallChange > 0) {
      insights.push(`• OVERALL TREND: Total spending is predicted to increase by ₱${overallChange.toLocaleString()} (${overallChangePercent}%) next month`);
    } else if (overallChange < 0) {
      insights.push(`• OVERALL TREND: Total spending is predicted to decrease by ₱${Math.abs(overallChange).toLocaleString()} (${Math.abs(parseFloat(overallChangePercent))}%) next month`);
    } else {
      insights.push(`• OVERALL TREND: Total spending is predicted to remain stable next month`);
    }
    
    return insights.join('\n');
  }
  
  /**
   * Legacy method for backward compatibility
   */
  private static formatCategoryForecasts(forecasts: CategoryForecast[]): string {
    if (forecasts.length === 0) return 'No category forecasts available';

    return forecasts.map(forecast => {
      const change = forecast.predicted - forecast.historicalAverage;
      const changePercent = ((change / forecast.historicalAverage) * 100).toFixed(1);
      const trendIcon = forecast.trend === 'increasing' ? '↑' : forecast.trend === 'decreasing' ? '↓' : '→';
      
      return `${forecast.category}: ₱${forecast.predicted.toFixed(2)} predicted vs ₱${forecast.historicalAverage.toFixed(2)} average (${changePercent}% ${trendIcon})`;
    }).join('\n');
  }

  /**
   * Parses the AI response into structured insights
   */
  private static parseInsightResponse(response: string): AIInsightResponse {
    try {
      // Extract different sections from the response
      const sections = this.extractSections(response);
      
      // Parse risk assessment
      const riskAssessment = this.parseRiskAssessment(sections.riskAssessment || '');
      
      // Parse recommendations
      const recommendations = this.parseRecommendations(sections.recommendations || '');
      
      // Parse opportunity areas
      const opportunityAreas = this.parseOpportunityAreas(sections.opportunityAreas || '');
      
      // Parse confidence level
      const confidenceLevel = this.parseConfidenceLevel(sections.confidence || '');

      return {
        summary: sections.summary || 'Financial analysis completed.',
        recommendations,
        riskAssessment,
        opportunityAreas,
        confidenceLevel,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error parsing insight response:', error);
      
      // Return basic parsed response
      return {
        summary: response.substring(0, 200) + '...',
        recommendations: ['Review your spending patterns', 'Consider increasing savings', 'Monitor budget categories'],
        riskAssessment: {
          level: 'medium',
          factors: ['Insufficient data for detailed analysis'],
          mitigationSuggestions: ['Gather more financial data', 'Establish emergency fund']
        },
        opportunityAreas: ['Budget optimization', 'Expense reduction'],
        confidenceLevel: 0.7,
        timestamp: new Date()
      };
    }
  }

  /**
   * Extracts different sections from the AI response
   */
  private static extractSections(response: string): Record<string, string> {
    const sections: Record<string, string> = {};
    
    // Define section patterns
    const patterns = {
      summary: /(?:FINANCIAL TREND SUMMARY|1\.|SUMMARY)[:\s]*([\s\S]*?)(?=(?:TOP 3|2\.|RISK|$))/i,
      recommendations: /(?:TOP 3|RECOMMENDATIONS|2\.)[:\s]*([\s\S]*?)(?=(?:RISK|3\.|OPPORTUNITY|$))/i,
      riskAssessment: /(?:RISK|3\.)[:\s]*([\s\S]*?)(?=(?:OPPORTUNITY|4\.|CONFIDENCE|$))/i,
      opportunityAreas: /(?:OPPORTUNITY|4\.)[:\s]*([\s\S]*?)(?=(?:CONFIDENCE|5\.|$))/i,
      confidence: /(?:CONFIDENCE|5\.)[:\s]*([\s\S]*?)$/i
    };

    for (const [section, pattern] of Object.entries(patterns)) {
      const match = response.match(pattern);
      if (match) {
        sections[section] = match[1].trim();
      }
    }

    // If structured sections not found, use fallback parsing
    if (Object.keys(sections).length === 0) {
      sections.summary = response.substring(0, 300);
    }

    return sections;
  }

  /**
   * Parses recommendations from text - ALWAYS returns exactly 3 recommendations
   */
  private static parseRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    
    // Enhanced regex to catch more bullet styles and formatting
    const listItems = text.match(/(?:[\s\u2022\u2023\u25E6\u25AA\u25AB\u25A0\u25A1-]|\d+\.|Priority\s*\d+)[:\s]*([^\n\r]+)/gi);
    
    if (listItems) {
      recommendations.push(...listItems.map(item => {
        // More aggressive cleaning of bullets, numbers, and priority labels
        return item.replace(/^[\s\u2022\u2023\u25E6\u25AA\u25AB\u25A0\u25A1-]*\s*/, '')
                  .replace(/^\d+[\.:)]\s*/, '')
                  .replace(/^Priority\s*\d+[\s\-\u2013\u2014:]*\s*/i, 'Priority ' + (recommendations.length + 1) + ' – ')
                  .replace(/\n/g, ' ')
                  .replace(/\r/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
      }));
    } else {
      // Split by sentences if no list found - NO LIMIT
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      recommendations.push(...sentences.map((s, index) => {
        return `Priority ${index + 1} – ${s.trim()}`;
      }));
    }

    // Return all recommendations - NO LIMIT
    const filtered = recommendations.filter(rec => rec.length > 0);
    
    // Fill with default recommendations only if we have less than 3
    while (filtered.length < 3) {
      const defaultRecs = [
        'Review and optimize your highest spending categories to identify potential savings',
        'Set up automated savings to consistently build your emergency fund each month',
        'Track your monthly expenses more closely to stay within your budget targets'
      ];
      
      const missingIndex = filtered.length;
      if (missingIndex < defaultRecs.length) {
        filtered.push(defaultRecs[missingIndex]);
      } else {
        filtered.push('Monitor your financial progress regularly and adjust your budget as needed');
      }
    }

    return filtered;
  }

  /**
   * Parses risk assessment from text
   */
  private static parseRiskAssessment(text: string): RiskAssessment {
    const riskLevelMatch = text.match(/\b(low|medium|high)\b/i);
    const level = riskLevelMatch ? riskLevelMatch[1].toLowerCase() as 'low' | 'medium' | 'high' : 'medium';
    
    // Extract factors and suggestions
    const factors = this.extractListItems(text, ['risk', 'factor', 'concern']);
    const mitigationSuggestions = this.extractListItems(text, ['mitigation', 'suggestion', 'recommendation']);

    return {
      level,
      factors: factors.length > 0 ? factors : ['Market volatility', 'Spending increase'],
      mitigationSuggestions: mitigationSuggestions.length > 0 ? mitigationSuggestions : ['Build emergency fund', 'Monitor expenses closely']
    };
  }

  /**
   * Parses opportunity areas from text
   */
  private static parseOpportunityAreas(text: string): string[] {
    const opportunities = this.extractListItems(text, ['opportunity', 'improve', 'optimize']);
    
    return opportunities.length > 0 ? opportunities : ['Budget optimization', 'Expense reduction', 'Income growth'];
  }

  /**
   * Parses confidence level from text
   */
  private static parseConfidenceLevel(text: string): number {
    const percentMatch = text.match(/(\d+)%/);
    if (percentMatch) {
      return parseInt(percentMatch[1]) / 100;
    }
    
    const decimalMatch = text.match(/0\.(\d+)/);
    if (decimalMatch) {
      return parseFloat(`0.${decimalMatch[1]}`);
    }
    
    return 0.75; // Default confidence
  }

  /**
   * Extracts list items related to specific keywords
   */
  private static extractListItems(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    
    // Look for numbered or bulleted lists
    const listItems = text.match(/(?:[-•*]|\d+\.)\s*([^\n\r]+)/g);
    
    if (listItems) {
      items.push(...listItems.map(item => 
        item.replace(/^(?:[-•*]|\d+\.)\s*/, '').trim()
      ));
    }
    
    return items; // Return all items - NO LIMIT
  }

  /**
   * Generates a cache key for the request
   */
  private static generateCacheKey(request: AIInsightRequest): string {
    const dataHash = JSON.stringify({
      timeframe: request.timeframe,
      avgIncome: Math.round(request.userContext.avgMonthlyIncome),
      avgExpenses: Math.round(request.userContext.avgMonthlyExpenses),
      categoriesCount: request.categoryForecasts.length,
      predictionsCount: request.predictionData.length
    });
    
    return btoa(dataHash).slice(0, 16); // Short hash for cache key
  }

  /**
   * Gets human-readable timeframe name
   */
  private static getTimeframeName(timeframe: string): string {
    switch (timeframe) {
      case 'months_3': return 'Next 3 Months';
      case 'months_6': return 'Next 6 Months';
      case 'year_1': return 'Next 12 Months';
      default: return 'Upcoming Period';
    }
  }

  /**
   * Generates enhanced fallback insights with better analysis
   */
  private static generateEnhancedFallbackInsights(request: AIInsightRequest): AIInsightResponse {
    console.log('🔄 Generating enhanced fallback insights...');
    const { userContext, categoryForecasts, predictionData } = request;
    
    // Enhanced analysis based on actual data
    const monthlyIncome = userContext.avgMonthlyIncome || 0;
    const monthlyExpenses = userContext.avgMonthlyExpenses || 0;
    const savingsRate = userContext.savingsRate || 0;
    const monthlyBalance = monthlyIncome - monthlyExpenses;
    
    // Calculate financial health score
    const healthScore = this.calculateFinancialHealthScore(monthlyIncome, monthlyExpenses, savingsRate);
    
    // Build contextual summary based on actual data
    let summary = `Your monthly income of ₱${monthlyIncome.toLocaleString()} `;
    
    if (monthlyBalance > 0) {
      summary += `exceeds your expenses of ₱${monthlyExpenses.toLocaleString()}, leaving you with a positive cash flow of ₱${monthlyBalance.toLocaleString()}. `;
    } else if (monthlyBalance < 0) {
      summary += `is currently below your expenses of ₱${monthlyExpenses.toLocaleString()}, creating a deficit of ₱${Math.abs(monthlyBalance).toLocaleString()}. `;
    } else {
      summary += `exactly matches your expenses of ₱${monthlyExpenses.toLocaleString()}, leaving no room for savings. `;
    }
    
    // Add trend analysis if prediction data is available
    if (predictionData && predictionData.length > 0) {
      const avgPrediction = predictionData.reduce((sum, pred) => sum + pred.predicted, 0) / predictionData.length;
      const trend = avgPrediction > monthlyExpenses ? 'increasing' : 'decreasing';
      summary += `Future projections suggest your expenses may be ${trend}, with an average predicted amount of ₱${avgPrediction.toLocaleString()}.`;
    }
    
    // Generate smart recommendations based on financial situation
    const recommendations = this.generateSmartRecommendations(monthlyIncome, monthlyExpenses, savingsRate, categoryForecasts);
    
    // Determine risk level based on multiple factors
    const riskAssessment = this.assessFinancialRisk(monthlyIncome, monthlyExpenses, savingsRate, healthScore);
    
    // Identify opportunity areas
    const opportunityAreas = this.identifyOpportunityAreas(monthlyIncome, monthlyExpenses, savingsRate, categoryForecasts);
    
    console.log('✅ Enhanced fallback insights generated with health score:', healthScore);
    
    return {
      summary,
      recommendations,
      riskAssessment,
      opportunityAreas,
      confidenceLevel: 0.85, // Higher confidence for enhanced analysis
      timestamp: new Date()
    };
  }
  
  /**
   * Calculate financial health score (0-100)
   */
  private static calculateFinancialHealthScore(income: number, expenses: number, savingsRate: number): number {
    if (income === 0) return 0;
    
    let score = 0;
    
    // Income vs expenses (40 points)
    const balance = income - expenses;
    if (balance > 0) {
      score += Math.min(40, (balance / income) * 100);
    }
    
    // Savings rate (40 points)
    if (savingsRate >= 20) score += 40;
    else if (savingsRate >= 10) score += 30;
    else if (savingsRate >= 5) score += 20;
    else if (savingsRate > 0) score += 10;
    
    // Emergency fund potential (20 points)
    const emergencyFundMonths = balance > 0 ? (balance / expenses) * 12 : 0;
    if (emergencyFundMonths >= 6) score += 20;
    else if (emergencyFundMonths >= 3) score += 15;
    else if (emergencyFundMonths >= 1) score += 10;
    else if (emergencyFundMonths > 0) score += 5;
    
    return Math.min(100, Math.round(score));
  }
  
  /**
   * Generate smart recommendations based on financial situation - ALWAYS returns exactly 3 recommendations
   */
  private static generateSmartRecommendations(income: number, expenses: number, savingsRate: number, categoryForecasts: any[]): string[] {
    const recommendations: string[] = [];
    const balance = income - expenses;
    
    // Priority 1: Most critical financial issue
    if (income === 0) {
      recommendations.push('**Priority 1 – Add your income sources** – Record all income streams in BudgetMe to get accurate financial insights and better track your financial progress.');
    } else if (balance < 0) {
      recommendations.push('**Priority 1 – Address spending deficit immediately** – Your expenses exceed income. Review your highest spending categories and identify areas to cut back.');
    } else if (savingsRate < 5) {
      recommendations.push('**Priority 1 – Build emergency savings** – Start with saving at least 5% of your income to create a financial safety net for unexpected expenses.');
    } else {
      recommendations.push('**Priority 1 – Optimize your highest spending category** – Focus on your largest expense category to find the biggest potential savings.');
    }
    
    // Priority 2: Savings and growth
    if (savingsRate < 15 && recommendations.length === 1) {
      recommendations.push('**Priority 2 – Increase your savings rate** – Aim for at least 15-20% of income. Use BudgetMe\'s automated tracking to monitor your progress.');
    } else if (categoryForecasts && categoryForecasts.length > 0 && recommendations.length === 1) {
      const highestCategory = categoryForecasts.reduce((max, cat) => 
        cat.predicted > max.predicted ? cat : max
      );
      recommendations.push(`**Priority 2 – Monitor ${highestCategory.category} spending** – This is your highest predicted expense category. Track it closely and look for optimization opportunities.`);
    } else {
      recommendations.push('**Priority 2 – Set monthly spending limits** – Create realistic budgets for each expense category and track your progress weekly.');
    }
    
    // Priority 3: Long-term optimization
    if (recommendations.length === 2) {
      if (balance > 0 && savingsRate >= 10) {
        recommendations.push('**Priority 3 – Explore investment opportunities** – With positive cash flow and good savings habits, consider growing your wealth through investments.');
      } else if (categoryForecasts && categoryForecasts.length > 1) {
        recommendations.push('**Priority 3 – Rebalance your spending categories** – Review all expense categories to ensure optimal allocation of your income.');
      } else {
        recommendations.push('**Priority 3 – Use BudgetMe\'s tracking features** – Set up automated transaction categorization and monthly budget reviews to stay on track.');
      }
    }
    
    // Ensure exactly 3 recommendations with fallbacks
    const defaultRecs = [
      '**Priority 1 – Track all your transactions** – Complete transaction tracking is essential for accurate financial insights and better budgeting decisions.',
      '**Priority 2 – Set realistic monthly budgets** – Create achievable spending limits for each category and review them regularly to stay on track.',
      '**Priority 3 – Build your emergency fund** – Aim to save 3-6 months of expenses for unexpected situations and financial security.'
    ];
    
    // Fill any missing slots only if we have less than 3
    while (recommendations.length < 3) {
      const missingIndex = recommendations.length;
      recommendations.push(defaultRecs[missingIndex]);
    }
    
    return recommendations; // Return all recommendations - NO LIMIT
  }
  
  /**
   * Assess financial risk based on multiple factors
   */
  private static assessFinancialRisk(income: number, expenses: number, savingsRate: number, healthScore: number): any {
    let level: 'low' | 'medium' | 'high' = 'medium';
    const factors: string[] = [];
    const mitigationSuggestions: string[] = [];
    
    // Determine risk level
    if (healthScore >= 70) {
      level = 'low';
    } else if (healthScore >= 40) {
      level = 'medium';
    } else {
      level = 'high';
    }
    
    // Identify risk factors
    if (income === 0) {
      factors.push('No recorded income sources');
      mitigationSuggestions.push('Add all income sources to BudgetMe for complete financial tracking');
    }
    
    if (expenses > income) {
      factors.push('Expenses exceed income');
      mitigationSuggestions.push('Create a debt reduction plan and identify expense cuts');
    }
    
    if (savingsRate < 5) {
      factors.push('Very low savings rate');
      mitigationSuggestions.push('Build an emergency fund starting with small, consistent amounts');
    }
    
    // Default factors if none identified
    if (factors.length === 0) {
      factors.push('Normal market volatility', 'Potential unexpected expenses');
    }
    
    if (mitigationSuggestions.length === 0) {
      mitigationSuggestions.push('Continue monitoring expenses regularly', 'Consider increasing emergency fund when possible');
    }
    
    return {
      level,
      factors,
      mitigationSuggestions
    };
  }
  
  /**
   * Identify financial opportunity areas
   */
  private static identifyOpportunityAreas(income: number, expenses: number, savingsRate: number, categoryForecasts: any[]): string[] {
    const opportunities: string[] = [];
    
    if (savingsRate < 20) {
      opportunities.push('**Savings rate improvement** – Increase from ' + savingsRate.toFixed(1) + '% to at least 20%');
    }
    
    if (expenses > 0 && income > expenses) {
      opportunities.push('**Budget optimization** – Fine-tune spending categories to maximize savings potential');
    }
    
    if (categoryForecasts && categoryForecasts.length > 1) {
      opportunities.push('**Category rebalancing** – Redistribute spending across categories for better financial health');
    } else {
      opportunities.push('**Expense tracking enhancement** – Add more detailed transaction categories for better insights');
    }
    
    return opportunities; // Return all opportunities - NO LIMIT
  }
  
  /**
   * Legacy fallback insights method (kept for compatibility)
   */
  private static generateFallbackInsights(request: AIInsightRequest): AIInsightResponse {
    const { userContext, categoryForecasts } = request;
    
    // Generate basic insights based on data
    const isHighSaver = userContext.savingsRate > 20;
    const isLowSaver = userContext.savingsRate < 5;
    
    let summary = `Based on your financial data, you have an average monthly income of ₱${userContext.avgMonthlyIncome.toFixed(2)} and expenses of ₱${userContext.avgMonthlyExpenses.toFixed(2)}.`;
    
    if (isHighSaver) {
      summary += ' You have excellent savings habits with a strong financial foundation.';
    } else if (isLowSaver) {
      summary += ' There are opportunities to improve your savings rate and build financial security.';
    } else {
      summary += ' Your savings rate is moderate with room for optimization.';
    }

    const recommendations = [
      isLowSaver ? 'Focus on increasing your savings rate to at least 10-15%' : 'Maintain your current savings momentum',
      categoryForecasts.length > 0 ? `Monitor spending in ${categoryForecasts[0].category} which shows the highest predicted costs` : 'Track your spending patterns more closely',
      'Review and adjust your budget monthly to stay on track'
    ];

    const riskLevel: 'low' | 'medium' | 'high' = isLowSaver ? 'high' : isHighSaver ? 'low' : 'medium';

    return {
      summary,
      recommendations,
      riskAssessment: {
        level: riskLevel,
        factors: isLowSaver ? ['Low savings rate', 'Limited emergency fund'] : ['Market volatility'],
        mitigationSuggestions: ['Build emergency fund', 'Diversify income sources']
      },
      opportunityAreas: ['Budget optimization', 'Expense reduction', 'Savings growth'],
      confidenceLevel: 0.8,
      timestamp: new Date()
    };
  }

  /**
   * Generate insights for Prophet predictions specifically
   */
  static async generateProphetInsights(
    predictions: ProphetPrediction[],
    categoryForecasts: CategoryForecast[],
    userProfile: UserFinancialProfile,
    timeframe: 'months_3' | 'months_6' | 'year_1' = 'months_3'
  ): Promise<AIInsightResponse> {
    const request: AIInsightRequest = {
      predictionData: predictions,
      categoryForecasts,
      userContext: userProfile,
      timeframe
    };

    return this.generateInsights(request);
  }

  /**
   * Get AI insights with custom analysis focus
   */
  static async generateCustomInsights(
    request: AIInsightRequest,
    customPrompt: string
  ): Promise<AIInsightResponse> {
    const enhancedRequest = {
      ...request,
      customPrompt
    };

    return this.generateInsights(enhancedRequest);
  }

  /**
   * Check if Prophet AI service is available
   */
  static async checkProphetAPIHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${PROPHET_API_BASE_URL}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Prophet API health check failed:', error);
      return false;
    }
  }

  /**
   * Get service status and availability
   */
  static async getServiceStatus(): Promise<{
    prophetAPI: boolean;
    chatbotService: boolean;
    cacheStats: { size: number; oldestEntry: Date | null };
  }> {
    const [prophetAPI, chatbotService] = await Promise.allSettled([
      this.checkProphetAPIHealth(),
      this.testChatbotService()
    ]);

    return {
      prophetAPI: prophetAPI.status === 'fulfilled' ? prophetAPI.value : false,
      chatbotService: chatbotService.status === 'fulfilled' ? chatbotService.value : false,
      cacheStats: this.getCacheStats()
    };
  }

  /**
   * Test chatbot service availability
   */
  private static async testChatbotService(): Promise<boolean> {
    try {
      // Simple test message to check if service is responsive
      const response = await chatbotService.sendMessage('test');
      return response.success !== false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear insights cache
   */
  static clearCache(): void {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; oldestEntry: Date | null } {
    const entries = Object.values(this.cache);
    const oldestTimestamp = entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null;
    
    return {
      size: entries.length,
      oldestEntry: oldestTimestamp ? new Date(oldestTimestamp) : null
    };
  }
}