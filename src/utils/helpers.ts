// Helper functions for the BudgetMe app

import { Transaction, Goal } from "../types";
import { currencySymbols } from "./CurrencyContext";
import { supabase } from "./supabaseClient";

// Format currency - FORCED TO PHP ONLY
// All currencies are now displayed as Philippine Pesos (₱)
export const formatCurrency = (amount: number): string => {
  // Always format as PHP - no other currency options allowed
  return '₱' + new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date to display in a more readable format
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

// Get current month name and year
export const getCurrentMonthYear = (): string => {
  // Return the actual current month and year
  const date = new Date();
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
};

// Get first and last day of current month
export const getCurrentMonthDates = (): {
  firstDay: string;
  lastDay: string;
} => {
  // Return actual current month dates
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    firstDay: firstDay.toISOString().split("T")[0],
    lastDay: lastDay.toISOString().split("T")[0],
  };
};

// Get first and last day of selected month
export const getMonthDates = (
  year: number,
  month: number
): { firstDay: string; lastDay: string } => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return {
    firstDay: firstDay.toISOString().split("T")[0],
    lastDay: lastDay.toISOString().split("T")[0],
  };
};

// Calculate savings rate (income - expenses) / income
export const calculateSavingsRate = (
  income: number,
  expenses: number
): number => {
  if (income === 0) return 0;
  const savings = income - expenses;
  return (savings / income) * 100;
};

// Generate a random color
export const getRandomColor = (): string => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Sort transactions by date (newest first)
export const sortByDate = (transactions: Transaction[]): Transaction[] => {
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

// Filter transactions by type
export const filterByType = (
  transactions: Transaction[],
  type: "income" | "expense"
): Transaction[] => {
  return transactions.filter((transaction) => transaction.type === type);
};

// Filter transactions by category
export const filterByCategory = (
  transactions: Transaction[],
  categoryId: string
): Transaction[] => {
  return transactions.filter(
    (transaction) => transaction.category === categoryId
  );
};

// Filter transactions by date range
export const filterByDateRange = (
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] => {
  return transactions.filter((transaction) => {
    const txDate = new Date(transaction.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return txDate >= start && txDate <= end;
  });
};

// Calculate remaining days until target date
export const getRemainingDays = (targetDate: string): number => {
  const target = new Date(targetDate);
  const today = new Date();
  const timeDiff = target.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Truncate text if it's too long
export const truncateText = (text: string, maxLength: number = 20): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Calculate monthly savings needed to reach a goal
export const calculateMonthlySavingsForGoal = (goal: {
  target_amount: number;
  current_amount: number;
  target_date: string;
}): number => {
  const targetDate = new Date(goal.target_date);
  const today = new Date();
  const remainingAmount = goal.target_amount - goal.current_amount;

  // If goal is already achieved or overpaid, return 0
  if (remainingAmount <= 0) return 0;

  // Calculate months between today and target date
  const monthsDiff =
    (targetDate.getFullYear() - today.getFullYear()) * 12 +
    (targetDate.getMonth() - today.getMonth());

  // If target date has passed or is current month, return remaining amount
  if (monthsDiff <= 0) return remainingAmount;

  return remainingAmount / monthsDiff;
};

/**
 * Safely refresh the user_family_memberships materialized view
 * Uses the new safe_refresh_family_memberships function that handles errors
 */
export const refreshFamilyMembershipsView = async (): Promise<boolean> => {
  try {
    // Add a small delay before refreshing to avoid conflicts with active queries
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Use our safe refresh function that handles errors internally
    const { error } = await supabase.rpc('safe_refresh_family_memberships');
    
    if (error) {
      console.warn("Error in safe refresh function:", error);
      // Return true anyway since the operation should continue
      return true;
    }
    
    
    return true;
  } catch (refreshError) {
    console.warn("Failed to refresh materialized view (non-critical):", refreshError);
    // This is a non-critical operation, so return true to let the main flow continue
    return true;
  }
};
