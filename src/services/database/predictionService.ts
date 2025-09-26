import { supabase } from '../../utils/supabaseClient';
import { TransactionService } from './transactionService';
import { BudgetService } from './budgetService';
import { GoalService } from './goalService';
import axios from 'axios';

// FastAPI backend configuration
const PREDICTION_API_BASE_URL = process.env.REACT_APP_PREDICTION_API_URL || 'https://prediction-api-rust.vercel.app';

// Types for prediction service - UPDATED TO MATCH SQL SCHEMA
export interface FinancialDataPoint {
  date: Date;
  income: number;
  expenses: number;
  balance: number;
  category?: string;
}

export interface ProphetPrediction {
  date: Date;
  predicted: number;
  upper: number;
  lower: number;
  trend: number;
  seasonal: number;
  confidence: number;
}

export interface CategoryForecast {
  category: string;
  historicalAverage: number;
  predicted: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  forecast_data?: any[];
}

export interface PredictionContext {
  historicalData: FinancialDataPoint[];
  userProfile: UserFinancialProfile;
  categoryBreakdown: CategoryForecast[];
  seasonalPatterns: SeasonalPattern[];
}

export interface UserFinancialProfile {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  savingsRate: number;
  budgetCategories: string[];
  financialGoals: any[];
  spendingPatterns: SpendingPattern[];
  transactionCount: number;
}

export interface SpendingPattern {
  category: string;
  averageAmount: number;
  frequency: number;
  seasonality: number;
}

export interface SeasonalPattern {
  name: string;
  period: number;
  amplitude: number;
  phase: number;
}

export interface PredictionServiceConfig {
  userId: string;
  timeframe: 'months_3' | 'months_6' | 'year_1';
  includeConfidenceIntervals: boolean;
  seasonalityMode: 'additive' | 'multiplicative';
}

// UPDATED interfaces to match SQL schema structure
export interface TransactionData {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  description?: string;
}

export interface PredictionRequest {
  user_id: string;
  transaction_data: TransactionData[];
  timeframe: 'months_3' | 'months_6' | 'year_1';
  seasonality_mode: 'additive' | 'multiplicative';
  include_categories: boolean;
  include_insights: boolean;
}

export interface PredictionResponse {
  user_id: string;
  timeframe: string;
  generated_at: string;
  expires_at: string;
  predictions: ProphetPrediction[];
  category_forecasts: Record<string, CategoryForecast>;
  model_accuracy: {
    mae: number;
    mape: number;
    rmse: number;
    data_points: number;
  };
  confidence_score: number;
  user_profile: UserFinancialProfile;
  insights: AIInsight[];
  usage_count: number;
  max_usage: number;
  reset_date: string;
}

export interface AIInsight {
  title: string;
  description: string;
  category: string;
  confidence: number;
  recommendation?: string;
}

// UPDATED UsageStatus to match SQL schema
export interface UsageStatus {
  user_id: string;
  current_usage: number;
  max_usage: number;
  reset_date: string;
  exceeded: boolean;
  remaining: number;
  tier?: string;
  rate_limited?: boolean;
  rate_limit_remaining?: number;
  suspended?: boolean;
}

// NEW interfaces for SQL schema integration
export interface PredictionRequestLog {
  id: string;
  user_id: string;
  external_request_id?: string;
  api_endpoint: string;
  timeframe: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout' | 'rate_limited';
  input_data: any;
  response_data?: any;
  error_details?: any;
}

export interface ProphetPredictionResult {
  id: string;
  user_id: string;
  request_id: string;
  timeframe: string;
  predictions: any;
  category_forecasts: any;
  model_accuracy: any;
  confidence_score: number;
  user_profile: any;
  generated_at: string;
  expires_at: string;
}

