import React from 'react';
import { Link } from 'react-router-dom';
import { TransactionTableProps } from '../types';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { getCategoryName, getAccountName } from '../utils';

const TransactionTable: React.FC<TransactionTableProps> = ({
  filteredTransactions,
  userData,
  isFiltering,
  onToggleTip,
  onDeleteTransaction
}) => {
  return (
    <div className="card-body">
      <div className="table-responsive">
        <table className="table table-bordered" width="100%" cellSpacing="0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Account</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isFiltering ? (
              <tr>
                <td colSpan={6} className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                  <p className="text-gray-600 mt-3">Filtering transactions...</p>
                </td>
              </tr>
            ) : filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => {
                // Get category info with proper handling of uncategorized transactions
                let categoryName = "Uncategorized";
                if (transaction.category_id) {
                  categoryName = getCategoryName(
                    transaction.category_id,
                    transaction.type === 'contribution' ? 'expense' : transaction.type, // Map contribution to expense for category lookup
                    userData
                  );
                }
                
                // Special handling for contribution transactions
                if (transaction.type === 'contribution') {
                  categoryName = transaction.goal_id ? `Goal Contribution` : 'Contribution';
                }
                
                const account = getAccountName(
                  transaction.account_id,
                  userData
                );

                // Handle description display with proper null/undefined checks
                const displayDescription = transaction.description && transaction.description.trim() 
                  ? transaction.description 
                  : <span className="text-muted font-italic">No description</span>;

                return (
                  <tr
                    key={transaction.id}
                    className={
                      transaction.type === "income"
                        ? "table-success"
                        : transaction.type === "contribution"
                        ? "table-info"
                        : "table-danger"
                    }
                  >
                    <td>{formatDate(transaction.date)}</td>
                    <td>
                      {categoryName === "Uncategorized" ? (
                        <span className="badge badge-warning">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          Uncategorized
                        </span>
                      ) : transaction.type === 'contribution' ? (
                        <span className="badge badge-info">
                          <i className="fas fa-flag mr-1"></i>
                          {categoryName}
                        </span>
                      ) : (
                        <span className="badge badge-light">
                          {categoryName}
                        </span>
                      )}
                    </td>
                    <td>{account || "Unknown Account"}</td>
                    <td>{displayDescription}</td>
                    <td
                      className={
                        transaction.type === "income"
                          ? "text-success font-weight-bold"
                          : transaction.type === "contribution"
                          ? "text-info font-weight-bold"
                          : "text-danger font-weight-bold"
                      }
                    >
                      {transaction.type === "income" ? "+ " : "- "}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <div className="d-flex justify-content-center align-items-center">
                        <Link
                          to={`/transactions/${transaction.id}`}
                          className="btn btn-info btn-circle btn-sm mx-1"
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Link>
                        <Link
                          to={`/transactions/${transaction.id}/edit`}
                          className="btn btn-primary btn-circle btn-sm mx-1"
                          title="Edit Transaction"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          className="btn btn-danger btn-circle btn-sm mx-1"
                          onClick={() => onDeleteTransaction(transaction.id)}
                          title="Delete Transaction"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  <i className="fas fa-filter fa-2x text-gray-300 mb-3 d-block"></i>
                  <p className="text-gray-500">No transactions found matching your filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;