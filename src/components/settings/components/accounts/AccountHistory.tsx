import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AccountAuditService } from '../../../../services/database/accountAuditService';
import { useAuth } from '../../../../utils/AuthContext';
import { useToast } from '../../../../utils/ToastContext';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface Props {
  accountId: string;
  accountName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface HistoryRecord {
  id: string;
  activity_type: string;
  activity_description: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  metadata: {
    account_id?: string;
    account_name?: string;
    amount?: number;
    source?: string;
    reason?: string;
    old_values?: any;
    new_values?: any;
    changes?: any;
    [key: string]: any;
  };
  severity: string;
}

interface FilterOptions {
  startDate: string;
  endDate: string;
  activityTypes: string[];
  pageSize: number;
  currentPage: number;
}

const AccountHistory: React.FC<Props> = ({ accountId, accountName, isOpen, onClose }) => {
  const { user } = useAuth();
  const { showErrorToast, showSuccessToast } = useToast();

  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // Today
    activityTypes: [],
    pageSize: 20,
    currentPage: 1
  });

  const activityTypeOptions = [
    // Account activities
    { value: 'account_created', label: 'Account Created', shortLabel: 'Created', icon: 'fas fa-plus-circle', color: 'text-success', mobileColor: 'text-emerald-500', mobileBg: 'bg-emerald-50' },
    { value: 'account_updated', label: 'Account Updated', shortLabel: 'Updated', icon: 'fas fa-edit', color: 'text-info', mobileColor: 'text-blue-500', mobileBg: 'bg-blue-50' },
    { value: 'account_cash_in', label: 'Cash In', shortLabel: 'Cash In', icon: 'fas fa-money-bill-wave', color: 'text-primary', mobileColor: 'text-indigo-500', mobileBg: 'bg-indigo-50' },
    { value: 'account_balance_change', label: 'Balance Change', shortLabel: 'Balance', icon: 'fas fa-exchange-alt', color: 'text-warning', mobileColor: 'text-amber-500', mobileBg: 'bg-amber-50' },
    { value: 'account_deleted', label: 'Account Deleted', shortLabel: 'Deleted', icon: 'fas fa-trash', color: 'text-danger', mobileColor: 'text-rose-500', mobileBg: 'bg-rose-50' },
    // Transaction activities
    { value: 'transaction_created', label: 'Transaction Created', shortLabel: 'Trans+', icon: 'fas fa-receipt', color: 'text-success', mobileColor: 'text-emerald-500', mobileBg: 'bg-emerald-50' },
    { value: 'transaction_updated', label: 'Transaction Updated', shortLabel: 'Trans~', icon: 'fas fa-edit', color: 'text-info', mobileColor: 'text-blue-500', mobileBg: 'bg-blue-50' },
    { value: 'transaction_deleted', label: 'Transaction Deleted', shortLabel: 'Trans-', icon: 'fas fa-times-circle', color: 'text-danger', mobileColor: 'text-rose-500', mobileBg: 'bg-rose-50' },
    // Goal contribution activities
    { value: 'goal_contribution_created', label: 'Goal Contribution', shortLabel: 'Goal+', icon: 'fas fa-bullseye', color: 'text-primary', mobileColor: 'text-indigo-500', mobileBg: 'bg-indigo-50' },
    { value: 'goal_contribution_updated', label: 'Contribution Updated', shortLabel: 'Goal~', icon: 'fas fa-edit', color: 'text-info', mobileColor: 'text-blue-500', mobileBg: 'bg-blue-50' },
    { value: 'goal_contribution_deleted', label: 'Contribution Deleted', shortLabel: 'Goal-', icon: 'fas fa-times-circle', color: 'text-danger', mobileColor: 'text-rose-500', mobileBg: 'bg-rose-50' }
  ];

  // Fetch history data
  const fetchHistory = async () => {
    if (!user || !accountId) return;

    setLoading(true);
    try {
      const result = await AccountAuditService.getAccountHistory(user.id, accountId, {
        startDate: filters.startDate + 'T00:00:00Z',
        endDate: filters.endDate + 'T23:59:59Z',
        activityTypes: filters.activityTypes.length > 0 ? filters.activityTypes : undefined,
        limit: filters.pageSize,
        offset: (filters.currentPage - 1) * filters.pageSize
      });

      if (result.success && result.data) {
        setHistoryRecords(result.data);
        setTotalCount(result.totalCount || 0);
      } else {
        showErrorToast(result.error || 'Failed to fetch account history');
        setHistoryRecords([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error fetching account history:', error);
      showErrorToast('An error occurred while fetching history');
      setHistoryRecords([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or filters change
  useEffect(() => {
    if (isOpen && user && accountId) {
      fetchHistory();
    }
  }, [isOpen, user, accountId, filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      currentPage: key !== 'currentPage' ? 1 : value // Reset to first page when filters change
    }));
  };

  // Handle activity type toggle
  const toggleActivityType = (activityType: string) => {
    setFilters(prev => ({
      ...prev,
      activityTypes: prev.activityTypes.includes(activityType)
        ? prev.activityTypes.filter(type => type !== activityType)
        : [...prev.activityTypes, activityType],
      currentPage: 1
    }));
  };

  // Export history to CSV
  const handleExport = async () => {
    if (!user || !accountId) return;

    setExporting(true);
    try {
      const result = await AccountAuditService.exportAccountHistory(user.id, accountId, {
        startDate: filters.startDate + 'T00:00:00Z',
        endDate: filters.endDate + 'T23:59:59Z',
        activityTypes: filters.activityTypes.length > 0 ? filters.activityTypes : undefined
      });

      if (result.success && result.data) {
        // Create and download CSV file
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${accountName}_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccessToast('Account history exported successfully');
      } else {
        showErrorToast(result.error || 'Failed to export account history');
      }
    } catch (error) {
      console.error('Error exporting account history:', error);
      showErrorToast('An error occurred while exporting history');
    } finally {
      setExporting(false);
    }
  };

  // Get activity type info
  const getActivityTypeInfo = (activityType: string) => {
    return activityTypeOptions.find(option => option.value === activityType) || {
      value: activityType,
      label: activityType,
      shortLabel: activityType,
      icon: 'fas fa-circle',
      color: 'text-secondary',
      mobileColor: 'text-gray-500',
      mobileBg: 'bg-gray-50'
    };
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date for mobile (shorter)
  const formatDateMobile = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format amount for display
  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '';
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / filters.pageSize);
  const startRecord = (filters.currentPage - 1) * filters.pageSize + 1;
  const endRecord = Math.min(filters.currentPage * filters.pageSize, totalCount);

  if (!isOpen) return null;

  const modalElement = (
    <>
      {/* Mobile Modal */}
      <div className="block md:hidden fixed inset-0 bg-black bg-opacity-50 flex flex-col" style={{ zIndex: 1060 }}>
        <div className="bg-white flex-1 flex flex-col animate__animated animate__slideInUp animate__faster" style={{ zIndex: 1065 }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-history text-white text-sm"></i>
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm">Account History</h2>
                <p className="text-indigo-100 text-[10px] truncate max-w-[180px]">{accountName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
            >
              <i className="fas fa-times text-white text-xs"></i>
            </button>
          </div>

          {/* Mobile Filters Toggle */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <button
              onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <i className="fas fa-filter text-indigo-500 text-xs"></i>
                <span className="text-xs font-medium text-gray-700">Filters</span>
                {filters.activityTypes.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] font-semibold">
                    {filters.activityTypes.length}
                  </span>
                )}
              </div>
              <i className={`fas fa-chevron-${mobileFiltersExpanded ? 'up' : 'down'} text-gray-400 text-[10px]`}></i>
            </button>
          </div>

          {/* Mobile Filters Expanded */}
          {mobileFiltersExpanded && (
            <div className="px-4 py-3 border-b border-gray-100 bg-white animate__animated animate__fadeIn animate__faster">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">From</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">To</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Activity Type Pills */}
              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Activity Types</label>
                <div className="flex flex-wrap gap-1.5">
                  {activityTypeOptions.slice(0, 6).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleActivityType(option.value)}
                      className={`px-2 py-1 rounded-full text-[9px] font-medium transition-colors flex items-center gap-1 ${
                        filters.activityTypes.includes(option.value)
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      <i className={`${option.icon} text-[8px]`}></i>
                      {option.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Button */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={handleExport}
                  disabled={exporting || loading}
                  className="w-full py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download text-[10px]"></i>
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 font-medium">Loading history...</p>
                </div>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-history text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">No Activity Found</h3>
                <p className="text-xs text-gray-500">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {historyRecords.map((record, index) => {
                  const activityInfo = getActivityTypeInfo(record.activity_type);
                  return (
                    <div 
                      key={record.id} 
                      className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm animate__animated animate__fadeIn"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl ${activityInfo.mobileBg} flex items-center justify-center flex-shrink-0`}>
                          <i className={`${activityInfo.icon} ${activityInfo.mobileColor} text-sm`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-800">{activityInfo.shortLabel || activityInfo.label}</span>
                            <span className="text-[9px] text-gray-400">{formatDateMobile(record.created_at)}</span>
                          </div>
                          <p className="text-[10px] text-gray-600 line-clamp-2 mb-1">{record.activity_description}</p>
                          
                          {/* Quick Info */}
                          <div className="flex flex-wrap gap-2">
                            {record.metadata.amount && (
                              <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {formatAmount(record.metadata.amount)}
                              </span>
                            )}
                            {record.metadata.category_name && (
                              <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                {record.metadata.category_name}
                              </span>
                            )}
                            {record.metadata.goal_name && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                {record.metadata.goal_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">
                  {startRecord}-{endRecord} of {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFilterChange('currentPage', filters.currentPage - 1)}
                    disabled={filters.currentPage === 1}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
                  >
                    <i className="fas fa-chevron-left text-[10px]"></i>
                  </button>
                  <span className="text-xs font-medium text-gray-700">
                    {filters.currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => handleFilterChange('currentPage', filters.currentPage + 1)}
                    disabled={filters.currentPage === totalPages}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-50"
                  >
                    <i className="fas fa-chevron-right text-[10px]"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Modal */}
      <div className="hidden md:flex fixed inset-0 bg-black bg-opacity-50 items-center justify-center" style={{ zIndex: 1060 }}>
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col animate__animated animate__fadeIn animate__faster" style={{ zIndex: 1065 }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary rounded-t-lg">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <i className="fas fa-history mr-2"></i>
              Account History - {accountName}
            </h3>
            <button 
              type="button" 
              className="text-white hover:text-gray-200 transition-colors"
              onClick={onClose}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="row align-items-end">
              <div className="col-md-3">
                <label className="small font-weight-bold text-gray-700">From Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="small font-weight-bold text-gray-700">To Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="small font-weight-bold text-gray-700">Activity Type</label>
                <div className="d-flex flex-wrap gap-1">
                  {activityTypeOptions.slice(0, 5).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleActivityType(option.value)}
                      className={`btn btn-sm ${
                        filters.activityTypes.includes(option.value)
                          ? 'btn-primary'
                          : 'btn-outline-secondary'
                      }`}
                    >
                      <i className={`${option.icon} mr-1`}></i>
                      {option.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-md-2">
                <button
                  onClick={handleExport}
                  disabled={exporting || loading}
                  className="btn btn-success btn-block"
                >
                  {exporting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-1" role="status"></span>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download mr-1"></i>
                      Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <p className="mt-3 text-muted">Loading history...</p>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-history text-gray-300" style={{ fontSize: '4rem' }}></i>
                <h4 className="mt-3 text-gray-700">No Activity Found</h4>
                <p className="text-muted">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th>Activity</th>
                      <th>Description</th>
                      <th>Details</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((record) => {
                      const activityInfo = getActivityTypeInfo(record.activity_type);
                      return (
                        <tr key={record.id}>
                          <td>
                            <span className={`badge badge-pill ${activityInfo.color === 'text-success' ? 'badge-success' : activityInfo.color === 'text-danger' ? 'badge-danger' : activityInfo.color === 'text-info' ? 'badge-info' : activityInfo.color === 'text-warning' ? 'badge-warning' : 'badge-primary'}`}>
                              <i className={`${activityInfo.icon} mr-1`}></i>
                              {activityInfo.label}
                            </span>
                          </td>
                          <td className="text-truncate" style={{ maxWidth: '300px' }}>
                            {record.activity_description}
                          </td>
                          <td>
                            {record.metadata.amount && (
                              <span className="badge badge-light mr-1">
                                {formatAmount(record.metadata.amount)}
                              </span>
                            )}
                            {record.metadata.category_name && (
                              <span className="badge badge-secondary mr-1">
                                {record.metadata.category_name}
                              </span>
                            )}
                            {record.metadata.goal_name && (
                              <span className="badge badge-info">
                                {record.metadata.goal_name}
                              </span>
                            )}
                          </td>
                          <td className="text-muted small">
                            {formatDate(record.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer with Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 d-flex justify-content-between align-items-center">
              <span className="text-muted small">
                Showing {startRecord} to {endRecord} of {totalCount} entries
              </span>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${filters.currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handleFilterChange('currentPage', filters.currentPage - 1)}
                      disabled={filters.currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  <li className="page-item active">
                    <span className="page-link">{filters.currentPage} / {totalPages}</span>
                  </li>
                  <li className={`page-item ${filters.currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handleFilterChange('currentPage', filters.currentPage + 1)}
                      disabled={filters.currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modalElement, document.body);
};

export default AccountHistory;
