import React, { FC } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { getCategoryById, getAccountById } from "../../data/mockData";
import { Transaction } from "../../types";
import "animate.css";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

interface Category {
  id: number;
  category_name: string;
  icon: string;
  is_default: boolean;
}

interface Account {
  id: number;
  account_name: string;
  account_type: string;
  balance: number;
}

interface ExtendedTransaction extends Transaction {
  // Already defined in Transaction
}

const RecentTransactions: FC<RecentTransactionsProps> = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <i className="fas fa-receipt text-gray-400 text-4xl mb-3"></i>
        <p className="text-gray-500">No recent transactions.</p>
      </div>
    );
  }

  // Map from category icons in mockData to Font Awesome icons
  const iconMap: Record<string, string> = {
    'home': 'fa-home',
    'zap': 'fa-bolt',
    'shopping-cart': 'fa-shopping-cart',
    'truck': 'fa-truck',
    'coffee': 'fa-coffee',
    'film': 'fa-film',
    'activity': 'fa-heartbeat',
    'book': 'fa-book',
    'shopping-bag': 'fa-shopping-bag',
    'user': 'fa-user',
    'map': 'fa-map-marker-alt',
    'repeat': 'fa-sync',
    'more-horizontal': 'fa-ellipsis-h',
    'cash': 'fa-money-bill-alt',
    'briefcase': 'fa-briefcase',
    'trending-up': 'fa-chart-line',
    'gift': 'fa-gift',
    'plus-circle': 'fa-plus-circle'
  };

  return (
    <div className="transaction-list">
      {transactions.map((transaction, index) => {
        const extendedTransaction = transaction as ExtendedTransaction;
        const category = getCategoryById(
          transaction.category_id,
          transaction.type
        ) as Category | null;
        const account = extendedTransaction.account_id
          ? (getAccountById(extendedTransaction.account_id) as Account | null)
          : null;

        // Helper function to get the appropriate icon for the transaction
        const getTransactionIcon = (): string => {
          if (category && category.icon) {
            return iconMap[category.icon] || 'fa-tag';
          }

          // Default icons if no category or icon not mapped
          if (transaction.type === "income") {
            return "fa-arrow-up";
          } else {
            return "fa-arrow-down";
          }
        };

        // Handle special case of very large transactions - flag them
        const isUnusuallyLarge = transaction.amount > 10000;

        // Get transaction description
        const getTransactionDescription = (): string => {
          if (transaction.notes) {
            return transaction.notes;
          }
          
          if (category) {
            return transaction.type === "income"
              ? `Income: ${category.category_name}`
              : `Expense: ${category.category_name}`;
          }
          
          return transaction.type === "income" ? "Income" : "Expense";
        };

        return (
          <Link
            key={transaction.id}
            to={`/transactions/${transaction.id}`}
            className={`transaction-item animate__animated animate__fadeIn ${isUnusuallyLarge ? 'border-warning-color border-2' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`transaction-icon ${transaction.type}`}>
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
                {category ? category.category_name : "Uncategorized"} •{" "}
                {account ? account.account_name : "Unknown Account"}
              </div>
            </div>

            <div className={`transaction-amount ${transaction.type}`}>
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
