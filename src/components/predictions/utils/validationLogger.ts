/**
 * Validation Logger Utility
 * TASK 5.2: Centralized logging for prediction validation
 * 
 * This utility provides consistent logging for:
 * - Prediction values exceeding expected ranges
 * - Unrealistic growth rates detection
 * - Fallback calculations application
 * - User ID and timeframe context in all logs
 */

export interface ValidationLogContext {
  userId: string;
  timeframe: string;
  timestamp?: string;
}

export interface PredictionValidationLog extends ValidationLogContext {
  label: string;
  predicted: number;
  historical: number;
  growthRate: number;
  threshold: string;
  ratio: number;
  validationRule: string;
  action?: string;
}

export interface GrowthRateValidationLog extends ValidationLogContext {
  transactionType: string;
  changePercent: number;
  threshold: string;
  exceedsBy?: number;
  validationRule: string;
  action?: string;
}

export interface FallbackApplicationLog extends ValidationLogContext {
  label: string;
  originalValue: number;
  fallbackValue: number;
  adjustment: string;
  reason: string;
}

export interface CategoryValidationLog extends ValidationLogContext {
  category: string;
  historicalAverage: number;
  predicted: number;
  changePercent: number;
  threshold: string;
  validationRule: string;
}

export interface ValidationSummaryLog extends ValidationLogContext {
  cappingSummary: Record<string, string>;
  cappedValues: Record<string, any>;
  reason: string;
}

/**
 * Log when prediction values exceed expected ranges (3x historical average)
 * Requirement 5.2, 5.4, 5.5
 */
export function logPredictionExceedsRange(log: PredictionValidationLog): void {
  console.error('❌ VALIDATION ERROR: Prediction exceeds expected range (3x historical average):', {
    userId: log.userId,
    timeframe: log.timeframe,
    label: log.label,
    predicted: log.predicted.toFixed(2),
    historical: log.historical.toFixed(2),
    growthRate: `${(log.growthRate * 100).toFixed(1)}%`,
    threshold: log.threshold,
    ratio: log.ratio.toFixed(2) + 'x',
    timestamp: log.timestamp || new Date().toISOString(),
    validationRule: log.validationRule,
    action: log.action || 'Flagged for review'
  });
}

/**
 * Log when unrealistic growth rates are detected (>50%)
 * Requirement 5.2, 5.4, 5.5
 */
export function logUnrealisticGrowthRate(log: GrowthRateValidationLog): void {
  console.error('❌ VALIDATION ERROR: Unrealistic growth rate detected:', {
    userId: log.userId,
    timeframe: log.timeframe,
    transactionType: log.transactionType,
    changePercent: log.changePercent.toFixed(1) + '%',
    threshold: log.threshold,
    exceedsBy: log.exceedsBy ? log.exceedsBy.toFixed(1) + '%' : undefined,
    timestamp: log.timestamp || new Date().toISOString(),
    validationRule: log.validationRule,
    action: log.action || 'Flagged for review'
  });
}

/**
 * Log when fallback calculations are applied
 * Requirement 5.2, 5.4, 5.5
 */
export function logFallbackApplication(log: FallbackApplicationLog): void {
  console.warn('⚠️ FALLBACK APPLIED: Using conservative prediction value:', {
    userId: log.userId,
    timeframe: log.timeframe,
    label: log.label,
    originalValue: log.originalValue.toFixed(2),
    fallbackValue: log.fallbackValue.toFixed(2),
    adjustment: log.adjustment,
    reason: log.reason,
    timestamp: log.timestamp || new Date().toISOString()
  });
}

/**
 * Log high growth rates as warnings (20-50%)
 * Requirement 5.2, 5.4
 */
export function logHighGrowthRateWarning(log: GrowthRateValidationLog): void {
  console.warn('⚠️ VALIDATION WARNING: High growth rate detected:', {
    userId: log.userId,
    timeframe: log.timeframe,
    transactionType: log.transactionType,
    changePercent: log.changePercent.toFixed(1) + '%',
    threshold: log.threshold,
    timestamp: log.timestamp || new Date().toISOString(),
    validationRule: log.validationRule,
    action: log.action || 'Accepting value but flagging for review'
  });
}

/**
 * Log category-specific validation warnings
 * Requirement 5.2, 5.4
 */
export function logCategoryValidationWarning(log: CategoryValidationLog): void {
  console.warn('⚠️ VALIDATION WARNING: High category growth rate detected:', {
    userId: log.userId,
    timeframe: log.timeframe,
    category: log.category,
    historicalAverage: log.historicalAverage.toFixed(2),
    predicted: log.predicted.toFixed(2),
    changePercent: log.changePercent.toFixed(1) + '%',
    threshold: log.threshold,
    timestamp: log.timestamp || new Date().toISOString(),
    validationRule: log.validationRule
  });
}

/**
 * Log validation summary when multiple adjustments are made
 * Requirement 5.2, 5.5
 */
export function logValidationSummary(log: ValidationSummaryLog): void {
  console.warn('⚠️ VALIDATION SUMMARY: Conservative caps applied to predictions:', {
    userId: log.userId,
    timeframe: log.timeframe,
    cappingSummary: log.cappingSummary,
    cappedValues: log.cappedValues,
    timestamp: log.timestamp || new Date().toISOString(),
    reason: log.reason
  });
}

/**
 * Log moderate growth rates as info
 * Requirement 5.2
 */
export function logModerateGrowthInfo(log: GrowthRateValidationLog): void {
  console.info('ℹ️ VALIDATION INFO: Moderate growth rate detected:', {
    userId: log.userId,
    timeframe: log.timeframe,
    transactionType: log.transactionType,
    changePercent: log.changePercent.toFixed(1) + '%',
    threshold: log.threshold,
    timestamp: log.timestamp || new Date().toISOString(),
    validationRule: log.validationRule,
    action: log.action || 'Accepting value'
  });
}

/**
 * Log when no predictions are available and fallback is used
 * Requirement 5.2, 5.5
 */
export function logNoPredictionsAvailable(context: ValidationLogContext, reason: string): void {
  console.warn('⚠️ FALLBACK APPLIED: No predictions available:', {
    userId: context.userId,
    timeframe: context.timeframe,
    reason,
    timestamp: context.timestamp || new Date().toISOString(),
    action: 'Using fallback or empty state'
  });
}

/**
 * Log aggregation validation issues
 * Requirement 5.2, 5.4
 */
export function logAggregationValidation(
  context: ValidationLogContext,
  month: string,
  issue: string,
  details: Record<string, any>
): void {
  console.warn('⚠️ VALIDATION WARNING: Aggregation validation issue:', {
    userId: context.userId,
    timeframe: context.timeframe,
    month,
    issue,
    ...details,
    timestamp: context.timestamp || new Date().toISOString()
  });
}

/**
 * Log successful validation (for debugging)
 * Requirement 5.2
 */
export function logValidationSuccess(
  context: ValidationLogContext,
  label: string,
  details: Record<string, any>
): void {
  console.log('✅ VALIDATION SUCCESS:', {
    userId: context.userId,
    timeframe: context.timeframe,
    label,
    ...details,
    timestamp: context.timestamp || new Date().toISOString()
  });
}
