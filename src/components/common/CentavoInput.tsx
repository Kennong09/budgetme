import React, { useState, useEffect, useRef } from 'react';
import { 
  formatCurrency, 
  parseCurrencyInput, 
  getCurrencySymbol, 
  validateCentavoAmount,
  roundToCentavo,
  DEFAULT_CURRENCY,
  CURRENCY_CONFIGS
} from '../../utils/currencyUtils';

export interface CentavoInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  required?: boolean;
  label?: string;
  error?: string;
  showCurrencySelect?: boolean;
  onCurrencyChange?: (currency: string) => void;
  id?: string;
  name?: string;
}

/**
 * Enhanced currency input component with centavo support
 * Prevents format string injection and provides proper centavo precision
 */
export const CentavoInput: React.FC<CentavoInputProps> = ({
  value,
  onChange,
  currency = DEFAULT_CURRENCY,
  placeholder,
  className = '',
  disabled = false,
  min = 0,
  max,
  required = false,
  label,
  error,
  showCurrencySelect = false,
  onCurrencyChange,
  id,
  name
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when value prop changes
  useEffect(() => {
    if (!isFocused) {
      if (value === 0) {
        setDisplayValue('');
      } else {
        // Always display with exactly 2 decimal places (centavo precision)
        setDisplayValue(value.toFixed(2));
      }
    }
  }, [value, currency, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);
    
    // Parse and validate centavo input
    const parsed = parseCurrencyInput(input, currency);
    
    // Always round to 2 decimal places (centavos) regardless of input
    const rounded = Math.round(parsed * 100) / 100;
    
    // Validate range
    if (min !== undefined && rounded < min) return;
    if (max !== undefined && rounded > max) return;
    
    // Always use rounded value for centavo precision
    onChange(rounded);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Always format to exactly 2 decimal places on blur (centavo precision)
    if (value > 0) {
      setDisplayValue(value.toFixed(2));
    } else {
      setDisplayValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, and decimal point
    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      // Allow: home, end, left, right, down, up
      (e.keyCode >= 35 && e.keyCode <= 40)) {
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value;
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS[DEFAULT_CURRENCY];
  const inputId = id || name || 'centavo-input';

  // Generate placeholder - always use 2 decimal places for centavos
  const defaultPlaceholder = '0.00';
  const actualPlaceholder = placeholder || defaultPlaceholder;

  return (
    <div className="centavo-input-container">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      
      <div className="input-group">
        {/* Currency Symbol Prepend */}
        <div className="input-group-prepend">
          <span className="input-group-text">
            {currencySymbol}
          </span>
        </div>
        
        {/* Amount Input */}
        <input
          ref={inputRef}
          type="text"
          id={inputId}
          name={name}
          className={`form-control ${className} ${error ? 'is-invalid' : ''}`}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={actualPlaceholder}
          disabled={disabled}
          required={required}
          inputMode="decimal"
          autoComplete="off"
          title={`Enter amount in ${config.name} with up to 2 decimal places (centavos)`}
        />
        
        {/* Currency Selector (Optional) */}
        {showCurrencySelect && onCurrencyChange && (
          <div className="input-group-append">
            <select
              className="form-select"
              value={currency}
              onChange={handleCurrencyChange}
              disabled={disabled}
              style={{ minWidth: '80px' }}
            >
              {Object.values(CURRENCY_CONFIGS).map((config) => (
                <option key={config.code} value={config.code}>
                  {config.code}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Help Text */}
      {!error && (
        <small className="form-text text-muted">
          Enter amount with up to 2 decimal places (e.g., 150.25 for centavos)
        </small>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
      
      {/* Validation Range Display */}
      {(min !== undefined || max !== undefined) && !error && (
        <small className="form-text text-muted">
          {min !== undefined && max !== undefined
            ? `Range: ${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`
            : min !== undefined
            ? `Minimum: ${formatCurrency(min, currency)}`
            : max !== undefined
            ? `Maximum: ${formatCurrency(max, currency)}`
            : ''
          }
        </small>
      )}
    </div>
  );
};

/**
 * Contribution Input Component for Goals
 * Specialized input for contributing to financial goals
 */
export interface ContributionInputProps {
  onContribute: (amount: number) => void;
  maxAmount?: number;
  currency?: string;
  disabled?: boolean;
  className?: string;
}

export const ContributionInput: React.FC<ContributionInputProps> = ({
  onContribute,
  maxAmount,
  currency = DEFAULT_CURRENCY,
  disabled = false,
  className = ''
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleContribute = async () => {
    if (amount <= 0) return;
    if (maxAmount !== undefined && amount > maxAmount) return;
    
    setIsSubmitting(true);
    try {
      await onContribute(amount);
      setAmount(0); // Reset after successful contribution
    } catch (error) {
      console.error('Contribution failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && amount > 0) {
      handleContribute();
    }
  };

  return (
    <div className={`contribution-input ${className}`}>
      <CentavoInput
        value={amount}
        onChange={setAmount}
        currency={currency}
        placeholder="0.00"
        max={maxAmount}
        min={0.01}
        disabled={disabled || isSubmitting}
        className="mb-2"
      />
      
      <button
        type="button"
        className="btn btn-success btn-sm w-100"
        onClick={handleContribute}
        disabled={disabled || isSubmitting || amount <= 0 || (maxAmount !== undefined && amount > maxAmount)}
      >
        {isSubmitting ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Contributing...
          </>
        ) : (
          <>
            <i className="fas fa-plus me-2"></i>
            Contribute {amount > 0 ? formatCurrency(amount, currency) : ''}
          </>
        )}
      </button>
      
      {maxAmount !== undefined && amount > maxAmount && (
        <small className="text-danger d-block mt-1">
          Amount exceeds remaining target of {formatCurrency(maxAmount, currency)}
        </small>
      )}
    </div>
  );
};

/**
 * Budget Amount Input Component
 * Specialized input for budget amounts with validation
 */
export interface BudgetAmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  suggestedAmounts?: number[];
}

export const BudgetAmountInput: React.FC<BudgetAmountInputProps> = ({
  value,
  onChange,
  currency = DEFAULT_CURRENCY,
  label = 'Budget Amount',
  placeholder,
  className = '',
  disabled = false,
  required = true,
  suggestedAmounts = [1000, 5000, 10000, 25000, 50000]
}) => {
  const handleSuggestedAmountClick = (amount: number) => {
    onChange(amount);
  };

  return (
    <div className={`budget-amount-input ${className}`}>
      <CentavoInput
        value={value}
        onChange={onChange}
        currency={currency}
        label={label}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={0.01}
        showCurrencySelect={false}
      />
      
      {/* Suggested Amounts */}
      {suggestedAmounts && suggestedAmounts.length > 0 && (
        <div className="suggested-amounts mt-2">
          <small className="form-text text-muted d-block mb-2">Quick amounts:</small>
          <div className="d-flex flex-wrap gap-1">
            {suggestedAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handleSuggestedAmountClick(amount)}
                disabled={disabled}
              >
                {formatCurrency(amount, currency, { showDecimals: amount % 1 !== 0 })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CentavoInput;