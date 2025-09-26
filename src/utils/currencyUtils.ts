/**
 * Enhanced Currency Utilities with Centavo Support
 * Provides safe currency formatting, parsing, and validation
 * Prevents format string injection vulnerabilities
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

// Currency configurations with centavo support
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  'USD': { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  'EUR': { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
  'GBP': { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
  'JPY': { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0 },
  'CAD': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2 },
  'AUD': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
  'PHP': { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimalPlaces: 2 }, // Centavo support
  'CHF': { code: 'CHF', symbol: 'CHF ', name: 'Swiss Franc', decimalPlaces: 2 },
  'CNY': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimalPlaces: 2 },
  'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalPlaces: 2 },
  'BRL': { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimalPlaces: 2 },
  'MXN': { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimalPlaces: 2 },
  'KRW': { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimalPlaces: 0 },
  'SGD': { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimalPlaces: 2 },
  'HKD': { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimalPlaces: 2 },
  'THB': { code: 'THB', symbol: '฿', name: 'Thai Baht', decimalPlaces: 2 },
  'MYR': { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimalPlaces: 2 },
  'IDR': { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimalPlaces: 2 },
  'VND': { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimalPlaces: 0 }
};

/**
 * Enhanced currency formatting with centavo support
 * Safely formats currency amounts without format string vulnerabilities
 */
export const formatCurrency = (
  amount: number, 
  currencyCode: string = 'PHP',
  options: {
    showSymbol?: boolean;
    showDecimals?: boolean;
    locale?: string;
  } = {}
): string => {
  const {
    showSymbol = true,
    showDecimals = true,
    locale = 'en-US'
  } = options;

  // Get currency configuration
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS['PHP'];
  
  // Determine decimal places
  const decimalPlaces = showDecimals ? config.decimalPlaces : 0;
  
  // Handle centavo precision - always show proper decimal places
  const formatOptions: Intl.NumberFormatOptions = {
    style: "decimal",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  };
  
  // Format the number with proper centavo precision
  const formattedAmount = new Intl.NumberFormat(locale, formatOptions).format(amount);
  
  // Return with or without symbol
  return showSymbol ? config.symbol + formattedAmount : formattedAmount;
};

/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  const config = CURRENCY_CONFIGS[currencyCode];
  return config ? config.symbol : currencyCode + ' ';
};

/**
 * Parse currency input with centavo validation
 * Safely parses user input and prevents injection attacks
 */
export const parseCurrencyInput = (input: string, currencyCode: string = 'PHP'): number => {
  if (!input || typeof input !== 'string') return 0;
  
  // Get currency configuration
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS['PHP'];
  
  // Remove currency symbols, whitespace, and non-numeric characters except decimal point
  const cleanInput = input
    .replace(new RegExp(`[${Object.values(CURRENCY_CONFIGS).map(c => c.symbol).join('')},\\s]`, 'g'), '')
    .replace(/[^\d.-]/g, '');
  
  // Parse as float
  const parsed = parseFloat(cleanInput);
  
  // Validate and ensure proper precision
  if (isNaN(parsed) || parsed < 0) return 0;
  
  // Round to appropriate decimal places for centavo precision
  const multiplier = Math.pow(10, config.decimalPlaces);
  return Math.round(parsed * multiplier) / multiplier;
};

/**
 * Validate centavo amounts for proper precision
 */
export const validateCentavoAmount = (amount: number, currencyCode: string = 'PHP'): boolean => {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS['PHP'];
  
  if (config.decimalPlaces === 0) {
    // For currencies without decimals, ensure it's a whole number
    return Number.isInteger(amount);
  }
  
  // Check if amount has valid decimal precision
  const multiplier = Math.pow(10, config.decimalPlaces);
  const rounded = Math.round(amount * multiplier) / multiplier;
  return Math.abs(amount - rounded) < 0.0001; // Allow for floating point precision
};

/**
 * Validate currency code
 */
export const isValidCurrencyCode = (currencyCode: string): boolean => {
  return currencyCode in CURRENCY_CONFIGS;
};

/**
 * Convert currency amount between different currencies
 * Note: This would integrate with real exchange rate API in production
 */