export class PredictionService {
  /**
   * Generate Prophet-based financial predictions with SQL schema integration
   */
  static async generateProphetPredictions(
    userId: string,
    timeframe: 'months_3' | 'months_6' | 'year_1' = 'months_3'
  ): Promise<PredictionResponse> {
    let requestId: string | null = null;
    
    try {
      // Step 1: Check usage limits using SQL schema
      const usageCheck = await this.checkUsageLimitsFromDB(userId, 'prophet');
      if (!usageCheck.can_request) {
        throw new Error(`Usage limit exceeded. ${usageCheck.remaining} requests remaining until ${usageCheck.reset_date}`);
      }

      // Step 2: Check for cached predictions
      const cachedPrediction = await this.getCachedPredictionFromDB(userId, timeframe);
      if (cachedPrediction.found && cachedPrediction.data) {
        console.log('Returning cached prediction for user:', userId);
        return cachedPrediction.data;
      }

      // Step 3: Fetch user transaction data
      const transactions = await this.fetchUserTransactionData(userId);
      
      if (transactions.length < 3) {
        throw new Error('At least 3 transactions are required for predictions');
      }

      // Step 4: Log prediction request to database
      requestId = await this.logPredictionRequestToDB(
        userId,
        '/api/v1/predictions/generate',
        timeframe,
        { transaction_count: transactions.length, api_call: 'prophet' }
      );

      // Step 5: Prepare request payload for FastAPI
      const requestPayload: PredictionRequest = {
        user_id: userId,
        transaction_data: transactions.slice(0, 20), // Limit data size
        timeframe,
        seasonality_mode: 'additive',
        include_categories: true,
        include_insights: true
      };

      let response: PredictionResponse;

      try {
        // Step 6: Call FastAPI backend
        console.log('Calling FastAPI prediction service...');
        const apiResponse = await axios.post(
          `${PREDICTION_API_BASE_URL}/api/v1/predictions/generate`,
          requestPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await this.getAuthToken()}`
            },
            timeout: 45000 // 45 second timeout
          }
        );

        response = apiResponse.data;
        
        // Step 7: Update request status to completed
        if (requestId) {
          await this.updateRequestStatusInDB(
            requestId,
            'completed',
            response,
            null,
            Date.now() - parseInt(requestId.split('-')[0] || '0')
          );
        }

      } catch (apiError: any) {
        console.warn('FastAPI call failed, using fallback:', apiError.message);
        
        // Step 8: Update request status to failed and use fallback
        if (requestId) {
          await this.updateRequestStatusInDB(
            requestId,
            'failed',
            null,
            { error: apiError.message, fallback_used: true }
          );
        }
        
        // Fallback to local calculation
        response = this.generateFallbackPredictions(userId, timeframe, transactions);
      }

      // Step 9: Store prediction result in database
      const predictionId = await this.storeProphetPredictionToDB(
        userId,
        requestId || '',
        timeframe,
        response.predictions,
        response.category_forecasts || {},
        response.model_accuracy,
        response.confidence_score,
        response.user_profile
      );

      // Step 10: Cache results locally for quick access
      await this.cachePredictionResults(userId, response);

      // Step 11: Increment usage counter
      await this.incrementUsageInDB(userId, 'prophet');

      console.log(`Prediction generated and stored with ID: ${predictionId}`);
      return response;

    } catch (error: any) {
      console.error('Prediction generation error:', error);
      
      // Update request status to failed if we have a requestId
      if (requestId) {
        await this.updateRequestStatusInDB(
          requestId,
          'failed',
          null,
          { error: error.message }
        );
      }
      
      throw new Error(`Failed to generate predictions: ${error.message}`);
    }
  }

  /**
   * Generate fallback predictions using local statistical analysis
   */
  static generateFallbackPredictions(
    userId: string,
    timeframe: 'months_3' | 'months_6' | 'year_1',
    transactions: TransactionData[]
  ): PredictionResponse {
    const days = timeframe === 'months_3' ? 90 : timeframe === 'months_6' ? 180 : 365;
    
    // Calculate averages
    const expenses = transactions.filter(t => t.type === 'expense');
    const avgDailyExpense = expenses.length > 0 
      ? expenses.reduce((sum, t) => sum + t.amount, 0) / expenses.length
      : 100; // Default fallback
    
    // Generate predictions
    const predictions: ProphetPrediction[] = [];
    for (let i = 1; i <= days; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      
      // Add some variance
      const variance = avgDailyExpense * 0.2;
      const predicted = avgDailyExpense + (Math.random() - 0.5) * variance;
      
      predictions.push({
        date: futureDate,
        predicted: Math.max(0, predicted),
        upper: predicted * 1.2,
        lower: predicted * 0.8,
        trend: predicted,
        seasonal: 0,
        confidence: 0.7
      });
    }
    
    return {
      user_id: userId,
      timeframe,
      predictions,
      model_accuracy: {
        mape: 20.0,
        rmse: 150.0,
        mae: 120.0,
        data_points: transactions.length
      },
      confidence_score: 0.6,
      user_profile: {
        avgMonthlyIncome: 0,
        avgMonthlyExpenses: avgDailyExpense * 30,
        savingsRate: 0,
        budgetCategories: [],
        financialGoals: [],
        spendingPatterns: [],
        transactionCount: transactions.length
      },
      category_forecasts: {},
      insights: [
        {
          title: 'Fallback Analysis',
          description: 'Predictions generated using statistical fallback analysis',
          category: 'trend',
          confidence: 0.7
        }
      ],
      usage_count: 1,
      max_usage: 10,
      reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Check user's prediction usage status using SQL schema
   */
  static async checkUsageLimit(userId: string): Promise<UsageStatus> {
    try {
      const usageCheck = await this.checkUsageLimitsFromDB(userId, 'prophet');
      
      return {
        user_id: userId,
        current_usage: usageCheck.current_usage,
        max_usage: usageCheck.limit,
        reset_date: usageCheck.reset_date,
        exceeded: !usageCheck.can_request,
        remaining: usageCheck.remaining,
        tier: usageCheck.tier,
        rate_limited: usageCheck.rate_limited,
        rate_limit_remaining: usageCheck.rate_limit_remaining,
        suspended: usageCheck.suspended
      };
    } catch (error: any) {
      console.error('Error checking usage limit:', error);
      
      // Default to allowing usage if there's an error
      return {
        user_id: userId,
        current_usage: 0,
        max_usage: 5,
        reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        exceeded: false,
        remaining: 5
      };
    }
  }

  // =====================================================
  // SQL SCHEMA INTEGRATION METHODS
  // =====================================================

  /**
   * Check usage limits using the SQL schema functions
   */
  static async checkUsageLimitsFromDB(
    userId: string, 
    serviceType: 'prophet' | 'ai_insights' = 'prophet'
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('can_make_prediction_request', {
        p_user_id: userId,
        p_service_type: serviceType
      });

      if (error) {
        console.error('Error checking usage limits:', error);
        // Return permissive default
        return {
          can_request: true,
          current_usage: 0,
          limit: 10,
          remaining: 10,
          tier: 'free',
          rate_limited: false,
          reset_date: new Date().toISOString()
        };
      }

      return data;
    } catch (error) {
      console.error('Database error checking usage limits:', error);
      return {
        can_request: true,
        current_usage: 0,
        limit: 5,
        remaining: 5,
        tier: 'free',
        rate_limited: false,
        reset_date: new Date().toISOString()
      };
    }
  }

  /**
   * Increment usage counter after successful request
   */
  static async incrementUsageInDB(
    userId: string, 
    serviceType: 'prophet' | 'ai_insights' = 'prophet'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('increment_prediction_usage', {
        p_user_id: userId,
        p_service_type: serviceType
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      console.log(`Successfully incremented ${serviceType} usage for user:`, userId);
      return data === true;
    } catch (error) {
      console.error('Database error incrementing usage:', error);
      return false;
    }
  }

  /**
   * Log prediction request to database
   */
  static async logPredictionRequestToDB(
    userId: string,
    apiEndpoint: string,
    timeframe: string,
    inputData: any,
    externalRequestId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_prediction_request', {
        p_user_id: userId,
        p_api_endpoint: apiEndpoint,
        p_timeframe: timeframe,
        p_input_data: inputData,
        p_external_request_id: externalRequestId
      });

      if (error) {
        console.error('Error logging prediction request:', error);
        return `fallback-${Date.now()}`;
      }

      return data;
    } catch (error) {
      console.error('Database error logging request:', error);
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Update request status in database
   */
  static async updateRequestStatusInDB(
    requestId: string,
    status: string,
    responseData?: any,
    errorDetails?: any,
    apiResponseTimeMs?: number
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_request_status', {
        p_request_id: requestId,
        p_status: status,
        p_response_data: responseData,
        p_error_details: errorDetails,
        p_api_response_time_ms: apiResponseTimeMs
      });

      if (error) {
        console.error('Error updating request status:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Database error updating request status:', error);
      return false;
    }
  }

  /**
   * Store Prophet prediction result in database
   */
  static async storeProphetPredictionToDB(
    userId: string,
    requestId: string,
    timeframe: string,
    predictions: any,
    categoryForecasts: any,
    modelAccuracy: any,
    confidenceScore: number,
    userProfile: any
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('store_prophet_prediction', {
        p_user_id: userId,
        p_request_id: requestId,
        p_timeframe: timeframe,
        p_predictions: predictions,
        p_category_forecasts: categoryForecasts,
        p_model_accuracy: modelAccuracy,
        p_confidence_score: confidenceScore,
        p_user_profile: userProfile
      });

      if (error) {
        console.error('Error storing Prophet prediction:', error);
        return `fallback-${Date.now()}`;
      }

      return data;
    } catch (error) {
      console.error('Database error storing prediction:', error);
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Get cached prediction from database
   */
  static async getCachedPredictionFromDB(
    userId: string,
    timeframe: string
  ): Promise<{ found: boolean; data?: PredictionResponse }> {
    try {
      const { data, error } = await supabase.rpc('get_cached_prophet_prediction', {
        p_user_id: userId,
        p_timeframe: timeframe
      });

      if (error) {
        console.error('Error getting cached prediction:', error);
        return { found: false };
      }

      if (data && data.found) {
        // Convert cached data to PredictionResponse format
        const cachedResponse: PredictionResponse = {
          user_id: userId,
          timeframe: timeframe,
          generated_at: data.generated_at,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          predictions: Array.isArray(data.predictions) ? data.predictions.map((p: any) => ({
            date: new Date(p.date),
            predicted: p.predicted,
            upper: p.upper,
            lower: p.lower,
            trend: p.trend,
            seasonal: p.seasonal || 0,
            confidence: p.confidence
          })) : [],
          category_forecasts: data.category_forecasts || {},
          model_accuracy: data.model_accuracy || { mae: 0, mape: 0, rmse: 0, data_points: 0 },
          confidence_score: data.confidence_score || 0.75,
          user_profile: data.user_profile || {
            avgMonthlyIncome: 0,
            avgMonthlyExpenses: 0,
            savingsRate: 0,
            budgetCategories: [],
            financialGoals: [],
            spendingPatterns: [],
            transactionCount: 0
          },
          insights: [],
          usage_count: 0,
          max_usage: 10,
          reset_date: new Date().toISOString()
        };

        console.log('Retrieved cached prediction:', {
          id: data.id,
          generated_at: data.generated_at,
          predictions_count: cachedResponse.predictions.length
        });

        return { found: true, data: cachedResponse };
      }

      return { found: false };
    } catch (error) {
      console.error('Database error getting cached prediction:', error);
      return { found: false };
    }
  }

  /**
   * Fetch user transaction data and format for Prophet API
   */
  static async fetchUserTransactionData(userId: string): Promise<TransactionData[]> {
    try {
      // Get transaction data from the last 12 months for better predictions
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      // Query Supabase for user transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      if (!transactions || transactions.length === 0) {
        console.log('No transaction data found for user:', userId);
        return []; // Return empty array instead of throwing error
      }

      console.log(`Found ${transactions.length} transactions for user ${userId}:`, 
        transactions.map(t => ({
          date: t.date,
          amount: t.amount,
          type: t.type,
          category: t.category,
          description: t.description
        }))
      );

      // Format transactions for Prophet API
      const formattedTransactions = transactions.map(transaction => {
        // Use the database type field if available, otherwise infer from amount
        const transactionType = transaction.type || (Number(transaction.amount) >= 0 ? 'income' : 'expense');
        const amount = Math.abs(Number(transaction.amount));
        
        return {
          date: new Date(transaction.date).toISOString(),
          amount,
          type: transactionType,
          category: transaction.category || 'Other',
          description: transaction.description || ''
        };
      });
      
      console.log(`Formatted ${formattedTransactions.length} transactions for Prophet API:`, 
        formattedTransactions.map(t => ({
          date: t.date.substring(0, 10), // Just show date part
          amount: t.amount,
          type: t.type,
          category: t.category
        }))
      );
      
      const expenseCount = formattedTransactions.filter(t => t.type === 'expense').length;
      const incomeCount = formattedTransactions.filter(t => t.type === 'income').length;
      console.log(`Transaction breakdown: ${expenseCount} expenses, ${incomeCount} income`);
      
      return formattedTransactions;
    } catch (error: any) {
      console.error('Error fetching transaction data:', error);
      throw error;
    }
  }

  /**
   * Get authentication token from Supabase session
   */
  static async getAuthToken(): Promise<string> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new Error(`Authentication error: ${error.message}`);
      }
      
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in.');
      }
      
      return session.access_token;
    } catch (error: any) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }

  /**
   * Cache prediction results locally (optional optimization)
   */
  static async cachePredictionResults(userId: string, result: PredictionResponse): Promise<void> {
    try {
      // Store in localStorage with expiration
      const cacheKey = `prediction_cache_${userId}_${result.timeframe}`;
      const cacheData = {
        data: result,
        timestamp: Date.now(),
        expires: new Date(result.expires_at).getTime()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching prediction results:', error);
      // Don't throw error for caching failures
    }
  }

  /**
   * Get cached prediction results if available and not expired
   */
  static getCachedPredictions(userId: string, timeframe: string): PredictionResponse | null {
    try {
      const cacheKey = `prediction_cache_${userId}_${timeframe}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }
      
      const parsed = JSON.parse(cachedData);
      
      // Check if cache is expired
      if (Date.now() > parsed.expires) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed.data;
    } catch (error) {
      console.error('Error getting cached predictions:', error);
      return null;
    }
  }

