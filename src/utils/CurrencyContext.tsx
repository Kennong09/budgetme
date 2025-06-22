import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  setCurrency: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Map of currency codes to their symbols
export const currencySymbols: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: '$',
  AUD: '$',
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currency, setCurrency] = useState<string>('PHP'); // Default to PHP
  const [currencySymbol, setCurrencySymbol] = useState<string>('₱'); // Default to ₱
  
  // Update the currency symbol when the currency changes
  useEffect(() => {
    setCurrencySymbol(currencySymbols[currency] || '₱'); // Default to ₱ if currency not found
  }, [currency]);
  
  // Load saved preference from localStorage if available
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
  }, []);
  
  // Set the currency and save to localStorage
  const handleSetCurrency = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
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