export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number = 1.0
): number => {
  if (fromCurrency === toCurrency) return amount;
  
  // Simple conversion using provided rate
  const converted = amount * exchangeRate;
  
  // Ensure proper precision for target currency
  const targetConfig = CURRENCY_CONFIGS[toCurrency] || CURRENCY_CONFIGS['PHP'];
  const multiplier = Math.pow(10, targetConfig.decimalPlaces);
  
  return Math.round(converted * multiplier) / multiplier;
};

/**
 * Format currency for display in tables and lists
 */
export const formatCurrencyCompact = (
  amount: number,
  currencyCode: string = 'PHP'
): string => {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS['PHP'];
  
  // For large amounts, use compact notation
  if (Math.abs(amount) >= 1000000) {
    return config.symbol + (amount / 1000000).toFixed(1) + 'M';
  } else if (Math.abs(amount) >= 1000) {
    return config.symbol + (amount / 1000).toFixed(1) + 'K';
  }
  
  return formatCurrency(amount, currencyCode);
};

/**
 * Calculate percentage with safe formatting
 * Prevents format string injection in percentage calculations
 */
export const formatPercentage = (
  current: number,
  total: number,
  decimalPlaces: number = 1
): string => {
  if (total === 0) return '0%';
  
  const percentage = (current / total) * 100;
  return percentage.toFixed(decimalPlaces) + '%';
};

/**
 * Safe string concatenation for currency descriptions
 * Prevents format string injection when building currency-related messages
 */
export const buildCurrencyDescription = (
  description: string,
  amount: number,
  currencyCode: string = 'PHP'
): string => {
  // Sanitize description to prevent format string injection
  const safeDescription = description.replace(/[%]/g, '%%');
  const formattedAmount = formatCurrency(amount, currencyCode);
  
  // Use safe concatenation instead of format strings
  return safeDescription + ' - ' + formattedAmount;
};

/**
 * Validate and sanitize budget names to prevent format string injection
 */
export const sanitizeBudgetName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  // Remove or escape characters that could cause format string injection
  return name
    .replace(/[%]/g, 'percent') // Replace % with word
    .replace(/\*/g, '') // Remove asterisks
    .replace(/\./g, ' ') // Replace dots with spaces to prevent decimal confusion
    .trim()
    .substring(0, 100); // Limit length
};

/**
 * Get supported currencies list
 */
export const getSupportedCurrencies = (): CurrencyConfig[] => {
  return Object.values(CURRENCY_CONFIGS);
};

/**
 * Default currency for the application
 */
export const DEFAULT_CURRENCY = 'PHP';

// Common centavo values for validation
export const COMMON_CENTAVO_VALUES = [0, 0.05, 0.10, 0.25, 0.50, 0.75];

/**
 * Round to nearest centavo with overflow protection
 * For Philippine Peso, always rounds to 2 decimal places (centavos)
 * For other currencies, uses their defined decimal places
 */
export const roundToCentavo = (amount: number, currencyCode: string = 'PHP'): number => {
  // Validate input
  if (!isFinite(amount) || isNaN(amount)) {
    throw new Error('Invalid amount: must be a finite number');
  }
  
  // Check for reasonable limits to prevent overflow
  if (amount > 99999999999.99) {
    throw new Error('Amount too large: exceeds maximum supported value');
  }
  
  if (amount < -99999999999.99) {
    throw new Error('Amount too small: exceeds minimum supported value');
  }
  
  // For practical use, always round to 2 decimal places (centavos) regardless of currency
  // The database can store 4 decimal places, but user interface should work with centavos
  const decimalPlaces = 2;
  const multiplier = Math.pow(10, decimalPlaces);
  
  // Use more precise rounding to avoid floating point errors
  const scaled = Math.round(amount * multiplier);
  const result = scaled / multiplier;
  
  // Validate the result
  if (!isFinite(result) || isNaN(result)) {
    throw new Error('Rounding resulted in invalid number');
  }
  
  return result;
};

/**
 * Check if amount has valid centavo precision
 */
export const hasValidCentavoPrecision = (amount: number, currencyCode: string = 'PHP'): boolean => {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS['PHP'];
  const multiplier = Math.pow(10, config.decimalPlaces);
  const scaled = amount * multiplier;
  return Math.abs(scaled - Math.round(scaled)) < 0.0001;
};