  /**
   * Validate prediction data before sending to API
   */
  static async validatePredictionData(
    userId: string,
    transactions: TransactionData[]
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const authToken = await this.getAuthToken();
      
      const requestPayload: PredictionRequest = {
        user_id: userId,
        transaction_data: transactions,
        timeframe: 'months_3',
        seasonality_mode: 'additive',
        include_categories: false,
        include_insights: false
      };
      
      const response = await axios.post(
        `${PREDICTION_API_BASE_URL}/api/v1/predictions/validate`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error validating prediction data:', error);
      return {
        valid: false,
        errors: [error.message],
        warnings: []
      };
    }
  }
  /**
   * Legacy method - now uses Prophet backend
   * Fetches comprehensive financial data for a user from Supabase
   */
  static async fetchUserFinancialData(
    userId: string, 
    monthsBack: number = 24
  ): Promise<FinancialDataPoint[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      // Use the new FastAPI-compatible method
      const transactions = await this.fetchUserTransactionData(userId);
      
      // Handle empty transactions gracefully
      if (transactions.length === 0) {
        console.log('No transactions found for user, returning empty financial data:', userId);
        return [];
      }
      
      // Convert to legacy format
      const monthlyData = new Map<string, { income: number; expenses: number; date: Date }>();

      transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            income: 0,
            expenses: 0,
            date: new Date(date.getFullYear(), date.getMonth(), 1)
          });
        }

        const monthData = monthlyData.get(monthKey)!;
        
        if (transaction.type === 'income') {
          monthData.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          monthData.expenses += transaction.amount;
        }
      });

      // Convert to FinancialDataPoint array
      const financialData: FinancialDataPoint[] = Array.from(monthlyData.values())
        .map(data => ({
          date: data.date,
          income: data.income,
          expenses: data.expenses,
          balance: data.income - data.expenses
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return financialData;
    } catch (error) {
      console.error('Error fetching user financial data:', error);
      throw new Error('Failed to fetch financial data');
    }
  }

  /**
   * Enhanced method - generates category forecasts using Prophet
   */
  static async generateCategoryForecasts(userId: string): Promise<CategoryForecast[]> {
    try {
      // Use Prophet predictions to get category forecasts
      const prophetResults = await this.generateProphetPredictions(userId, 'months_3');
      
      // Convert Prophet category forecasts to legacy format
      const categoryForecasts: CategoryForecast[] = Object.entries(prophetResults.category_forecasts)
        .map(([category, forecast]) => ({
          category,
          historicalAverage: (forecast as any).historical_average || forecast.historicalAverage,
          predicted: (forecast as any).predicted_average || forecast.predicted,
          confidence: forecast.confidence,
          trend: forecast.trend,
          forecast_data: (forecast as any).forecast_data
        }))
        .sort((a, b) => b.predicted - a.predicted);

      return categoryForecasts;
    } catch (error) {
      console.error('Error generating category forecasts:', error);
      
      // Fallback to mock data if Prophet fails
      return this.generateFallbackCategoryForecasts(userId);
    }
  }

  /**
   * Fallback method for category forecasts when Prophet is unavailable
   */
  private static async generateFallbackCategoryForecasts(userId: string): Promise<CategoryForecast[]> {
    try {
      const transactions = await this.fetchUserTransactionData(userId);
      const categoryData = new Map<string, { total: number; count: number }>();

      // Only process expense transactions for category analysis
      transactions
        .filter(t => t.type === 'expense')
        .forEach(transaction => {
          const category = transaction.category || 'Other';
          
          if (!categoryData.has(category)) {
            categoryData.set(category, { total: 0, count: 0 });
          }

          const data = categoryData.get(category)!;
          data.total += transaction.amount;
          data.count += 1;
        });

      // Convert to forecasts with simple trend analysis
      const forecasts: CategoryForecast[] = Array.from(categoryData.entries()).map(([category, data]) => {
        const historicalAverage = data.total / 3; // Assume 3 months of data
        
        // Simple trend calculation (could be enhanced with Prophet)
        const growthRate = Math.random() * 0.1 - 0.05; // -5% to +5% random growth
        const predicted = historicalAverage * (1 + growthRate);
        
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (growthRate > 0.02) trend = 'increasing';
        else if (growthRate < -0.02) trend = 'decreasing';

        return {
          category,
          historicalAverage,
          predicted,
          confidence: Math.max(0.6, 1 - (data.count < 5 ? 0.3 : 0)),
          trend
        };
      });

      return forecasts.sort((a, b) => b.predicted - a.predicted);
    } catch (error) {
      console.error('Error generating fallback category forecasts:', error);
      return [];
    }
  }

  /**
   * Builds user financial profile for context - Enhanced with Prophet integration
   */
  static async buildUserFinancialProfile(userId: string): Promise<UserFinancialProfile> {
    try {
      // Try to get profile from Prophet predictions first
      try {
        const prophetResults = await this.generateProphetPredictions(userId, 'months_3');
        return prophetResults.user_profile;
      } catch (prophetError) {
        console.warn('Prophet profile generation failed, using fallback:', prophetError);
      }

      // Fallback to manual calculation
      const financialData = await this.fetchUserFinancialData(userId, 6);
      const transactions = await this.fetchUserTransactionData(userId);
      
      // Get active budgets
      // const budgets = await BudgetService.getActiveBudgets(userId);
      const budgets: any[] = []; // Placeholder until service is implemented
      
      // Get financial goals
      // const goals = await GoalService.getUserGoals(userId);
      const goals: any[] = []; // Placeholder until service is implemented

      // Calculate averages
      const avgMonthlyIncome = financialData.length > 0 
        ? financialData.reduce((sum, data) => sum + data.income, 0) / financialData.length
        : 0;

      const avgMonthlyExpenses = financialData.length > 0
        ? financialData.reduce((sum, data) => sum + data.expenses, 0) / financialData.length
        : 0;

      const savingsRate = avgMonthlyIncome > 0 
        ? ((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome)
        : 0;

      // Extract budget categories
      const budgetCategories = budgets.map(budget => budget.category?.categoryName || 'Unknown');
      
      // Get spending categories from transactions
      const spendingCategories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean) as string[]));

      // Generate spending patterns (simplified)
      const spendingPatterns: SpendingPattern[] = spendingCategories.map(category => {
        const categoryTransactions = transactions.filter(t => t.category === category && t.type === 'expense');
        const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        const averageAmount = categoryTransactions.length > 0 ? totalAmount / categoryTransactions.length : 0;
        
        return {
          category,
          averageAmount,
          frequency: categoryTransactions.length, // Number of transactions
          seasonality: 1 // No seasonality assumed
        };
      });

      return {
        avgMonthlyIncome,
        avgMonthlyExpenses,
        savingsRate,
        budgetCategories: [...budgetCategories, ...spendingCategories],
        financialGoals: goals,
        spendingPatterns,
        transactionCount: transactions.length
      };
    } catch (error) {
      console.error('Error building user financial profile:', error);
      
      // Return default profile on error
      return {
        avgMonthlyIncome: 0,
        avgMonthlyExpenses: 0,
        savingsRate: 0,
        budgetCategories: [],
        financialGoals: [],
        spendingPatterns: [],
        transactionCount: 0
      };
    }
  }

  /**
   * Detects seasonal patterns in financial data
   */
  static detectSeasonalPatterns(data: FinancialDataPoint[]): SeasonalPattern[] {
    if (data.length < 12) {
      return []; // Not enough data for seasonal analysis
    }

    const patterns: SeasonalPattern[] = [];

    // Analyze monthly patterns
    const monthlyAverages = new Map<number, number>();
    data.forEach(point => {
      const month = point.date.getMonth();
      if (!monthlyAverages.has(month)) {
        monthlyAverages.set(month, 0);
      }
      monthlyAverages.set(month, monthlyAverages.get(month)! + point.expenses);
    });

    // Calculate overall average
    const overallAverage = data.reduce((sum, point) => sum + point.expenses, 0) / data.length;

    // Find significant deviations (simplified seasonality detection)
    monthlyAverages.forEach((total, month) => {
      const monthCount = data.filter(point => point.date.getMonth() === month).length;
      const monthAverage = total / monthCount;
      const deviation = (monthAverage - overallAverage) / overallAverage;

      if (Math.abs(deviation) > 0.15) { // 15% deviation threshold
        patterns.push({
          name: `Month ${month + 1} Pattern`,
          period: 12, // Annual pattern
          amplitude: Math.abs(deviation),
          phase: month
        });
      }
    });

    return patterns;
  }

  /**
   * Main method to get prediction context for AI insights
   */
  static async buildPredictionContext(userId: string): Promise<PredictionContext> {
    try {
      const [historicalData, userProfile, categoryBreakdown] = await Promise.all([
        this.fetchUserFinancialData(userId),
        this.buildUserFinancialProfile(userId),
        this.generateCategoryForecasts(userId)
      ]);

      const seasonalPatterns = this.detectSeasonalPatterns(historicalData);

      return {
        historicalData,
        userProfile,
        categoryBreakdown,
        seasonalPatterns
      };
    } catch (error) {
      console.error('Error building prediction context:', error);
      throw new Error('Failed to build prediction context');
    }
  }

  /**
   * Subscribe to real-time updates for prediction data
   */
  static subscribeToRealtimeUpdates(
    userId: string, 
    callback: (update: any) => void
  ): () => void {
    const subscriptions: any[] = [];

    // Subscribe to transaction changes
    const transactionSub = supabase
      .channel('prediction-transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();

    // Subscribe to budget changes
    const budgetSub = supabase
      .channel('prediction-budgets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();

    // Subscribe to goal changes
    const goalSub = supabase
      .channel('prediction-goals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();

    subscriptions.push(transactionSub, budgetSub, goalSub);

    // Return cleanup function
    return () => {
      subscriptions.forEach(sub => {
        if (sub) {
          supabase.removeChannel(sub);
        }
      });
    };
  }

  /**
   * Cache prediction data to reduce API calls
   */
  private static predictionCache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async getCachedPredictionData(
    userId: string,
    fetchFunction: () => Promise<any>
  ): Promise<any> {
    const cacheKey = `predictions_${userId}`;
    const cached = this.predictionCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    const data = await fetchFunction();
    this.predictionCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }

  /**
   * Clear cache for a user (useful after data updates)
   */
  static clearCache(userId: string): void {
    const cacheKey = `predictions_${userId}`;
    this.predictionCache.delete(cacheKey);
  }
}