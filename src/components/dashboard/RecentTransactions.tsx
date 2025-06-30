import React, { FC, useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { supabase } from "../../utils/supabaseClient";

// Define the Transaction type to match the one in Transactions.tsx
interface Transaction {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  notes: string;
  type: "income" | "expense" | "transfer" | "contribution";
  category_id?: string;
  account_id: string;
  goal_id?: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  category_name: string;
  icon?: string;
}

interface Account {
  id: string;
  account_name: string;
  account_type: string;
}

interface Goal {
  id: string;
  goal_name: string;
  current_amount: number;
  target_amount: number;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories?: Category[];
  accounts?: Account[];
  goals?: Goal[];
}

const RecentTransactions: FC<RecentTransactionsProps> = ({ 
  transactions,
  categories = [],
  accounts = [],
  goals = []
}) => {
  // Sort transactions by date (newest first)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions]);

  if (!sortedTransactions || sortedTransactions.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="mb-3">
          <i className="fas fa-receipt fa-3x text-gray-300"></i>
        </div>
        <h5 className="text-gray-700 mb-2">No Transactions Yet</h5>
        <p className="text-gray-500 mb-4">Start tracking your income and expenses to see your recent transactions here.</p>
        <Link to="/transactions/add" className="btn btn-primary btn-sm shadow-sm">
          <i className="fas fa-plus fa-sm mr-2"></i>Add Your First Transaction
        </Link>
      </div>
    );
  }

  // Get category name from category_id
  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return "Uncategorized";
    
    // First check in expense categories
    if (categories) {
      const expenseCategory = categories.find(cat => cat.id === categoryId);
      if (expenseCategory) return expenseCategory.category_name;
    }
    
    // If not found and we have income categories, check there
    // Note: In the Dashboard, we're only passing expenseCategories currently,
    // but this makes the function more robust if that changes
    return "Uncategorized";
  };

  // Get account name from account_id
  const getAccountName = (accountId: string): string => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.account_name : "Unknown Account";
  };

  // Get goal name from goal_id
  const getGoalName = (goalId?: string): string => {
    if (!goalId) return "Unknown Goal";
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.goal_name : "Unknown Goal";
  };

  // Map common category names to Font Awesome icons
  const getIconForCategory = (categoryName: string): string => {
    const iconMap: Record<string, string> = {
      'Housing': 'fa-home',
      'Utilities': 'fa-bolt',
      'Groceries': 'fa-shopping-cart',
      'Transportation': 'fa-truck',
      'Dining Out': 'fa-coffee',
      'Entertainment': 'fa-film',
      'Healthcare': 'fa-heartbeat',
      'Education': 'fa-book',
      'Shopping': 'fa-shopping-bag',
      'Personal Care': 'fa-user',
      'Travel': 'fa-map-marker-alt',
      'Subscriptions': 'fa-sync',
      'Contribution': 'fa-piggy-bank',
      'Goal Contribution': 'fa-piggy-bank',
      'Other Expenses': 'fa-ellipsis-h',
      'Salary': 'fa-money-bill-alt',
      'Freelance': 'fa-briefcase',
      'Investments': 'fa-chart-line',
      'Gifts': 'fa-gift',
      'Other Income': 'fa-plus-circle'
    };
    
    return iconMap[categoryName] || 'fa-tag';
  };

  return (
    <div className="transaction-list">
      {sortedTransactions.map((transaction, index) => {
        // Get category name for this transaction
        const categoryName = transaction.goal_id 
          ? "Goal Contribution" 
          : getCategoryName(transaction.category_id);

        // Helper function to get the appropriate icon for the transaction
        const getTransactionIcon = (): string => {
          // If it's a goal contribution, use the piggy bank icon
          if (transaction.goal_id) {
            return 'fa-piggy-bank';
          }
          return getIconForCategory(categoryName);
        };

        // Handle special case of very large transactions - flag them
        const isUnusuallyLarge = transaction.amount > 10000;

        // Get transaction description
        const getTransactionDescription = (): string => {
          // Check if it's a goal contribution first
          if (transaction.goal_id) {
            return transaction.notes || `Contribution to ${getGoalName(transaction.goal_id)}`;
          }
          
          if (transaction.notes) {
            return transaction.notes;
          }
          
          if (categoryName === 'Contribution') {
            return "Goal Contribution";
          }
          
          return transaction.type === "income"
            ? `Income: ${categoryName}`
            : `Expense: ${categoryName}`;
        };

        // Get transaction type CSS class
        const getTypeClass = (): string => {
          switch(transaction.type) {
            case "income": return "income";
            case "expense": return "expense";
            case "transfer": return "transfer";
            case "contribution": return "contribution";
            default: return "expense";
          }
        };

        return (
          <Link
            key={transaction.id}
            to={`/transactions/${transaction.id}`}
            className={`transaction-item animate__animated animate__fadeIn ${isUnusuallyLarge ? 'border-warning-color border-2' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`transaction-icon ${getTypeClass()}`}>
              <i className={`fas ${getTransactionIcon()}`}></i>
            </div>

            <div className="transaction-details">
              <div className="transaction-title">
                {getTransactionDescription()}
                {isUnusuallyLarge && 
                  <span className="text-warning-color ml-2">
                    <i className="fas fa-exclamation-triangle" title="Unusually large transaction"></i>
                  </span>
                }
              </div>
              <div className="transaction-category">
                {categoryName}
                {transaction.account_id ? ` • ${getAccountName(transaction.account_id)}` : ''}
              </div>
            </div>

            <div className={`transaction-amount ${getTypeClass()}`}>
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </div>

            <div className="transaction-date">
              <i className="fas fa-calendar-alt text-muted mr-1"></i>
              {formatDate(transaction.date)}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default RecentTransactions;
