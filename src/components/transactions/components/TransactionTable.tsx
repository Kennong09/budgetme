import { FC, memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TransactionTableProps } from '../types';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { getCategoryName, getAccountName } from '../utils';

const TransactionTable: FC<TransactionTableProps> = memo(({
  filteredTransactions,
  userData,
  isFiltering,
  onDeleteTransaction,
  currentPage,
  pageSize,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange
}) => {
  // Mobile dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const toggleDropdown = (transactionId: string) => {
    setActiveDropdown(activeDropdown === transactionId ? null : transactionId);
  };
  
  const closeDropdown = () => {
    setActiveDropdown(null);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        closeDropdown();
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeDropdown]);
  return (
    <>
      {/* Mobile Transaction List - Card-based design */}
      <div className="block md:hidden">
        <div className="px-3 py-2">
          {isFiltering ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-gray-500">Filtering transactions...</p>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-2">
              {filteredTransactions.map((transaction, index) => {
                let categoryName = "Uncategorized";
                if (transaction.category_id) {
                  categoryName = getCategoryName(
                    transaction.category_id,
                    transaction.type === 'contribution' ? 'expense' : transaction.type,
                    userData
                  );
                }
                if (transaction.type === 'contribution') {
                  categoryName = transaction.goal_id ? 'Goal Contribution' : 'Contribution';
                }

                return (
                  <div
                    key={transaction.id}
                    className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate__animated animate__fadeIn relative"
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    {/* Header Row */}
                    <div className="flex items-start gap-2.5 mb-2">
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        transaction.type === 'income' ? 'bg-emerald-100' :
                        transaction.type === 'contribution' ? 'bg-blue-100' : 'bg-rose-100'
                      }`}>
                        <i className={`fas ${
                          transaction.type === 'income' ? 'fa-arrow-up text-emerald-500' :
                          transaction.type === 'contribution' ? 'fa-flag text-blue-500' : 'fa-arrow-down text-rose-500'
                        } text-sm`}></i>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
                            {transaction.description || categoryName}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${
                              transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' :
                              transaction.type === 'contribution' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {transaction.type === 'income' ? 'IN' : transaction.type === 'contribution' ? 'CON' : 'OUT'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Amount */}
                        <p className={`text-sm font-bold mb-1 ${
                          transaction.type === 'income' ? 'text-emerald-600' :
                          transaction.type === 'contribution' ? 'text-blue-600' : 'text-rose-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        
                        {/* Category badge */}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          categoryName === 'Uncategorized' ? 'bg-amber-100 text-amber-700' :
                          transaction.type === 'income' ? 'bg-emerald-50 text-emerald-600' :
                          transaction.type === 'contribution' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {categoryName.length > 15 ? categoryName.substring(0, 15) + '...' : categoryName}
                        </span>
                      </div>

                      {/* Action Dropdown - 3 Dots Button */}
                      <div className="relative flex-shrink-0">
                        <button 
                          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleDropdown(transaction.id); }}
                          onTouchEnd={(e) => { e.stopPropagation(); toggleDropdown(transaction.id); }}
                          aria-label="More actions"
                        >
                          <i className="fas fa-ellipsis-v text-[10px]"></i>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeDropdown === transaction.id && (
                          <div 
                            className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                            style={{ display: 'block', zIndex: 9999, transform: 'translateX(-84px) translateY(4px)' }}
                          >
                            <Link 
                              to={`/transactions/${transaction.id}`} 
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); }}
                            >
                              <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                              <span className="text-gray-700">View</span>
                            </Link>
                            <Link 
                              to={`/transactions/${transaction.id}/edit`} 
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); }}
                            >
                              <i className="fas fa-edit text-gray-500 text-[10px]"></i>
                              <span className="text-gray-700">Edit</span>
                            </Link>
                            <div className="border-t border-gray-200"></div>
                            <button 
                              className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); onDeleteTransaction(transaction.id); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onDeleteTransaction(transaction.id); }}
                            >
                              <i className="fas fa-trash text-red-500 text-[10px]"></i>
                              <span className="text-red-600">Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Info Row */}
                    <div className="mt-2 pt-2 border-t border-gray-50 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-[8px] text-gray-400 uppercase tracking-wide mb-0.5">Account</p>
                        <p className="text-[9px] font-medium text-gray-600 truncate">
                          {getAccountName(transaction.account_id, userData) || 'N/A'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
                        <p className="text-[9px] font-medium text-gray-600">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] text-gray-400 uppercase tracking-wide mb-0.5">Type</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' :
                          transaction.type === 'contribution' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-filter text-gray-400 text-lg"></i>
              </div>
              <p className="text-xs text-gray-600 font-medium mb-1">No transactions found</p>
              <p className="text-[10px] text-gray-400 mb-3">Try adjusting your filters</p>
              <Link 
                to="/transactions/add" 
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[11px] font-medium rounded-lg"
              >
                <i className="fas fa-plus text-[9px]"></i>
                Add Transaction
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500">
                {startIndex + 1}-{endIndex} of {totalItems}
              </span>
              <select 
                className="text-[10px] px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-600"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
            <div className="flex items-center justify-center gap-1">
              <button 
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50"
              >
                <i className="fas fa-chevron-left text-[10px]"></i>
              </button>
              
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button 
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50"
              >
                <i className="fas fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Transaction Table - Original style */}
      <div className="desktop-table-section card-body">
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
                  let categoryName = "Uncategorized";
                  if (transaction.category_id) {
                    categoryName = getCategoryName(
                      transaction.category_id,
                      transaction.type === 'contribution' ? 'expense' : transaction.type,
                      userData
                    );
                  }
                  if (transaction.type === 'contribution') {
                    categoryName = transaction.goal_id ? `Goal Contribution` : 'Contribution';
                  }
                  
                  const account = getAccountName(transaction.account_id, userData);
                  const displayDescription = transaction.description && transaction.description.trim() 
                    ? transaction.description 
                    : <span className="text-muted font-italic">No description</span>;

                  return (
                    <tr
                      key={transaction.id}
                      className={
                        transaction.type === "income" ? "table-success" :
                        transaction.type === "contribution" ? "table-info" : "table-danger"
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
                          <span className="badge badge-light">{categoryName}</span>
                        )}
                      </td>
                      <td>{account || "Unknown Account"}</td>
                      <td>{displayDescription}</td>
                      <td className={
                        transaction.type === "income" ? "text-success font-weight-bold" :
                        transaction.type === "contribution" ? "text-info font-weight-bold" : "text-danger font-weight-bold"
                      }>
                        {transaction.type === "income" ? "+ " : "- "}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td>
                        <div className="d-flex justify-content-center align-items-center gap-1">
                          <Link
                            to={`/transactions/${transaction.id}`}
                            className="inline-flex items-center justify-center w-9 h-9 bg-[#36b9cc] hover:bg-[#2c9faf] text-white rounded-full shadow-sm transition-colors"
                            title="View Details"
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </Link>
                          <Link
                            to={`/transactions/${transaction.id}/edit`}
                            className="inline-flex items-center justify-center w-9 h-9 bg-[#4e73df] hover:bg-[#2e59d9] text-white rounded-full shadow-sm transition-colors"
                            title="Edit Transaction"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </Link>
                          <button
                            className="inline-flex items-center justify-center w-9 h-9 bg-[#e74a3b] hover:bg-[#d52a1a] text-white rounded-full shadow-sm transition-colors"
                            onClick={() => onDeleteTransaction(transaction.id)}
                            title="Delete Transaction"
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <i className="fas fa-filter fa-2x text-gray-300 mb-3 d-block"></i>
                    <p className="text-gray-500 mb-2">No transactions found matching your filters.</p>
                    <p className="text-gray-400 text-sm">Try adjusting your search criteria or clear filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <div className="card-footer bg-white border-0">
            <div className="row align-items-center">
              <div className="col-md-4 text-center text-md-start mb-2 mb-md-0">
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                  Showing {Math.min(startIndex + 1, totalItems)} to {endIndex} of {totalItems} entries
                </span>
              </div>
              
              <div className="col-md-4 text-center mb-2 mb-md-0">
                <label className="me-2 mb-0" style={{ fontSize: '0.875rem' }}>Show</label>
                <select 
                  className="form-select d-inline-block w-auto"
                  style={{ fontSize: '0.875rem' }}
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <label className="ms-2 mb-0" style={{ fontSize: '0.875rem' }}>per page</label>
              </div>
              
              <div className="col-md-4 text-center text-md-end">
                <nav>
                  <ul className="pagination mb-0 justify-content-center justify-content-md-end">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                        <i className="fas fa-chevron-left"></i>
                      </button>
                    </li>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => onPageChange(pageNum)}
                            style={currentPage === pageNum ? { color: 'white' } : {}}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for desktop-only section */}
      <style>{`
        .desktop-table-section { display: none; }
        @media (min-width: 768px) {
          .desktop-table-section { display: block; }
        }
      `}</style>
    </>
  );
});

TransactionTable.displayName = 'TransactionTable';

export default TransactionTable;
