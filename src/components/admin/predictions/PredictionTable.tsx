import { FC, useState, useEffect, useRef } from "react";
import { PredictionSummary, PredictionFilters } from "./types";

interface PredictionTableProps {
  predictions: PredictionSummary[];
  filters: PredictionFilters;
  totalPages: number;
  totalItems: number;
  loading?: boolean;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onPredictionSelect: (prediction: PredictionSummary) => void;
  onPredictionDelete: (prediction: PredictionSummary) => void;
}

const PredictionTable: FC<PredictionTableProps> = ({
  predictions,
  filters,
  totalPages,
  totalItems,
  loading = false,
  onSort,
  onPageChange,
  onPredictionSelect,
  onPredictionDelete
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Mobile dropdown functions
  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const toggleDropdown = (predictionId: string) => {
    setActiveDropdown(activeDropdown === predictionId ? null : predictionId);
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
  const getSortIcon = (field: string) => {
    if (filters.sortField !== field) return null;
    return filters.sortDirection === 'asc' ? 
      <i className="fas fa-sort-amount-up ml-1"></i> : 
      <i className="fas fa-sort-amount-down ml-1"></i>;
  };

  const getStatusBadge = (status: string) => {
    const badgeClasses = {
      active: "status-badge status-active",
      pending: "status-badge status-pending",
      error: "status-badge status-error"
    };

    const icons = {
      active: "fa-check-circle",
      pending: "fa-pause-circle",
      error: "fa-times-circle"
    };

    return (
      <span className={badgeClasses[status as keyof typeof badgeClasses] || "status-badge status-pending"}>
        <i className={`fas ${icons[status as keyof typeof icons] || "fa-pause-circle"} mr-1`}></i>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-success";
    if (value < 0) return "text-danger";
    return "text-muted";
  };

  const formatTrend = (value: number) => {
    if (!value || value === 0) return "—";
    return `${value > 0 ? '+' : ''}${(value || 0).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="table-section">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="px-3 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-2 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block">
          <div className="card shadow">
            <div className="card-header bg-white border-0 py-3">
              <div className="skeleton-line skeleton-table-header"></div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover modern-table mb-0">
                  <thead className="table-header">
                    <tr>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <th key={index} className="border-0">
                          <div className="skeleton-line skeleton-th"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        {Array.from({ length: 6 }).map((_, colIndex) => (
                          <td key={colIndex} className="py-3">
                            <div className="skeleton-line skeleton-td"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-section">
      {/* Mobile Prediction Cards */}
      <div className="block md:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-chart-line text-red-500 text-[10px]"></i>
              Predictions
              {totalItems > 0 && (
                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {totalItems}
                </span>
              )}
            </h6>
            <span className="text-[9px] text-gray-400">
              Page {filters.currentPage} of {totalPages || 1}
            </span>
          </div>

          {/* Mobile Prediction List */}
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {predictions.length > 0 ? (
              predictions.map((prediction) => (
                <div 
                  key={prediction.userId} 
                  className="px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => onPredictionSelect(prediction)}
                >
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      {prediction.avatarUrl ? (
                        <img 
                          src={prediction.avatarUrl} 
                          alt={prediction.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm border-2 border-gray-200">
                          {prediction.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        prediction.status === 'active' ? 'bg-emerald-500' : 
                        prediction.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}></div>
                    </div>
                    
                    {/* Prediction Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {prediction.username}
                        </p>
                        <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-semibold ${
                          prediction.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                          prediction.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                          'bg-rose-100 text-rose-600'
                        }`}>
                          {prediction.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        {prediction.predictionCount} predictions
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[10px] font-medium ${
                          prediction.incomeTrend > 0 ? 'text-emerald-600' :
                          prediction.incomeTrend < 0 ? 'text-rose-600' : 'text-gray-400'
                        }`}>
                          <i className={`fas fa-arrow-${prediction.incomeTrend > 0 ? 'up' : prediction.incomeTrend < 0 ? 'down' : 'right'} text-[8px] mr-0.5`}></i>
                          Inc: {formatTrend(prediction.incomeTrend)}
                        </span>
                        <span className={`text-[10px] font-medium ${
                          prediction.savingsTrend > 0 ? 'text-emerald-600' :
                          prediction.savingsTrend < 0 ? 'text-rose-600' : 'text-gray-400'
                        }`}>
                          <i className={`fas fa-arrow-${prediction.savingsTrend > 0 ? 'up' : prediction.savingsTrend < 0 ? 'down' : 'right'} text-[8px] mr-0.5`}></i>
                          Sav: {formatTrend(prediction.savingsTrend)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions - Mobile Dropdown */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="relative">
                        <button
                          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleDropdown(prediction.userId); }}
                          onTouchEnd={(e) => { e.stopPropagation(); toggleDropdown(prediction.userId); }}
                          aria-label="More actions"
                        >
                          <i className="fas fa-ellipsis-v text-[10px]"></i>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeDropdown === prediction.userId && (
                          <div className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={{ display: 'block', zIndex: 9999, transform: 'translateX(-84px) translateY(4px)' }}>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); onPredictionSelect(prediction); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onPredictionSelect(prediction); }}
                            >
                              <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                              <span className="text-gray-700">View</span>
                            </button>
                            <div className="border-t border-gray-200"></div>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); onPredictionDelete(prediction); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onPredictionDelete(prediction); }}
                            >
                              <i className="fas fa-trash text-red-500 text-[10px]"></i>
                              <span className="text-red-600">Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center">
                <i className="fas fa-chart-line text-gray-300 text-2xl mb-2"></i>
                <p className="text-xs text-gray-500 font-medium">No predictions found</p>
                <p className="text-[10px] text-gray-400">Try adjusting your filters</p>
              </div>
            )}
          </div>

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                className="px-2 py-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onPageChange(Math.max(filters.currentPage - 1, 1))}
                disabled={filters.currentPage === 1}
              >
                <i className="fas fa-chevron-left mr-1 text-[8px]"></i>
                Prev
              </button>
              <span className="text-[10px] text-gray-500">
                {filters.currentPage} / {totalPages}
              </span>
              <button
                className="px-2 py-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onPageChange(Math.min(filters.currentPage + 1, totalPages))}
                disabled={filters.currentPage === totalPages}
              >
                Next
                <i className="fas fa-chevron-right ml-1 text-[8px]"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="card shadow">
          <div className="card-header bg-white border-0 py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-danger">
                <i className="fas fa-chart-line mr-2"></i>
                User Predictions ({totalItems})
              </h6>
              <div className="table-actions">
                <small className="text-muted">
                  Showing {Math.min((filters.currentPage - 1) * filters.pageSize + 1, totalItems)} to {Math.min(filters.currentPage * filters.pageSize, totalItems)} of {totalItems} entries
                </small>
              </div>
            </div>
          </div>
          
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover modern-table mb-0">
                <thead className="table-header">
                  <tr>
                    <th 
                      className="border-0 cursor-pointer"
                      onClick={() => onSort('username')}
                    >
                      Username 
                      {getSortIcon('username')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer"
                      onClick={() => onSort('lastPredictionDate')}
                    >
                      Last Updated
                      {getSortIcon('lastPredictionDate')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer"
                      onClick={() => onSort('incomeTrend')}
                    >
                      Income Trend
                      {getSortIcon('incomeTrend')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer"
                      onClick={() => onSort('savingsTrend')}
                    >
                      Savings Trend
                      {getSortIcon('savingsTrend')}
                    </th>
                    <th 
                      className="border-0 cursor-pointer"
                      onClick={() => onSort('status')}
                    >
                      Status
                      {getSortIcon('status')}
                    </th>
                    <th className="border-0 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.length > 0 ? (
                    predictions.map((prediction) => (
                      <tr key={prediction.userId} className="table-row">
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <div className="user-avatar-container mr-3">
                              {prediction.avatarUrl ? (
                                <img 
                                  src={prediction.avatarUrl} 
                                  alt={prediction.username}
                                  className="user-table-avatar rounded-circle"
                                  style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div 
                                  className="user-table-avatar bg-primary text-white d-flex align-items-center justify-content-center rounded-circle"
                                  style={{ width: '40px', height: '40px' }}
                                >
                                  {prediction.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className={`user-status-dot status-${prediction.status}`}></div>
                            </div>
                            <div className="user-info">
                              <div className="user-name font-weight-medium">
                                {prediction.username}
                              </div>
                              <div className="user-id text-muted small">
                                Predictions: {prediction.predictionCount}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          {prediction.lastPredictionDate || '—'}
                        </td>
                        <td className="py-3">
                          <span className={getTrendColor(prediction.incomeTrend)}>
                            {formatTrend(prediction.incomeTrend)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={getTrendColor(prediction.savingsTrend)}>
                            {formatTrend(prediction.savingsTrend)}
                          </span>
                        </td>
                        <td className="py-3">
                          {getStatusBadge(prediction.status)}
                        </td>
                        <td className="py-3 text-center">
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-outline-primary mr-1"
                              onClick={() => onPredictionSelect(prediction)}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => onPredictionDelete(prediction)}
                              title="Delete Prediction"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-5">
                        <div className="no-users-container">
                          <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                          <h5 className="text-muted">No predictions found</h5>
                          <p className="text-muted">Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div className="pagination-info">
                  <small className="text-muted">
                    Page {filters.currentPage} of {totalPages}
                  </small>
                </div>
                <nav aria-label="Prediction pagination">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(1)}
                        disabled={filters.currentPage === 1}
                      >
                        <i className="fas fa-angle-double-left"></i>
                      </button>
                    </li>
                    <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(Math.max(filters.currentPage - 1, 1))}
                        disabled={filters.currentPage === 1}
                      >
                        <i className="fas fa-angle-left"></i>
                      </button>
                    </li>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (filters.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (filters.currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = filters.currentPage - 2 + i;
                      }
                      
                      return (
                        <li key={pageNum} className={`page-item ${filters.currentPage === pageNum ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => onPageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    
                    <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(Math.min(filters.currentPage + 1, totalPages))}
                        disabled={filters.currentPage === totalPages}
                      >
                        <i className="fas fa-angle-right"></i>
                      </button>
                    </li>
                    <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onPageChange(totalPages)}
                        disabled={filters.currentPage === totalPages}
                      >
                        <i className="fas fa-angle-double-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionTable;
