// AI Insights Filters Management Hook
import { useState, useCallback, useMemo } from 'react';
import { AIInsightFilters, DEFAULT_FILTERS } from './types';

interface UseAIInsightsFiltersReturn {
  filters: AIInsightFilters;
  updateFilters: (updates: Partial<AIInsightFilters>) => void;
  resetFilters: () => void;
  setSearch: (search: string) => void;
  setAIService: (service: AIInsightFilters['aiService']) => void;
  setRiskLevel: (riskLevel: AIInsightFilters['riskLevel']) => void;
  setConfidenceRange: (range: { min: number; max: number }) => void;
  setDateRange: (range: { startDate: string; endDate: string }) => void;
  setStatus: (status: AIInsightFilters['status']) => void;
  setUserId: (userId: string) => void;
  setPageSize: (pageSize: number) => void;
  setCurrentPage: (page: number) => void;
  setSorting: (sortBy: AIInsightFilters['sortBy'], sortOrder: AIInsightFilters['sortOrder']) => void;
  hasActiveFilters: boolean;
  getActiveFilterCount: () => number;
  getFilterSummary: () => string[];
}

export const useAIInsightsFilters = (initialFilters: Partial<AIInsightFilters> = {}): UseAIInsightsFiltersReturn => {
  // Initialize filters with defaults and any provided initial values
  const [filters, setFilters] = useState<AIInsightFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  // Update filters function
  const updateFilters = useCallback((updates: Partial<AIInsightFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...updates,
      // Reset to first page when filters change (except for page-related updates)
      currentPage: updates.currentPage !== undefined ? updates.currentPage : 
                   (updates.pageSize !== undefined ? prev.currentPage : 1)
    }));
  }, []);

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Individual filter setters for convenience
  const setSearch = useCallback((search: string) => {
    updateFilters({ search, currentPage: 1 });
  }, [updateFilters]);

  const setAIService = useCallback((aiService: AIInsightFilters['aiService']) => {
    updateFilters({ aiService, currentPage: 1 });
  }, [updateFilters]);

  const setRiskLevel = useCallback((riskLevel: AIInsightFilters['riskLevel']) => {
    updateFilters({ riskLevel, currentPage: 1 });
  }, [updateFilters]);

  const setConfidenceRange = useCallback((confidenceRange: { min: number; max: number }) => {
    updateFilters({ confidenceRange, currentPage: 1 });
  }, [updateFilters]);

  const setDateRange = useCallback((dateRange: { startDate: string; endDate: string }) => {
    updateFilters({ dateRange, currentPage: 1 });
  }, [updateFilters]);

  const setStatus = useCallback((status: AIInsightFilters['status']) => {
    updateFilters({ status, currentPage: 1 });
  }, [updateFilters]);

  const setUserId = useCallback((userId: string) => {
    updateFilters({ userId, currentPage: 1 });
  }, [updateFilters]);

  const setPageSize = useCallback((pageSize: number) => {
    updateFilters({ pageSize, currentPage: 1 });
  }, [updateFilters]);

  const setCurrentPage = useCallback((currentPage: number) => {
    updateFilters({ currentPage });
  }, [updateFilters]);

  const setSorting = useCallback((sortBy: AIInsightFilters['sortBy'], sortOrder: AIInsightFilters['sortOrder']) => {
    updateFilters({ sortBy, sortOrder, currentPage: 1 });
  }, [updateFilters]);

  // Check if any filters are active (different from defaults)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== DEFAULT_FILTERS.search ||
      filters.aiService !== DEFAULT_FILTERS.aiService ||
      filters.riskLevel !== DEFAULT_FILTERS.riskLevel ||
      filters.confidenceRange.min !== DEFAULT_FILTERS.confidenceRange.min ||
      filters.confidenceRange.max !== DEFAULT_FILTERS.confidenceRange.max ||
      filters.dateRange.startDate !== DEFAULT_FILTERS.dateRange.startDate ||
      filters.dateRange.endDate !== DEFAULT_FILTERS.dateRange.endDate ||
      filters.status !== DEFAULT_FILTERS.status ||
      filters.userId !== DEFAULT_FILTERS.userId ||
      filters.sortBy !== DEFAULT_FILTERS.sortBy ||
      filters.sortOrder !== DEFAULT_FILTERS.sortOrder
    );
  }, [filters]);

  // Count active filters
  const getActiveFilterCount = useCallback((): number => {
    let count = 0;
    
    if (filters.search !== DEFAULT_FILTERS.search) count++;
    if (filters.aiService !== DEFAULT_FILTERS.aiService) count++;
    if (filters.riskLevel !== DEFAULT_FILTERS.riskLevel) count++;
    if (filters.confidenceRange.min !== DEFAULT_FILTERS.confidenceRange.min || 
        filters.confidenceRange.max !== DEFAULT_FILTERS.confidenceRange.max) count++;
    if (filters.dateRange.startDate !== DEFAULT_FILTERS.dateRange.startDate || 
        filters.dateRange.endDate !== DEFAULT_FILTERS.dateRange.endDate) count++;
    if (filters.status !== DEFAULT_FILTERS.status) count++;
    if (filters.userId !== DEFAULT_FILTERS.userId) count++;
    if (filters.sortBy !== DEFAULT_FILTERS.sortBy || 
        filters.sortOrder !== DEFAULT_FILTERS.sortOrder) count++;
    
    return count;
  }, [filters]);

  // Get human-readable filter summary
  const getFilterSummary = useCallback((): string[] => {
    const summary: string[] = [];

    if (filters.search) {
      summary.push(`Search: "${filters.search}"`);
    }

    if (filters.aiService !== 'all') {
      const serviceLabels = {
        openrouter: 'OpenRouter',
        chatbot: 'ChatBot',
        prophet: 'Prophet',
        fallback: 'Fallback'
      };
      summary.push(`Service: ${serviceLabels[filters.aiService]}`);
    }

    if (filters.riskLevel !== 'all') {
      const riskLabels = {
        high: 'High Risk',
        medium: 'Medium Risk',
        low: 'Low Risk'
      };
      summary.push(`Risk: ${riskLabels[filters.riskLevel]}`);
    }

    if (filters.confidenceRange.min > 0 || filters.confidenceRange.max < 100) {
      summary.push(`Confidence: ${filters.confidenceRange.min}% - ${filters.confidenceRange.max}%`);
    }

    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      const start = filters.dateRange.startDate || 'Start';
      const end = filters.dateRange.endDate || 'End';
      summary.push(`Date: ${start} to ${end}`);
    }

    if (filters.status !== 'all') {
      const statusLabels = {
        active: 'Active',
        expired: 'Expired',
        error: 'Error'
      };
      summary.push(`Status: ${statusLabels[filters.status]}`);
    }

    if (filters.userId) {
      summary.push(`User ID: ${filters.userId}`);
    }

    if (filters.sortBy !== DEFAULT_FILTERS.sortBy || filters.sortOrder !== DEFAULT_FILTERS.sortOrder) {
      const sortLabels: { [key: string]: string } = {
        'generated_at': 'Generated Date',
        'confidence_level': 'Confidence',
        'access_count': 'Access Count',
        'processing_time': 'Processing Time',
        'username': 'Username',
        'riskLevel': 'Risk Level',
        'aiService': 'AI Service',
        'status': 'Status'
      };
      const orderLabel = filters.sortOrder === 'asc' ? 'Ascending' : 'Descending';
      summary.push(`Sort: ${sortLabels[filters.sortBy] || filters.sortBy} (${orderLabel})`);
    }

    return summary;
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    setSearch,
    setAIService,
    setRiskLevel,
    setConfidenceRange,
    setDateRange,
    setStatus,
    setUserId,
    setPageSize,
    setCurrentPage,
    setSorting,
    hasActiveFilters,
    getActiveFilterCount,
    getFilterSummary
  };
};
