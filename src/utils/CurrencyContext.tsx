import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  setCurrency: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// FORCED TO PHP ONLY - All other currencies removed
// This ensures the application only uses Philippine Pesos
export const currencySymbols: Record<string, string> = {
  PHP: '₱',
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  // FIXED VALUES - Currency is now hardcoded to PHP only
  const currency = 'PHP';
  const currencySymbol = '₱';
  
  // Clean up any existing localStorage currency preferences on mount
  useEffect(() => {
    // Remove old currency preferences to ensure PHP is always used
    localStorage.removeItem('preferredCurrency');
    // Set PHP as the only currency in localStorage for consistency
    localStorage.setItem('preferredCurrency', 'PHP');
  }, []);
  
  // No-op function for compatibility with existing components
  // This prevents errors in components that try to set currency
  const handleSetCurrency = (newCurrency: string) => {
    // Always force PHP regardless of what's passed
    console.warn('Currency setting disabled - application is locked to PHP only');
    // Ensure localStorage always contains PHP
    localStorage.setItem('preferredCurrency', 'PHP');
  };

  const value = {
    currency,
    currencySymbol,
    setCurrency: handleSetCurrency
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Hook for using the currency context
export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}; 