import { useState, useCallback } from "react";
import { PredictionFilters } from "./types";

// Default filter state
const defaultFilters: PredictionFilters = {
  searchTerm: "",
  filterStatus: "all",
  filterType: "all",
  sortField: "username",
  sortDirection: "asc",
  currentPage: 1,
  pageSize: 10
};

export const usePredictionFilters = () => {
  const [filters, setFilters] = useState<PredictionFilters>(defaultFilters);

  // Update filters function
  const updateFilters = useCallback((newFilters: Partial<PredictionFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset to first page when changing search/filter criteria
      currentPage: (newFilters.searchTerm !== undefined || 
                   newFilters.filterStatus !== undefined || 
                   newFilters.filterType !== undefined) ? 1 : (newFilters.currentPage || prev.currentPage)
    }));
  }, []);

  // Reset filters function
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Handle search term change
  const handleSearch = useCallback((searchTerm: string) => {
    updateFilters({ searchTerm, currentPage: 1 });
  }, [updateFilters]);

  // Handle status filter change
  const handleStatusFilter = useCallback((filterStatus: string) => {
    updateFilters({ filterStatus, currentPage: 1 });
  }, [updateFilters]);

  // Handle type filter change
  const handleTypeFilter = useCallback((filterType: string) => {
    updateFilters({ filterType, currentPage: 1 });
  }, [updateFilters]);

  // Handle sort change
  const handleSort = useCallback((sortField: string, sortDirection?: "asc" | "desc") => {
    const newDirection = sortDirection || (filters.sortField === sortField && filters.sortDirection === 'asc' ? 'desc' : 'asc');
    updateFilters({ sortField, sortDirection: newDirection });
  }, [filters.sortField, filters.sortDirection, updateFilters]);

  // Handle page change
  const handlePageChange = useCallback((currentPage: number) => {
    updateFilters({ currentPage });
  }, [updateFilters]);

  // Handle page size change
  const handlePageSizeChange = useCallback((pageSize: number) => {
    updateFilters({ pageSize, currentPage: 1 });
  }, [updateFilters]);

  // Check if filters are active (not default)
  const hasActiveFilters = useCallback(() => {
    return filters.searchTerm !== "" || 
           filters.filterStatus !== "all" || 
           filters.filterType !== "all";
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    handleSearch,
    handleStatusFilter,
    handleTypeFilter,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    hasActiveFilters
  };
};
