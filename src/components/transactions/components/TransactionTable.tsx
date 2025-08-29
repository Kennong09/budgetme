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
    <div className="card shadow mb-4 transaction-table">
      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
          Transaction List
          <div className="ml-2 position-relative">
            <i 
              className="fas fa-info-circle text-gray-400 cursor-pointer" 
              onClick={(e) => onToggleTip('transactionList', e)}
              aria-label="Transaction list information"
            ></i>
          </div>
        </h6>
        <div>
          <button className="btn btn-sm btn-outline-primary">
            <i className="fas fa-download fa-sm mr-1"></i> Export
          </button>
        </div>
      </div>
      
      {/* Table Section */}
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered" width="100%" cellSpacing="0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Account</th>
                <th>Notes</th>
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
                  // Get category info
                  const category = transaction.category_id
                    ? getCategoryName(
                        transaction.category_id,
                        transaction.type,
                        userData
                      )
                    : null;
                  const account = getAccountName(
                    transaction.account_id,
                    userData
                  );

                  return (
                    <tr
                      key={transaction.id}
                      className={
                        transaction.type === "income"
                          ? "table-success"
                          : "table-danger"
                      }
                    >
                      <td>{formatDate(transaction.date)}</td>
                      <td>{category || "Uncategorized"}</td>
                      <td>{account || "Unknown Account"}</td>
                      <td>{transaction.notes}</td>
                      <td
                        className={
                          transaction.type === "income"
                            ? "text-success font-weight-bold"
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
    </div>
  );
};

export default TransactionTable;