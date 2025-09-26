import { useState, useCallback } from "react";
import { BudgetFilters } from "./types";

export const useBudgetFilters = (initialFilters?: Partial<BudgetFilters>) => {
  const [filters, setFilters] = useState<BudgetFilters>({
    searchTerm: "",
    filterCategory: "all",
    filterStatus: "all",
    sortField: "created_at",
    sortDirection: "desc",
    currentPage: 1,
    pageSize: 5,
    ...initialFilters
  });

  const updateFilters = useCallback((newFilters: Partial<BudgetFilters>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  }, []);

  const handleSort = useCallback((field: string) => {
    // Map display fields to actual database columns
    const fieldMapping: {[key: string]: string} = {
      "name": "category_id",
      "user_name": "user_id",
      "category": "category_id",
      "amount": "amount",
      "spent": "amount",
      "status": "end_date",
      "created_at": "created_at"
    };
    
    const dbField = fieldMapping[field] || field;
    
    setFilters(prevFilters => ({
      ...prevFilters,
      sortField: dbField === prevFilters.sortField ? prevFilters.sortField : dbField,
      sortDirection: dbField === prevFilters.sortField 
        ? (prevFilters.sortDirection === "asc" ? "desc" : "asc")
        : "asc"
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      currentPage: page
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchTerm: "",
      filterCategory: "all",
      filterStatus: "all",
      sortField: "created_at",
      sortDirection: "desc",
      currentPage: 1,
      pageSize: 5
    });
  }, []);

  return {
    filters,
    updateFilters,
    handleSort,
    handlePageChange,
    resetFilters
  };
};