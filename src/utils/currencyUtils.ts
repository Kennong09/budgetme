/**
 * Simplified Currency Utilities - PHP ONLY
 * All multi-currency support removed
 * Application is locked to Philippine Peso (PHP) only
 */

export interface CurrencyConfig {
  code: 'PHP';
  symbol: '₱';
  name: 'Philippine Peso';
  decimalPlaces: 2;
}

// Single currency configuration - PHP ONLY
export const CURRENCY_CONFIG: CurrencyConfig = {
  code: 'PHP',
  symbol: '₱',
  name: 'Philippine Peso',
  decimalPlaces: 2
};

// Legacy export for backward compatibility - PHP ONLY
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  PHP: CURRENCY_CONFIG
};

/**
 * Format currency - PHP ONLY
 * Always formats amounts in Philippine Peso (₱)
 */
export const formatCurrency = (
  amount: number,
  options: {
    showSymbol?: boolean;
    showDecimals?: boolean;
  } = {}
): string => {
  const { showSymbol = true, showDecimals = true } = options;
  
  const decimalPlaces = showDecimals ? 2 : 0;
  
  const formatOptions: Intl.NumberFormatOptions = {
    style: "decimal",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  };
  
  const formattedAmount = new Intl.NumberFormat("en-US", formatOptions).format(amount);
  
  return showSymbol ? '₱' + formattedAmount : formattedAmount;
};

/**
 * Get currency symbol - always returns ₱
 */
export const getCurrencySymbol = (): string => '₱';

/**
 * Parse currency input - PHP ONLY
 * Safely parses user input and handles ₱ symbol
 */
export const parseCurrencyInput = (input: string): number => {
  if (!input || typeof input !== 'string') return 0;
  
  // Remove ₱ symbol, commas, whitespace, and non-numeric characters except decimal point
  const cleanInput = input
    .replace(/[₱,\s]/g, '')
    .replace(/[^\d.-]/g, '');
  
  const parsed = parseFloat(cleanInput);
  
  if (isNaN(parsed) || parsed < 0) return 0;
  
  // Round to 2 decimal places (centavos)
  return Math.round(parsed * 100) / 100;
};

/**
 * Default currency for the application - PHP ONLY
 */
export const DEFAULT_CURRENCY = 'PHP';

/**
 * Round to nearest centavo (2 decimal places)
 * PHP ONLY - always rounds to centavos
 */
export const roundToCentavo = (amount: number): number => {
  if (!isFinite(amount) || isNaN(amount)) {
    throw new Error('Invalid amount: must be a finite number');
  }
  
  if (amount > 99999999999.99) {
    throw new Error('Amount too large: exceeds maximum supported value');
  }
  
  if (amount < -99999999999.99) {
    throw new Error('Amount too small: exceeds minimum supported value');
  }
  
  // Round to 2 decimal places (centavos)
  const scaled = Math.round(amount * 100);
  const result = scaled / 100;
  
  if (!isFinite(result) || isNaN(result)) {
    throw new Error('Rounding resulted in invalid number');
  }
  
  return result;
};

/**
 * Sanitize budget names and descriptions to prevent format string injection
 * Replaces potentially dangerous characters with safe alternatives
 */
export const sanitizeBudgetName = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/%/g, 'percent')  // Replace % with 'percent'
    .replace(/\./g, ' ')       // Replace . with space
    .trim();
};

/**
 * Validate centavo amount - PHP ONLY
 * Ensures amount is valid and within acceptable range
 */
export const validateCentavoAmount = (amount: number): boolean => {
  if (!isFinite(amount) || isNaN(amount)) return false;
  if (amount < 0) return false;
  if (amount > 99999999999.99) return false;
  
  // Check if amount has more than 2 decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
};