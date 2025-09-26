import React, { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { Transaction } from "../../types";

interface Category {
  id: string | number;
  category_name: string;
  icon?: string;
}

interface Account {
  id: string | number;
  account_name: string;
  account_type: string;
  balance?: number; // Optional for compatibility
}

interface Goal {
  id: string | number;
  goal_name: string;
  current_amount: number;
  target_amount: number;
}

interface UserData {
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  goals: Goal[];
  transactions: Transaction[];
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories?: Category[];
  accounts?: Account[];
  goals?: Goal[];
  userData?: UserData;
}

const RecentTransactions: FC<RecentTransactionsProps> = ({ 
  transactions,
  categories = [],
  accounts = [],
  goals = [],
  userData
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

  // Get proper category name using the same logic as TransactionTable
  const getTransactionCategoryName = (transaction: Transaction): string => {
    // Debug logging to understand what data we're getting
    console.log('RecentTransactions Debug:', {
      transactionId: transaction.id,
      transactionType: transaction.type,
      categoryId: transaction.category_id,
      userData: {
        hasIncomeCategories: userData?.incomeCategories?.length || 0,
        hasExpenseCategories: userData?.expenseCategories?.length || 0,
        incomeCategories: userData?.incomeCategories?.map(c => ({ id: c.id, name: c.category_name })),
        expenseCategories: userData?.expenseCategories?.map(c => ({ id: c.id, name: c.category_name }))
      }
    });
    
    // Handle goal contributions first
    if (transaction.goal_id) {
      return "Goal Contribution";
    }
    
    // Handle transfer type
    if (transaction.type === "transfer") {
      return "Transfer";
    }
    
    // Handle contribution type (legacy) 
    if (transaction.type === "contribution") {
      return "Goal Contribution";
    }
    
    // Get category info with proper handling of uncategorized transactions
    let categoryName = "Uncategorized";
    if (transaction.category_id && userData) {
      const categoryIdStr = transaction.category_id.toString();
      
      // For income transactions, check income categories
      if (transaction.type === "income") {
        const category = userData.incomeCategories.find(c => c.id.toString() === categoryIdStr);
        if (category) {
          categoryName = category.category_name;
          console.log('Found income category:', category.category_name);
        } else {
          console.log('Income category not found for ID:', categoryIdStr);
        }
      } else {
        // For expense and contribution transactions, check expense categories
        const category = userData.expenseCategories.find(c => c.id.toString() === categoryIdStr);
        if (category) {
          categoryName = category.category_name;
          console.log('Found expense category:', category.category_name);
        } else {
          console.log('Expense category not found for ID:', categoryIdStr);
        }
      }
    } else {
      console.log('No category_id or userData available');
    }
    
    return categoryName;
  };

  // Get proper account name using the same logic as TransactionTable
  const getTransactionAccountName = (accountId: string | number): string => {
    if (!userData) {
      // Fallback to the old logic if userData is not available
      const accountIdStr = accountId.toString();
      const account = accounts.find(acc => acc.id.toString() === accountIdStr);
      return account ? account.account_name : "Unknown Account";
    }
    
    // Get account from userData similar to TransactionTable
    const accountIdStr = accountId.toString();
    const account = userData.accounts.find(a => a.id.toString() === accountIdStr);
    return account ? account.account_name : "Unknown Account";
  };

  // Get goal name from goal_id
  const getGoalName = (goalId?: string | number): string => {
    if (!goalId) return "Unknown Goal";
    const goalIdStr = goalId.toString();
    const goal = goals.find(g => g.id.toString() === goalIdStr);
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
        // Get category name for this transaction using the proper utility function
        const categoryName = getTransactionCategoryName(transaction);

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
            return transaction.description || `Contribution to ${getGoalName(transaction.goal_id)}`;
          }
          
          if (transaction.description) {
            return transaction.description;
          }
          
          // Fallback to notes if description is not available
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
                {transaction.account_id ? ` • ${getTransactionAccountName(transaction.account_id)}` : ''}
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
