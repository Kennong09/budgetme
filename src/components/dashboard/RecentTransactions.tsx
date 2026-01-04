import { FC, memo, useMemo, useCallback } from "react";
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

const RecentTransactions: FC<RecentTransactionsProps> = memo(({ 
  transactions,
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
      <div className="text-center py-3 md:py-5">
        <div className="mb-1.5 md:mb-3">
          <i className="fas fa-receipt text-xl md:text-3xl text-gray-300"></i>
        </div>
        <h5 className="text-gray-700 mb-1.5 text-sm md:text-lg font-semibold">No Transactions Yet</h5>
        <p className="text-gray-500 mb-2 md:mb-4 text-xs hidden md:block">Start tracking your income and expenses to see your recent transactions here.</p>
        <Link 
          to="/transactions/add" 
          className="inline-block w-auto px-2 md:px-3 py-1.5 md:py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-xs md:text-sm font-normal rounded shadow-sm transition-colors"
        >
          <i className="fas fa-plus text-xs mr-1 md:mr-2"></i>
          <span className="hidden md:inline">Add Your First </span>Transaction
        </Link>
      </div>
    );
  }

  // Memoize icon mapping for better performance
  const iconMap = useMemo<Record<string, string>>(() => ({
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
  }), []);

  // Get proper category name using the same logic as TransactionTable
  const getTransactionCategoryName = useCallback((transaction: Transaction): string => {
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
        }
      } else {
        // For expense and contribution transactions, check expense categories
        const category = userData.expenseCategories.find(c => c.id.toString() === categoryIdStr);
        if (category) {
          categoryName = category.category_name;
        }
      }
    }
    
    return categoryName;
  }, [userData]);

  // Get proper account name using the same logic as TransactionTable
  const getTransactionAccountName = useCallback((accountId: string | number): string => {
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
  }, [userData, accounts]);

  // Get goal name from goal_id
  const getGoalName = useCallback((goalId?: string | number): string => {
    if (!goalId) return "Unknown Goal";
    const goalIdStr = goalId.toString();
    const goal = goals.find(g => g.id.toString() === goalIdStr);
    return goal ? goal.goal_name : "Unknown Goal";
  }, [goals]);

  // Map common category names to Font Awesome icons - using memoized iconMap
  const getIconForCategory = useCallback((categoryName: string): string => {
    return iconMap[categoryName] || 'fa-tag';
  }, [iconMap]);

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
            className={`transaction-item animate__animated animate__fadeIn py-2 md:py-3 px-2 md:px-3 ${isUnusuallyLarge ? 'border-warning-color border-2' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`transaction-icon ${getTypeClass()} w-7 h-7 md:w-10 md:h-10 text-xs md:text-sm`}>
              <i className={`fas ${getTransactionIcon()}`}></i>
            </div>

            <div className="transaction-details flex-1 min-w-0 ml-2 md:ml-3">
              <div className="transaction-title text-[11px] md:text-sm truncate">
                {getTransactionDescription()}
                {isUnusuallyLarge && 
                  <span className="text-warning-color ml-1 md:ml-2 hidden md:inline">
                    <i className="fas fa-exclamation-triangle" title="Unusually large transaction"></i>
                  </span>
                }
              </div>
              <div className="transaction-category text-[9px] md:text-xs truncate">
                {categoryName}
                {transaction.account_id ? (
                  <span className="hidden md:inline"> • {getTransactionAccountName(transaction.account_id)}</span>
                ) : ''}
              </div>
            </div>

            <div className={`transaction-amount ${getTypeClass()} text-[11px] md:text-sm font-semibold`}>
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </div>

            <div className="transaction-date hidden md:flex text-xs text-gray-500 ml-3">
              <i className="fas fa-calendar-alt text-muted mr-1"></i>
              {formatDate(transaction.date)}
            </div>
          </Link>
        );
      })}

      {/* View All Transactions Button - Hidden on mobile since it's in the tabbed header */}
      <div className="text-center mt-4 py-3 hidden md:block">
        <Link
          to="/transactions"
          className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
        >
          View All Transactions
        </Link>
      </div>
    </div>
  );
});

RecentTransactions.displayName = 'RecentTransactions';

export default RecentTransactions;
