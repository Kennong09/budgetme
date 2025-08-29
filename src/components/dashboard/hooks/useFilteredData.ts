import { useState, useEffect } from 'react';
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
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filteredUserData, setFilteredUserData] = useState<UserData | null>(null);

  // Filter transactions based on current filters
  const filterTransactions = (transactions: Transaction[]): Transaction[] => {
    return transactions.filter(transaction => {
      const txDate = new Date(transaction.date);
      const currentDate = new Date();
      
      // Date filter
      if (dateFilter !== 'all') {
        switch (dateFilter) {
          case 'current-month':
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) {
              return false;
            }
            break;
          case 'last-3-months':
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
            if (txDate < threeMonthsAgo) {
              return false;
            }
            break;
          case 'last-6-months':
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
            if (txDate < sixMonthsAgo) {
              return false;
            }
            break;
          case 'last-year':
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(currentDate.getFullYear() - 1);
            if (txDate < oneYearAgo) {
              return false;
            }
            break;
          case 'custom':
            if (customStartDate && txDate < new Date(customStartDate)) {
              return false;
            }
            if (customEndDate && txDate > new Date(customEndDate)) {
              return false;
            }
            break;
        }
      }
      
      // Type filter
      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false;
      }
      
      // Category filter
      if (categoryFilter !== 'all' && transaction.category_id !== categoryFilter) {
        return false;
      }
      
      return true;
    });
  };

  // Generate URL parameters based on current filters
  const getFilteredUrlParams = (): string => {
    const params = new URLSearchParams();
    
    try {
      if (dateFilter !== 'all') {
        if (dateFilter === 'current-month') {
          const now = new Date();
          if (isNaN(now.getTime())) return params.toString();
          params.append('month', String(now.getMonth() + 1));
          params.append('year', String(now.getFullYear()));
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
          // Validate custom dates
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            params.append('startDate', customStartDate);
            params.append('endDate', customEndDate);
          }
        } else if (dateFilter.startsWith('last-')) {
          const monthsStr = dateFilter.split('-')[1];
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
    
    if (typeFilter !== 'all') {
      params.append('type', typeFilter);
    }
    
    if (categoryFilter !== 'all') {
      params.append('categoryId', categoryFilter);
    }
    
    return params.toString();
  };

  // Clear all filters
  const clearFilters = () => {
    setDateFilter('all');
    setCategoryFilter('all');
    setTypeFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Update filtered data when filters change
  useEffect(() => {
    if (userData && userData.transactions) {
      const filtered = filterTransactions(userData.transactions);
      setFilteredTransactions(filtered);
      
      // Recalculate summary data based on filtered transactions
      const filteredIncome = filtered
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const filteredExpenses = filtered
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const filteredSavingsRate = filteredIncome > 0 ? ((filteredIncome - filteredExpenses) / filteredIncome) * 100 : 0;
      
      // Update userData with filtered summary
      setFilteredUserData({
        ...userData,
        summaryData: {
          income: filteredIncome,
          expenses: filteredExpenses,
          balance: filteredIncome - filteredExpenses,
          savingsRate: filteredSavingsRate
        }
      });
    }
  }, [userData, dateFilter, typeFilter, categoryFilter, customStartDate, customEndDate]);

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
