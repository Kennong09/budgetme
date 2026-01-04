import React, { FC, useState, useEffect } from "react";
import { AIInsightSummary, AIInsightFilters, AI_SERVICES, RISK_LEVELS } from "./types";

interface AIInsightsTableProps {
  insights: AIInsightSummary[];
  filters: AIInsightFilters;
  totalPages: number;
  totalItems: number;
  loading?: boolean;
  onSort: (sortBy: AIInsightFilters['sortBy'], sortOrder: AIInsightFilters['sortOrder']) => void;
  onPageChange: (page: number) => void;
  onView: (insight: AIInsightSummary) => void;
  onDelete: (insight: AIInsightSummary) => void;
}

const AIInsightsTable: FC<AIInsightsTableProps> = ({
  insights,
  filters,
  totalPages,
  totalItems,
  loading = false,
  onSort,
  onPageChange,
  onView,
  onDelete
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const toggleDropdown = (insightId: string) => {
    setActiveDropdown(activeDropdown === insightId ? null : insightId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        closeDropdown();
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [activeDropdown]);

  const getSortIcon = (field: string) => {
    if (filters.sortBy !== field) return null;
    return filters.sortOrder === 'asc' ? 
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
    if (value === 0) return "—";
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="table-section">
        {/* Mobile Loading State */}
        <div className="block md:hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
            </div>
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-2"></div>
                      <div className="h-2 w-32 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Loading State */}
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
                      {Array.from({ length: 7 }).map((_, index) => (
                        <th key={index} className="border-0">
                          <div className="skeleton-line skeleton-th"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        {Array.from({ length: 7 }).map((_, colIndex) => (
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
      {/* Mobile Card List View */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-brain text-red-500 text-[10px]"></i>
              User Insights
              {totalItems > 0 && (
                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">
                  {totalItems}
                </span>
              )}
            </h6>
            <span className="text-[9px] text-gray-400">
              {Math.min((filters.currentPage - 1) * filters.pageSize + 1, totalItems)}-{Math.min(filters.currentPage * filters.pageSize, totalItems)} of {totalItems}
            </span>
          </div>

          {/* Mobile Cards List */}
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {insights.length > 0 ? (
              insights.map((insight) => (
                <div
                  key={insight.insightId}
                  className="px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => onView(insight)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {insight.avatarUrl ? (
                        <img
                          src={insight.avatarUrl}
                          alt={insight.username || 'User'}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold text-sm">
                          {insight.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        insight.status === 'active' ? 'bg-emerald-500' : insight.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {insight.username || 'Unknown User'}
                        </p>
                        <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-semibold ${
                          insight.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                          insight.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {insight.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        {insight.generatedDate ? new Date(insight.generatedDate).toLocaleDateString() : '—'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] text-gray-600">
                          {insight.confidenceLevel ? `${(insight.confidenceLevel * 100).toFixed(0)}%` : '—'}
                        </span>
                      </div>
                    </div>
                    {/* Actions - Mobile Dropdown */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="relative">
                        <button
                          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleDropdown(insight.insightId); }}
                          onTouchEnd={(e) => { e.stopPropagation(); toggleDropdown(insight.insightId); }}
                          aria-label="More actions"
                        >
                          <i className="fas fa-ellipsis-v text-[10px]"></i>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeDropdown === insight.insightId && (
                          <div className="dropdown-menu fixed w-28 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={{ display: 'block', zIndex: 9999, transform: 'translateX(-84px) translateY(4px)' }}>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); onView(insight); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onView(insight); }}
                            >
                              <i className="fas fa-eye text-gray-500 text-[10px]"></i>
                              <span className="text-gray-700">View</span>
                            </button>
                            <div className="border-t border-gray-200"></div>
                            <button
                              className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 active:bg-red-100 flex items-center gap-2 transition-colors"
                              onClick={(e) => { e.stopPropagation(); closeDropdown(); onDelete(insight); }}
                              onTouchEnd={(e) => { e.stopPropagation(); closeDropdown(); onDelete(insight); }}
                            >
                              <i className="fas fa-trash text-red-500 text-[10px]"></i>
                              <span className="text-red-600">Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <i className="fas fa-chevron-right text-gray-400 text-[8px]"></i>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <i className="fas fa-brain text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600">No insights found</p>
                <p className="text-[10px] text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[9px] text-gray-500">Page {filters.currentPage} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50"
                  onClick={() => onPageChange(Math.max(filters.currentPage - 1, 1))}
                  disabled={filters.currentPage === 1}
                >
                  <i className="fas fa-chevron-left text-[10px]"></i>
                </button>
                <span className="px-2 py-1 text-[10px] font-medium text-gray-700">{filters.currentPage}</span>
                <button
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50"
                  onClick={() => onPageChange(Math.min(filters.currentPage + 1, totalPages))}
                  disabled={filters.currentPage === totalPages}
                >
                  <i className="fas fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="card shadow">
          <div className="card-header bg-white border-0 py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="m-0 font-weight-bold text-danger">
                <i className="fas fa-brain mr-2"></i>
                User Insights ({totalItems})
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
                    <th className="border-0 cursor-pointer" onClick={() => onSort('username', 'asc')}>Username {getSortIcon('username')}</th>
                    <th className="border-0 cursor-pointer" onClick={() => onSort('generated_at', 'asc')}>Last Updated {getSortIcon('generated_at')}</th>
                    <th className="border-0 cursor-pointer" onClick={() => onSort('confidence_level', 'asc')}>Accuracy {getSortIcon('confidence_level')}</th>
                    <th className="border-0 cursor-pointer" onClick={() => onSort('riskLevel', 'asc')}>Income Trend {getSortIcon('riskLevel')}</th>
                    <th className="border-0 cursor-pointer" onClick={() => onSort('aiService', 'asc')}>Savings Trend {getSortIcon('aiService')}</th>
                    <th className="border-0 cursor-pointer" onClick={() => onSort('status', 'asc')}>Status {getSortIcon('status')}</th>
                    <th className="border-0 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.length > 0 ? (
                    insights.map((insight) => (
                      <tr key={insight.insightId} className="table-row">
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <div className="user-avatar-container mr-3" style={{ position: 'relative' }}>
                              {insight.avatarUrl ? (
                                <img src={insight.avatarUrl} alt={insight.username || 'User'} className="rounded-circle" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                              ) : (
                                <div className="user-table-avatar bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '50%', fontWeight: 600 }}>
                                  {insight.username?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="user-info">
                              <div className="user-name font-weight-medium">{insight.username || 'Unknown User'}</div>
                              <div className="user-id text-muted small">Generated: {insight.generatedDate ? new Date(insight.generatedDate).toLocaleDateString() : '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">{insight.generatedDate ? new Date(insight.generatedDate).toLocaleDateString() : '—'}</td>
                        <td className="py-3">{insight.confidenceLevel ? <span className={`text-${insight.confidenceLevel > 0.9 ? 'success' : insight.confidenceLevel > 0.8 ? 'primary' : 'warning'}`}>{(insight.confidenceLevel * 100).toFixed(1)}%</span> : '—'}</td>
                        <td className="py-3"><span className={getTrendColor(1.1)}>{formatTrend(1.1)}</span></td>
                        <td className="py-3"><span className={getTrendColor(-4.2)}>{formatTrend(-4.2)}</span></td>
                        <td className="py-3">{getStatusBadge(insight.status)}</td>
                        <td className="py-3">
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => onView(insight)} title="View Details"><i className="fas fa-eye"></i></button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(insight)} title="Delete Insight"><i className="fas fa-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <div className="no-users-container">
                          <i className="fas fa-brain fa-3x text-muted mb-3"></i>
                          <h5 className="text-muted">No insights found</h5>
                          <p className="text-muted">Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="card-footer bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">Page {filters.currentPage} of {totalPages}</small>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => onPageChange(1)} disabled={filters.currentPage === 1}><i className="fas fa-angle-double-left"></i></button>
                    </li>
                    <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => onPageChange(Math.max(filters.currentPage - 1, 1))} disabled={filters.currentPage === 1}><i className="fas fa-angle-left"></i></button>
                    </li>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = totalPages <= 5 ? i + 1 : filters.currentPage <= 3 ? i + 1 : filters.currentPage >= totalPages - 2 ? totalPages - 4 + i : filters.currentPage - 2 + i;
                      return (
                        <li key={pageNum} className={`page-item ${filters.currentPage === pageNum ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => onPageChange(pageNum)}>{pageNum}</button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => onPageChange(Math.min(filters.currentPage + 1, totalPages))} disabled={filters.currentPage === totalPages}><i className="fas fa-angle-right"></i></button>
                    </li>
                    <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => onPageChange(totalPages)} disabled={filters.currentPage === totalPages}><i className="fas fa-angle-double-right"></i></button>
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

export default AIInsightsTable;