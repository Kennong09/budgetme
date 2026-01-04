import { UsageStatus } from '../../../services/database/predictionService';

export interface PredictionDataPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  incomePrediction?: number;
  expensesPrediction?: number;
  savingsPrediction?: number;
  incomeUpper?: number;
  incomeLower?: number;
  expensesUpper?: number;
  expensesLower?: number;
}

export interface CategoryPrediction {
  category: string;
  current: number;
  predicted: number;
  change: number;
  changePercent: number;
  isEmptyState?: boolean;
}

export interface TransactionTypePrediction {
  type: 'Income' | 'Expense' | 'Savings' | 'Total';
  current: number;
  predicted: number;
  change: number;
  changePercent: number;
  isEmptyState?: boolean;
  lowConfidence?: boolean; // Indicates if prediction was capped due to unrealistic growth
}

export interface ModelAccuracy {
  metric: string;
  value: number;
  description: string;
}

export interface ModelDetail {
  name: string;
  value: string;
  description: string;
}

export type TimeframeType = "3months" | "6months" | "1year";

export type DataType = "all" | "income" | "expenses" | "savings";

export interface TooltipPosition {
  top: number;
  left: number;
}

export interface PredictionInsights {
  incomeGrowth: number;
  expenseGrowth: number;
  savingsGrowth: number;
  confidenceScore?: number; // Overall prediction confidence (0-100)
}

// Additional prediction types
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  mitigationSuggestions: string[];
}

export interface AIInsightResponse {
  summary: string;
  recommendations: string[];
  riskAssessment: RiskAssessment;
  opportunityAreas: string[];
  confidenceLevel: number;
  timestamp: Date;
}

export interface PredictionError {
  code: string;
  message: string;
  details?: any;
  context?: any;
  recoverable?: boolean;
  timestamp?: Date;
}

export interface EnhancedPredictionData {
  predictions: PredictionDataPoint[];
  accuracy: ModelAccuracy[];
  insights: PredictionInsights;
}

export interface FinancialDataPoint {
  date: string;
  value: number;
  category?: string;
}

export interface ProphetPrediction {
  ds: string; // date
  yhat: number; // predicted value
  yhat_lower: number; // lower bound
  yhat_upper: number; // upper bound
}

export interface SeasonalPattern {
  period: string;
  amplitude: number;
  phase: number;
}

export interface TrendComponent {
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  changepoints: string[];
}

export interface ProphetParameters {
  seasonality_mode: 'additive' | 'multiplicative';
  growth: 'linear' | 'logistic';
  n_changepoints: number;
  changepoint_prior_scale: number;
}

// Component Props Interfaces
export interface PredictionHeaderProps {
  showModelDetails: boolean;
  onToggleModelDetails: () => void;
  onExportCSV?: () => void; // DEPRECATED - use onExportPredictions instead
  onExportPredictions?: (format: 'csv' | 'json') => void;
  onViewHistory?: () => void;
  onExportInsights?: (format: 'csv' | 'json') => void;
  usageStatus?: UsageStatus | null;
  onGeneratePredictions?: () => Promise<void>;
  generating?: boolean;
  hasProphetData?: boolean;
}

export interface ModelDetailsCardProps {
  showModelDetails: boolean;
  modelDetails: ModelDetail[];
  modelAccuracy: ModelAccuracy[];
  activeTip: string | null;
  tooltipPosition: TooltipPosition | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  onClose: () => void;
}

export interface PredictionAboutCardProps {
  showAccuracyReport: boolean;
  modelAccuracy: ModelAccuracy[];
  activeTip: string | null;
  tooltipPosition: TooltipPosition | null;
  onToggleAccuracyReport: () => void;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

export interface PredictionSummaryCardsProps {
  insights: PredictionInsights;
  activeTip: string | null;
  tooltipPosition: TooltipPosition | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

export interface PredictionChartProps {
  timeframe: TimeframeType;
  dataType: DataType;
  data: Record<TimeframeType, PredictionDataPoint[]>;
  modelAccuracy: ModelAccuracy[];
  activeTip: string | null;
  tooltipPosition: TooltipPosition | null;
  onTimeframeChange: (timeframe: TimeframeType) => void;
  onDataTypeChange: (dataType: DataType) => void;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

export interface CategoryPredictionsTableProps {
  categoryPredictions: CategoryPrediction[];
  activeTip: string | null;
  tooltipPosition: TooltipPosition | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

export interface TransactionTypeForecastTableProps {
  transactionTypePredictions: TransactionTypePrediction[];
  activeTip: string | null;
  tooltipPosition: TooltipPosition | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

export interface AIInsightsCardProps {
  insights: PredictionInsights;
  timeframe: TimeframeType;
  modelAccuracy: ModelAccuracy[];
  activeTip: string | null;
  tooltipPosition: TooltipPosition | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  // Enhanced props for AI integration (optional for backward compatibility)
  predictionData?: any[];
  transactionTypePredictions?: TransactionTypePrediction[];
  userProfile?: {
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    savingsRate: number;
    budgetCategories: string[];
    financialGoals: any[];
    spendingPatterns: any[];
  };
}