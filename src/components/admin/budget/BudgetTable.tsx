import React, { FC } from "react";
import { Budget, BudgetFilters } from "./types";

interface BudgetTableProps {
  budgets: Budget[];
  filters: BudgetFilters;
  totalPages: number;
  totalItems: number;
  loading?: boolean;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onBudgetSelect: (budget: Budget) => void;
}

const BudgetTable: FC<BudgetTableProps> = ({
  budgets,
  filters,
  totalPages,
  totalItems,
  loading = false,
  onSort,
  onPageChange,
  onBudgetSelect
}) => {
  const { currentPage, pageSize, sortField, sortDirection } = filters;
  const ITEMS_PER_PAGE = pageSize;

  const handleSort = (field: string) => {
    onSort(field);
  };

  const getSortIcon = (field: string, dbField: string) => {
    if (sortField === dbField) {
      return (
        <i className={`ml-1 fas fa-sort-${sortDirection === "asc" ? "up" : "down"}`}></i>
      );
    }
    return null;
  };

  const getProgressBarClass = (percentage: number) => {
    if (percentage >= 90) return "bg-danger";
    if (percentage >= 70) return "bg-warning";
    if (percentage >= 50) return "bg-info";
    return "bg-success";
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "active": return "badge-primary";
      case "completed": return "badge-success";
      default: return "badge-secondary";
    }
  };

  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3 admin-card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-danger d-flex align-items-center">
            All Budgets 
            {loading && (
              <span className="ml-2">
                <i className="fas fa-spinner fa-spin fa-sm"></i>
              </span>
            )}
          </h6>
        </div>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered admin-table" width="100%" cellSpacing="0">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                  Budget Name
                  {getSortIcon("name", "category_id")}
                </th>
                <th onClick={() => handleSort("user_name")} style={{ cursor: "pointer" }}>
                  User
                  {getSortIcon("user_name", "user_id")}
                </th>
                <th onClick={() => handleSort("category")} style={{ cursor: "pointer" }}>
                  Category
                  {getSortIcon("category", "category_id")}
                </th>
                <th onClick={() => handleSort("amount")} style={{ cursor: "pointer" }}>
                  Amount
                  {getSortIcon("amount", "amount")}
                </th>
                <th onClick={() => handleSort("spent")} style={{ cursor: "pointer" }}>
                  Spent
                  {getSortIcon("spent", "amount")}
                </th>
                <th>Progress</th>
                <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                  Status
                  {getSortIcon("status", "end_date")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    {loading ? "Loading budgets..." : "No budgets found matching your search criteria"}
                  </td>
                </tr>
              ) : (
                budgets.map(budget => {
                  const percentage = Math.round((budget.spent / budget.amount) * 100);
                  const progressClass = getProgressBarClass(percentage);
                  
                  return (
                    <tr key={budget.id}>
                      <td>{budget.name}</td>
                      <td>{budget.user_name}</td>
                      <td>{budget.category}</td>
                      <td>${budget.amount.toLocaleString()}</td>
                      <td>${budget.spent.toLocaleString()}</td>
                      <td>
                        <div className="progress">
                          <div
                            className={`progress-bar ${progressClass}`}
                            role="progressbar"
                            style={{ width: `${percentage}%` }}
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getBadgeClass(budget.status)}`}>
                          {budget.status}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group admin-actions">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => onBudgetSelect(budget)}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-warning"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              <span className="text-muted">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of{" "}
                {totalItems} entries
              </span>
            </div>
            <nav>
              <ul className="pagination admin-pagination">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                </li>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                  let pageNumber: number;
                  if (totalPages <= 5) {
                    pageNumber = index + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + index;
                  } else {
                    pageNumber = currentPage - 2 + index;
                  }
                  
                  if (pageNumber <= totalPages) {
                    return (
                      <li
                        key={index}
                        className={`page-item ${pageNumber === currentPage ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => onPageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    );
                  }
                  return null;
                })}
                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetTable;