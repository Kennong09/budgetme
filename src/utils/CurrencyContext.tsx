import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface CurrencyContextType {
  currency: 'PHP';
  currencySymbol: '₱';
  setCurrency: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

/**
 * Currency Provider - PHP ONLY
 * Application is locked to Philippine Peso (₱)
 * All multi-currency support has been removed
 */
export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  // Clean up localStorage on mount to ensure PHP is set
  useEffect(() => {
    localStorage.setItem('preferredCurrency', 'PHP');
  }, []);
  
  const value: CurrencyContextType = {
    currency: 'PHP' as const,
    currencySymbol: '₱' as const,
    setCurrency: () => {
      console.warn('Currency is locked to PHP only - setCurrency has no effect');
    }
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

/**
 * Hook for using the currency context
 * Always returns PHP currency
 */
export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}; 