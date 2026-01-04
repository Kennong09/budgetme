import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Transaction, UserData, FilterState, DateFilterType, TypeFilterType } from '../types';

/**
 * Custom hook for managing filtered data
 */
export const useFilteredData = (userData: UserData | null) => {
  // Filter states
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  // Initialize with empty array - will be populated by effect
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filteredUserData, setFilteredUserData] = useState<UserData | null>(null);
  // Track if initial data has been set
  const initialDataSetRef = useRef(false);

  // Stable memoized filter values to prevent unnecessary recalculations
  const stableDateFilter = useMemo(() => dateFilter, [dateFilter]);
  const stableCategoryFilter = useMemo(() => categoryFilter, [categoryFilter]);
  const stableTypeFilter = useMemo(() => typeFilter, [typeFilter]);
  const stableCustomStartDate = useMemo(() => customStartDate, [customStartDate]);
  const stableCustomEndDate = useMemo(() => customEndDate, [customEndDate]);
  const stableUserData = useMemo(() => userData, [userData]);

  // Stable filter transactions function with proper memoization
  const filterTransactions = useCallback((transactions: Transaction[]): Transaction[] => {
    return transactions.filter(transaction => {
      const txDate = new Date(transaction.date);
      const currentDate = new Date();
      
      // Date filter
      if (stableDateFilter !== 'all') {
        switch (stableDateFilter) {
          case 'current-month':
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) {
              return false;
            }
            break;
        case 'last-3-months':
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(currentDate.getMonth() - 2); // -2 to include current month
          threeMonthsAgo.setDate(1); // Start from first day of that month
          threeMonthsAgo.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison
          if (txDate < threeMonthsAgo) {
            return false;
          }
          break;
        case 'last-6-months':
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(currentDate.getMonth() - 5); // -5 to include current month
          sixMonthsAgo.setDate(1); // Start from first day of that month
          sixMonthsAgo.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison
          if (txDate < sixMonthsAgo) {
            return false;
          }
          break;
        case 'last-year':
          // Filter for previous calendar year (e.g., 2024 if current year is 2025)
          const previousYear = currentDate.getFullYear() - 1;
          if (txDate.getFullYear() !== previousYear) {
            return false;
          }
          break;
          case 'custom':
            // Validate custom dates exist and are valid
            if (stableCustomStartDate && stableCustomEndDate) {
              const startDate = new Date(stableCustomStartDate);
              const endDate = new Date(stableCustomEndDate);
              
              // Check if dates are valid and start <= end
              if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                if (startDate > endDate) {
                  // Invalid range: start date after end date
                  return false;
                }
                // Filter: transaction must be within the range (inclusive)
                if (txDate < startDate || txDate > endDate) {
                  return false;
                }
              }
            } else if (stableCustomStartDate) {
              // Only start date provided: filter transactions from start date onwards
              const startDate = new Date(stableCustomStartDate);
              if (!isNaN(startDate.getTime()) && txDate < startDate) {
                return false;
              }
            } else if (stableCustomEndDate) {
              // Only end date provided: filter transactions up to end date
              const endDate = new Date(stableCustomEndDate);
              if (!isNaN(endDate.getTime()) && txDate > endDate) {
                return false;
              }
            }
            break;
        }
      }
      
      // Type filter
      if (stableTypeFilter !== 'all' && transaction.type !== stableTypeFilter) {
        return false;
      }
      
      // Category filter - check both category_id (mapped) and raw expense/income_category_id fields
      if (stableCategoryFilter !== 'all') {
        const rawTx = transaction as typeof transaction & { expense_category_id?: string; income_category_id?: string };
        const txCategoryId = transaction.category_id || rawTx.expense_category_id || rawTx.income_category_id;
        if (txCategoryId !== stableCategoryFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [stableDateFilter, stableTypeFilter, stableCategoryFilter, stableCustomStartDate, stableCustomEndDate]);

  // Memoized URL parameters generation with stable dependencies
  const getFilteredUrlParams = useCallback((): string => {
    const params = new URLSearchParams();
    
    try {
      if (stableDateFilter !== 'all') {
        if (stableDateFilter === 'current-month') {
          const now = new Date();
          if (isNaN(now.getTime())) return params.toString();
          params.append('month', String(now.getMonth() + 1));
          params.append('year', String(now.getFullYear()));
        } else if (stableDateFilter === 'custom' && stableCustomStartDate && stableCustomEndDate) {
          // Validate custom dates
          const startDate = new Date(stableCustomStartDate);
          const endDate = new Date(stableCustomEndDate);
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            params.append('startDate', stableCustomStartDate);
            params.append('endDate', stableCustomEndDate);
          }
        } else if (stableDateFilter.startsWith('last-')) {
          const monthsStr = stableDateFilter.split('-')[1];
          const months = parseInt(monthsStr);
          
          if (!isNaN(months) && months > 0) {
            const endDate = new Date();
            const startDate = new Date();
            
            // Safely subtract months to avoid invalid dates
            const currentMonth = startDate.getMonth();
            const currentYear = startDate.getFullYear();
            let newMonth = currentMonth - months;
            let newYear = currentYear;
            
            // Handle year rollover
            while (newMonth < 0) {
              newMonth += 12;
              newYear--;
            }
            
            // Set the new date safely
            startDate.setFullYear(newYear, newMonth, 1); // Set to first day of target month
            
            // Validate the dates before converting to ISO string
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              params.append('startDate', startDate.toISOString().split('T')[0]);
              params.append('endDate', endDate.toISOString().split('T')[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating filtered URL params:', error);
      // Return empty params on error to avoid breaking the UI
      return new URLSearchParams().toString();
    }
    
    if (stableTypeFilter !== 'all') {
      params.append('type', stableTypeFilter);
    }
    
    if (stableCategoryFilter !== 'all') {
      params.append('categoryId', stableCategoryFilter);
    }
    
    return params.toString();
  }, [stableDateFilter, stableCustomStartDate, stableCustomEndDate, stableTypeFilter, stableCategoryFilter]);

  // Stable clear filters function
  const clearFilters = useCallback(() => {
    setDateFilter('all');
    setCategoryFilter('all');
    setTypeFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  }, []);

  // Memoized filtered transactions with stable dependencies
  const memoizedFilteredTransactions = useMemo(() => {
    if (!stableUserData || !stableUserData.transactions) {
      return [];
    }
    return filterTransactions(stableUserData.transactions);
  }, [stableUserData, filterTransactions]);

  // Memoized summary calculations with stable dependencies
  const memoizedSummaryData = useMemo(() => {
    if (!memoizedFilteredTransactions.length) {
      return {
        income: 0,
        expenses: 0,
        balance: 0,
        savingsRate: 0
      };
    }

    const filteredIncome = memoizedFilteredTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      
    const filteredExpenses = memoizedFilteredTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      
    const filteredSavingsRate = filteredIncome > 0 ? ((filteredIncome - filteredExpenses) / filteredIncome) * 100 : 0;
    
    return {
      income: filteredIncome,
      expenses: filteredExpenses,
      balance: filteredIncome - filteredExpenses,
      savingsRate: filteredSavingsRate
    };
  }, [memoizedFilteredTransactions]);

  // Debounced effect to update filtered data (300ms delay for filter changes, immediate for initial load)
  useEffect(() => {
    // Set initial data immediately without debounce
    if (!initialDataSetRef.current && stableUserData?.transactions && stableUserData.transactions.length > 0) {
      initialDataSetRef.current = true;
      setFilteredTransactions(memoizedFilteredTransactions);
      setFilteredUserData({
        ...stableUserData,
        summaryData: memoizedSummaryData
      });
      return;
    }
    
    // Also update immediately if we have data but filteredTransactions is empty
    if (memoizedFilteredTransactions.length > 0 && filteredTransactions.length === 0) {
      setFilteredTransactions(memoizedFilteredTransactions);
      if (stableUserData) {
        setFilteredUserData({
          ...stableUserData,
          summaryData: memoizedSummaryData
        });
      }
      return;
    }
    
    // Debounce subsequent filter changes
    const timeoutId = setTimeout(() => {
      setFilteredTransactions(memoizedFilteredTransactions);
      
      // Update userData with filtered summary
      if (stableUserData) {
        setFilteredUserData({
          ...stableUserData,
          summaryData: memoizedSummaryData
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [memoizedFilteredTransactions, memoizedSummaryData, stableUserData]);

  return {
    // Filter states
    dateFilter,
    setDateFilter,
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    
    // Filtered data
    filteredTransactions,
    filteredUserData,
    
    // Helper functions
    filterTransactions,
    getFilteredUrlParams,
    clearFilters
  };
};
