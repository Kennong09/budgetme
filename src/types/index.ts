// User related types
export interface User {
  id: string | number;
  name?: string;
  email: string;
  username?: string;
  created_at: string;
  last_login?: string;
  password_hash?: string;
  user_role?: string;
  is_active?: boolean;
}

// Transaction related types
export interface Transaction {
  id: string | number;
  date: string;
  amount: number;
  notes: string;
  type: "income" | "expense" | "transfer" | "contribution";
  category_id?: number | string;
  category?: string;
  description?: string;
  account_id: number | string;
  goal_id?: string | number | null;
  created_at: string;
  user_id?: string | number;
}

// Budget related types
export interface Budget {
  id: string | number;
  category_id: number;
  category?: string;
  name?: string;
  amount: number;
  spent: number;
  period: "month" | "quarter" | "year";
  start_date: string;
  end_date: string;
  user_id: string | number;
  budget?: number;
  remaining?: number;
  percentage?: number;
  status?: "danger" | "warning" | "success" | string;
}

// Goal related types
export interface Goal {
  id: string | number;
  goal_name: string;
  name?: string;
  target_amount: number;
  targetAmount?: number;
  current_amount: number;
  currentAmount?: number;
  target_date: string;
  deadline?: string;
  priority: "high" | "medium" | "low" | string;
  category?: string;
  description?: string;
  status?: string;
  created_at?: string;
  user_id?: string | number;
  family_id?: string | number;
  percentage?: number;
  remaining?: number;
  is_family_goal?: boolean;
  shared_by?: string | number;
  shared_by_name?: string;
  is_overdue?: boolean;
}

// Account related types
export interface Account {
  id?: number; // Optional for new accounts, required for existing ones
  account_name: string;
  account_type: string;
  balance: number;
  user_id: string | number;
  created_at?: string;
  status?: string;
  color?: string; // Color field for UI customization
  is_default?: boolean;
}

// Category related types
export interface Category {
  id: number;
  category_name: string;
}

// Family related types
export interface Family {
  id: string | number;
  family_name: string;
  created_at: string;
  created_by_user_id: string;
  owner_user_id?: number;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "pending" | "inactive" | "removed";
  joined_at: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Enhanced Prediction types for AI integration
export interface Prediction {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  confidence: number;
}

// Prophet Algorithm Types
export interface ProphetPrediction {
  date: Date;
  predicted: number;
  upper: number;
  lower: number;
  trend: number;
  seasonal: number;
  confidence: number;
}

export interface ProphetParameters {
  changePointPriorScale: number;
  seasonalityPriorScale: number;
  holidaysPriorScale: number;
  seasonalityMode: 'additive' | 'multiplicative';
  mcmcSamples: number;
}

export interface SeasonalComponent {
  name: string;
  period: number;
  fourierOrder: number;
  priorScale: number;
}

// Financial Data Types
export interface FinancialDataPoint {
  date: Date;
  income: number;
  expenses: number;
  balance: number;
  category?: string;
}

export interface CategoryForecast {
  category: string;
  historicalAverage: number;
  predicted: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
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

// User Financial Profile
export interface UserFinancialProfile {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  savingsRate: number;
  budgetCategories: string[];
  financialGoals: Goal[];
  spendingPatterns: SpendingPattern[];
}

// AI Insights Types
export interface AIInsightRequest {
  predictionData: ProphetPrediction[];
  categoryForecasts: CategoryForecast[];
  userContext: UserFinancialProfile;
  timeframe: 'months_3' | 'months_6' | 'year_1';
  customPrompt?: string;
}

export interface AIInsightResponse {
  summary: string;
  recommendations: string[];
  riskAssessment: RiskAssessment;
  opportunityAreas: string[];
  confidenceLevel: number;
  timestamp: Date;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  mitigationSuggestions: string[];
}

// Prediction Context
export interface PredictionContext {
  historicalData: FinancialDataPoint[];
  userProfile: UserFinancialProfile;
  categoryBreakdown: CategoryForecast[];
  seasonalPatterns: SeasonalPattern[];
}

// Service Configuration
export interface PredictionServiceConfig {
  userId: string;
  timeframe: 'months_3' | 'months_6' | 'year_1';
  includeConfidenceIntervals: boolean;
  seasonalityMode: 'additive' | 'multiplicative';
}

// Cache Types
export interface PredictionCache {
  data: any;
  timestamp: number;
  userId: string;
}

// Real-time Update Types
export interface RealtimeUpdateCallback {
  (update: DatabaseUpdate): void;
}

export interface DatabaseUpdate {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  old: Record<string, any> | null;
  new: Record<string, any> | null;
  timestamp: Date;
}

// Component props types
export interface HeaderProps {
  // No props needed after sidebar removal
}

export interface UserData {
  user: {
    id: string | number;
    name?: string;
    username?: string;
    email: string;
    password_hash?: string;
    created_at?: string;
    last_login?: string;
    user_role?: string;
    is_active?: boolean;
  };
  accounts?: any[];
  transactions?: Transaction[];
  budgets?: Budget[];
  goals?: Goal[];
  categories?: Category[];
  expenseCategories?: any[];
}

export interface BudgetItem {
  id: string | number;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: string;
}

export interface RouteParams {
  [key: string]: string | undefined;
}

export interface ExtendedTransaction extends Transaction {
  // No need to redefine account_id since Transaction now has it as string | number
}

// Prophet Algorithm Implementation Types
export interface TrendComponent {
  slope: number;
  intercept: number;
  changePoints: Date[];
  changePointWeights: number[];
}

export interface ForecastAccuracy {
  mape: number; // Mean Absolute Percentage Error
  mae: number;  // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  r2Score: number; // R-squared
  coverageRate: number; // Confidence interval coverage
}

export interface ModelMetrics {
  accuracy: ForecastAccuracy;
  lastUpdated: Date;
  trainingDataPoints: number;
  predictionHorizon: number;
}

// Error Handling Types
export interface PredictionError {
  code: string;
  message: string;
  context: Record<string, any>;
  recoverable: boolean;
  timestamp: Date;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  apiResponseTime: number;
  predictionGenerationTime: number;
  cacheHitRate: number;
  errorRate: number;
}

// Add other types here as needed

// Types for goal contribution results
export interface GoalContributionResult {
  success: boolean;
  error?: string;
  transaction?: Transaction;
  updatedGoal?: Goal;
  updatedAccount?: Account;
}

// Types for goal summary
export interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  totalRemainingAmount: number;
  overallProgress: number;
  goalsByPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

// Types for budget-goal relationship
export interface BudgetGoalRelationship {
  totalBudgetAllocated: number;
  totalSpentOnGoals: number;
  percentageBudgetToGoals: number;
  goalTransactionsCount: number;
}

// Extended types for enhanced predictions
export interface EnhancedPredictionData {
  historical: FinancialDataPoint[];
  predictions: ProphetPrediction[];
  categoryForecasts: CategoryForecast[];
  aiInsights: AIInsightResponse;
  modelMetrics: ModelMetrics;
  lastUpdated: Date;
}

export interface PredictionComponentState {
  loading: boolean;
  error: PredictionError | null;
  data: EnhancedPredictionData | null;
  cacheStatus: 'hit' | 'miss' | 'expired';
}