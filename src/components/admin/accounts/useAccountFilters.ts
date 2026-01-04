import { useState, useCallback, useMemo } from "react";
import { AccountFilters } from "./types";

/**
 * Custom hook for managing account filters in admin interface
 * Provides filtering logic, state management, and utilities
 */
export const useAccountFilters = () => {
  const [filters, setFilters] = useState<AccountFilters>({
    searchTerm: "",
    filterUser: "all",
    filterType: "all", 
    filterStatus: "all",
    filterDefault: "all",
    sortField: "created_at",
    sortDirection: "desc",
    currentPage: 1,
    pageSize: 10,
    dateFrom: "",
    dateTo: "",
    balanceMin: undefined,
    balanceMax: undefined
  });

  /**
   * Update filters with partial data
   */
  const updateFilters = useCallback((newFilters: Partial<AccountFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset to first page when changing filters (except pagination)
      currentPage: newFilters.currentPage !== undefined ? newFilters.currentPage : 1
    }));
  }, []);

  /**
   * Reset all filters to default values
   */
  const resetFilters = useCallback(() => {
    setFilters({
      searchTerm: "",
      filterUser: "all",
      filterType: "all",
      filterStatus: "all", 
      filterDefault: "all",
      sortField: "created_at",
      sortDirection: "desc",
      currentPage: 1,
      pageSize: 10,
      dateFrom: "",
      dateTo: "",
      balanceMin: undefined,
      balanceMax: undefined
    });
  }, []);

  /**
   * Update search term with debouncing logic
   */
  const updateSearchTerm = useCallback((searchTerm: string) => {
    updateFilters({ searchTerm, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Update user filter
   */
  const updateUserFilter = useCallback((filterUser: string) => {
    updateFilters({ filterUser, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Update account type filter
   */
  const updateTypeFilter = useCallback((filterType: string) => {
    updateFilters({ filterType, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Update status filter
   */
  const updateStatusFilter = useCallback((filterStatus: string) => {
    updateFilters({ filterStatus, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Update default account filter
   */
  const updateDefaultFilter = useCallback((filterDefault: string) => {
    updateFilters({ filterDefault, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Update sorting
   */
  const updateSort = useCallback((sortField: string, sortDirection?: "asc" | "desc") => {
    const newDirection = sortDirection || (filters.sortField === sortField && filters.sortDirection === "asc" ? "desc" : "asc");
    updateFilters({ sortField, sortDirection: newDirection, currentPage: 1 });
  }, [filters.sortField, filters.sortDirection, updateFilters]);

  /**
   * Update pagination
   */
  const updatePage = useCallback((currentPage: number) => {
    updateFilters({ currentPage });
  }, [updateFilters]);

  /**
   * Update page size
   */
  const updatePageSize = useCallback((pageSize: number) => {
    updateFilters({ pageSize, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Update date range filter
   */
  const updateDateRange = useCallback((dateFrom: string, dateTo: string) => {
    updateFilters({ dateFrom, dateTo, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Update balance range filter
   */
  const updateBalanceRange = useCallback((balanceMin?: number, balanceMax?: number) => {
    updateFilters({ balanceMin, balanceMax, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Clear date filters
   */
  const clearDateFilters = useCallback(() => {
    updateFilters({ dateFrom: "", dateTo: "", currentPage: 1 });
  }, [updateFilters]);

  /**
   * Clear balance filters
   */
  const clearBalanceFilters = useCallback(() => {
    updateFilters({ balanceMin: undefined, balanceMax: undefined, currentPage: 1 });
  }, [updateFilters]);

  /**
   * Check if any filters are active (excluding search, sort, and pagination)
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filters.filterUser !== "all" ||
      filters.filterType !== "all" ||
      filters.filterStatus !== "all" ||
      filters.filterDefault !== "all" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== "" ||
      filters.balanceMin !== undefined ||
      filters.balanceMax !== undefined
    );
  }, [filters]);

  /**
   * Get count of active filters
   */
  const getActiveFilterCount = useMemo(() => {
    let count = 0;
    if (filters.filterUser !== "all") count++;
    if (filters.filterType !== "all") count++;
    if (filters.filterStatus !== "all") count++;
    if (filters.filterDefault !== "all") count++;
    if (filters.dateFrom !== "" || filters.dateTo !== "") count++;
    if (filters.balanceMin !== undefined || filters.balanceMax !== undefined) count++;
    return count;
  }, [filters]);

  /**
   * Get filter summary for display
   */
  const getFilterSummary = useMemo(() => {
    const summary: string[] = [];
    
    if (filters.searchTerm) {
      summary.push(`Search: "${filters.searchTerm}"`);
    }
    
    if (filters.filterUser !== "all") {
      summary.push(`User: ${filters.filterUser}`);
    }
    
    if (filters.filterType !== "all") {
      summary.push(`Type: ${filters.filterType}`);
    }
    
    if (filters.filterStatus !== "all") {
      summary.push(`Status: ${filters.filterStatus}`);
    }
    
    if (filters.filterDefault !== "all") {
      summary.push(`Default: ${filters.filterDefault}`);
    }
    
    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom && filters.dateTo) {
        summary.push(`Date: ${filters.dateFrom} to ${filters.dateTo}`);
      } else if (filters.dateFrom) {
        summary.push(`Date: From ${filters.dateFrom}`);
      } else if (filters.dateTo) {
        summary.push(`Date: Until ${filters.dateTo}`);
      }
    }
    
    if (filters.balanceMin !== undefined || filters.balanceMax !== undefined) {
      if (filters.balanceMin !== undefined && filters.balanceMax !== undefined) {
        summary.push(`Balance: ₱${filters.balanceMin.toLocaleString()} to ₱${filters.balanceMax.toLocaleString()}`);
      } else if (filters.balanceMin !== undefined) {
        summary.push(`Balance: Min ₱${filters.balanceMin.toLocaleString()}`);
      } else if (filters.balanceMax !== undefined) {
        summary.push(`Balance: Max ₱${filters.balanceMax.toLocaleString()}`);
      }
    }
    
    return summary;
  }, [filters]);

  /**
   * Validate filter values
   */
  const validateFilters = useMemo(() => {
    const errors: string[] = [];
    
    // Validate date range
    if (filters.dateFrom && filters.dateTo) {
      const fromDate = new Date(filters.dateFrom);
      const toDate = new Date(filters.dateTo);
      
      if (fromDate > toDate) {
        errors.push("Start date must be before end date");
      }
    }
    
    // Validate balance range
    if (filters.balanceMin !== undefined && filters.balanceMax !== undefined) {
      if (filters.balanceMin > filters.balanceMax) {
        errors.push("Minimum balance must be less than maximum balance");
      }
    }
    
    // Validate page size
    if (filters.pageSize < 1 || filters.pageSize > 100) {
      errors.push("Page size must be between 1 and 100");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [filters]);

  /**
   * Generate URL query string from current filters
   */
  const getQueryString = useMemo(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== "all" && value !== undefined && value !== null) {
        if (key === "currentPage" && value === 1) return; // Skip default page
        if (key === "pageSize" && value === 10) return; // Skip default page size
        if (key === "sortField" && value === "created_at") return; // Skip default sort
        if (key === "sortDirection" && value === "desc") return; // Skip default direction
        
        params.set(key, value.toString());
      }
    });
    
    return params.toString();
  }, [filters]);

  /**
   * Load filters from URL query string
   */
  const loadFromQueryString = useCallback((queryString: string) => {
    const params = new URLSearchParams(queryString);
    const newFilters: Partial<AccountFilters> = {};
    
    // Map URL parameters to filter values
    params.forEach((value, key) => {
      switch (key) {
        case "searchTerm":
        case "filterUser":
        case "filterType":
        case "filterStatus":
        case "filterDefault":
        case "sortField":
        case "dateFrom":
        case "dateTo":
          newFilters[key as keyof AccountFilters] = value as any;
          break;
        case "sortDirection":
          newFilters.sortDirection = value as "asc" | "desc";
          break;
        case "currentPage":
        case "pageSize":
          newFilters[key as keyof AccountFilters] = parseInt(value, 10) as any;
          break;
        case "balanceMin":
        case "balanceMax":
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            newFilters[key as keyof AccountFilters] = numValue as any;
          }
          break;
      }
    });
    
    if (Object.keys(newFilters).length > 0) {
      updateFilters(newFilters);
    }
  }, [updateFilters]);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [
    filters.searchTerm,
    filters.filterUser,
    filters.filterType,
    filters.filterStatus,
    filters.filterDefault,
    filters.sortField,
    filters.sortDirection,
    filters.currentPage,
    filters.pageSize,
    filters.dateFrom,
    filters.dateTo,
    filters.balanceMin,
    filters.balanceMax
  ]);

  return {
    // State
    filters: memoizedFilters,
    
    // Actions
    updateFilters,
    resetFilters,
    updateSearchTerm,
    updateUserFilter,
    updateTypeFilter,
    updateStatusFilter,
    updateDefaultFilter,
    updateSort,
    updatePage,
    updatePageSize,
    updateDateRange,
    updateBalanceRange,
    clearDateFilters,
    clearBalanceFilters,
    
    // Computed values
    hasActiveFilters,
    getActiveFilterCount,
    getFilterSummary,
    validateFilters,
    getQueryString,
    loadFromQueryString
  };
};
