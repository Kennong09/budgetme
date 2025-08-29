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

// Configuration for Prophet API
const PROPHET_API_BASE_URL = process.env.REACT_APP_PROPHET_API_URL || 'https://prediction-7816fzm49-kcprsnlcc-personal-projects.vercel.app';

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

export class AIInsightsService {
  private static cache: InsightCache = {};
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Generates AI insights using Prophet API with OpenRouter AI (openai/gpt-oss-20b:free)
   */
  static async generateInsights(request: AIInsightRequest): Promise<AIInsightResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache[cacheKey];
      
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        return cached.response;
      }

      // Try the new dedicated AI insights endpoint
      try {
        const interactiveInsights = await this.generateInteractiveAIInsights(request);
        if (interactiveInsights) {
          // Cache the result
          this.cache[cacheKey] = {
            response: interactiveInsights,
            timestamp: Date.now()
          };
          return interactiveInsights;
        }
      } catch (apiError) {
        console.warn('Interactive AI insights API failed, trying Prophet API:', apiError);
      }

      // Try Prophet API (existing implementation)
      try {
        const prophetInsights = await this.generateProphetAIInsights(request);
        if (prophetInsights) {
          // Cache the result
          this.cache[cacheKey] = {
            response: prophetInsights,
            timestamp: Date.now()
          };
          return prophetInsights;
        }
      } catch (prophetError) {
        console.warn('Prophet AI insights failed, falling back to chatbot service:', prophetError);
      }

      // Fallback to existing chatbot service
      const prompt = this.buildFinancialAnalysisPrompt(request);
      const response = await chatbotService.sendMessage(prompt);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get AI insights');
      }

      // Parse and validate the response
      const insights = this.parseInsightResponse(response.message || '');
      
      // Cache the result
      this.cache[cacheKey] = {
        response: insights,
        timestamp: Date.now()
      };

      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      
      // Check if this is a rate limiting error
      if (error instanceof Error && error.message.startsWith('RATE_LIMIT:')) {
        const rateLimitMessage = error.message.replace('RATE_LIMIT: ', '');
        throw new Error(`Rate limit exceeded: ${rateLimitMessage}`);
      }
      
      // Return fallback insights for other errors
      return this.generateFallbackInsights(request);
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
      
      // Create comprehensive insights from the API response
      const recommendations = insightsData
        .filter((insight: any) => insight.recommendation)
        .map((insight: any) => insight.recommendation)
        .slice(0, 5); // Top 5 recommendations

      const riskFactors = insightsData
        .filter((insight: any) => insight.category === 'risk')
        .map((insight: any) => insight.description)
        .slice(0, 3);

      const opportunities = insightsData
        .filter((insight: any) => insight.category === 'opportunity')
        .map((insight: any) => insight.description)
        .slice(0, 3);

      const mitigationSuggestions = insightsData
        .filter((insight: any) => insight.category === 'risk')
        .map((insight: any) => insight.recommendation)
        .filter((rec: string) => rec)
        .slice(0, 3);

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
   * Builds a comprehensive prompt for financial analysis
   */
  private static buildFinancialAnalysisPrompt(request: AIInsightRequest): string {
    const { predictionData, categoryForecasts, userContext, timeframe } = request;
    
    const timeframeName = this.getTimeframeName(timeframe);
    
    return `As a financial advisor AI, analyze the following financial predictions and provide actionable insights.

USER FINANCIAL PROFILE:
- Average Monthly Income: ₱${userContext.avgMonthlyIncome.toFixed(2)}
- Average Monthly Expenses: ₱${userContext.avgMonthlyExpenses.toFixed(2)}
- Current Savings Rate: ${userContext.savingsRate.toFixed(1)}%
- Active Budget Categories: ${userContext.budgetCategories.join(', ')}
- Financial Goals: ${userContext.financialGoals.length} active goals

FINANCIAL PREDICTIONS (${timeframeName}):
${this.formatPredictionData(predictionData)}

CATEGORY SPENDING FORECASTS:
${this.formatCategoryForecasts(categoryForecasts)}

Please provide a comprehensive financial analysis that includes:

1. FINANCIAL TREND SUMMARY (2-3 sentences):
   - Key trends in income, expenses, and savings
   - Overall financial trajectory

2. TOP 3 ACTIONABLE RECOMMENDATIONS:
   - Specific, practical steps the user can take
   - Focus on highest impact areas

3. RISK ASSESSMENT:
   - Identify potential financial risks (low/medium/high)
   - Specific risk factors and warning signs

4. OPPORTUNITY AREAS:
   - 2-3 areas where the user could improve their financial position
   - Potential for increased savings or income

5. CONFIDENCE ASSESSMENT:
   - Rate your confidence in these predictions (1-100%)
   - Factors that could affect accuracy

Format your response as natural, conversational advice. Be encouraging and specific. Focus on actionable insights rather than general advice. Keep the tone supportive and professional.`;
  }

  /**
   * Formats prediction data for the AI prompt
   */
  private static formatPredictionData(predictions: ProphetPrediction[]): string {
    if (predictions.length === 0) return 'No prediction data available';

    // Always format as PHP now
    const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;
    
    return predictions.slice(0, 6).map((pred, index) => {
      const monthName = new Date(pred.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `${monthName}: Predicted ${formatCurrency(pred.predicted)} (Range: ${formatCurrency(pred.lower)} - ${formatCurrency(pred.upper)}, Confidence: ${(pred.confidence * 100).toFixed(0)}%)`;
    }).join('\n');
  }

  /**
   * Formats category forecast data for the AI prompt
   */
  private static formatCategoryForecasts(forecasts: CategoryForecast[]): string {
    if (forecasts.length === 0) return 'No category forecasts available';

    return forecasts.slice(0, 8).map(forecast => {
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
   * Parses recommendations from text
   */
  private static parseRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    
    // Look for numbered or bulleted lists
    const listItems = text.match(/(?:[-•*]|\d+\.)\s*([^\n\r]+)/g);
    
    if (listItems) {
      recommendations.push(...listItems.map(item => 
        item.replace(/^(?:[-•*]|\d+\.)\s*/, '').trim()
      ));
    } else {
      // Split by sentences if no list found
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      recommendations.push(...sentences.slice(0, 3).map(s => s.trim()));
    }

    return recommendations.slice(0, 3);
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
    
    return items.slice(0, 3);
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
   * Generates fallback insights when AI service fails
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