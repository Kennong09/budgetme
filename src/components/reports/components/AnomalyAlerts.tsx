import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '../hooks';

interface AnomalyAlertsProps {
  transactions: Transaction[];
}

interface Anomaly {
  id: string;
  type: 'spike' | 'unusual_pattern' | 'duplicate' | 'outlier';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  amount?: number;
  date?: string;
  transactionIds: string[];
  suggestion?: string;
}

/**
 * Detects anomalies in transaction data using statistical analysis.
 * 
 * @param transactions - Array of transactions to analyze
 * @returns Array of detected anomalies
 */
const detectAnomalies = (transactions: Transaction[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  if (transactions.length < 5) {
    return anomalies; // Need minimum data for meaningful analysis
  }

  // 1. Detect spending spikes (transactions significantly above average)
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  if (expenseTransactions.length > 0) {
    const amounts = expenseTransactions.map(t => t.amount);
    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length
    );

    // Flag transactions > 2 standard deviations above mean
    const spikes = expenseTransactions.filter(t => t.amount > mean + (2 * stdDev));
    
    if (spikes.length > 0) {
      spikes.forEach((spike, index) => {
        anomalies.push({
          id: `spike-${index}`,
          type: 'spike',
          severity: spike.amount > mean + (3 * stdDev) ? 'high' : 'medium',
          title: 'Unusual High Spending Detected',
          description: `Transaction of ₱${spike.amount.toLocaleString()} is significantly higher than your average spending of ₱${mean.toFixed(0)}.`,
          amount: spike.amount,
          date: spike.date,
          transactionIds: [spike.id],
          suggestion: 'Review this transaction to ensure it\'s accurate and expected.'
        });
      });
    }
  }

  // 2. Detect potential duplicate transactions
  const duplicates = findDuplicateTransactions(transactions);
  duplicates.forEach((dup, index) => {
    anomalies.push({
      id: `duplicate-${index}`,
      type: 'duplicate',
      severity: 'medium',
      title: 'Possible Duplicate Transactions',
      description: `Found ${dup.count} transactions with the same amount (₱${dup.amount.toLocaleString()}) on ${new Date(dup.date).toLocaleDateString()}.`,
      amount: dup.amount,
      date: dup.date,
      transactionIds: dup.transactionIds,
      suggestion: 'Check if these are legitimate separate transactions or duplicates.'
    });
  });

  // 3. Detect unusual spending patterns (sudden category changes)
  const categoryPatterns = detectCategoryAnomalies(transactions);
  categoryPatterns.forEach((pattern, index) => {
    anomalies.push({
      id: `pattern-${index}`,
      type: 'unusual_pattern',
      severity: 'low',
      title: pattern.title,
      description: pattern.description,
      transactionIds: pattern.transactionIds,
      suggestion: pattern.suggestion
    });
  });

  // 4. Detect outliers in transaction frequency
  const frequencyAnomalies = detectFrequencyAnomalies(transactions);
  frequencyAnomalies.forEach((freq, index) => {
    anomalies.push({
      id: `frequency-${index}`,
      type: 'outlier',
      severity: 'low',
      title: freq.title,
      description: freq.description,
      transactionIds: freq.transactionIds,
      suggestion: freq.suggestion
    });
  });

  // Sort by severity (high -> medium -> low)
  return anomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

/**
 * Finds potential duplicate transactions.
 */
const findDuplicateTransactions = (transactions: Transaction[]): Array<{
  amount: number;
  date: string;
  count: number;
  transactionIds: string[];
}> => {
  const duplicates: Array<{
    amount: number;
    date: string;
    count: number;
    transactionIds: string[];
  }> = [];

  // Group by date and amount (exclude transfers and contributions as they may legitimately duplicate)
  const grouped = new Map<string, Transaction[]>();
  
  // Only check expenses and income for duplicates
  const checkableTransactions = transactions.filter(t => 
    t.type === 'expense' || t.type === 'income'
  );
  
  checkableTransactions.forEach(t => {
    const key = `${t.date}-${t.amount}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(t);
  });

  // Find groups with multiple transactions
  grouped.forEach((group, key) => {
    if (group.length > 1) {
      duplicates.push({
        amount: group[0].amount,
        date: group[0].date,
        count: group.length,
        transactionIds: group.map(t => t.id)
      });
    }
  });

  return duplicates;
};

/**
 * Detects unusual category spending patterns.
 */
const detectCategoryAnomalies = (transactions: Transaction[]): Array<{
  title: string;
  description: string;
  transactionIds: string[];
  suggestion: string;
}> => {
  const patterns: Array<{
    title: string;
    description: string;
    transactionIds: string[];
    suggestion: string;
  }> = [];

  // Check for uncategorized transactions (only expenses and income need categories)
  // Exclude contributions (linked to goals) and transfers (moving money between accounts)
  const categorizableTransactions = transactions.filter(t => 
    t.type === 'expense' || t.type === 'income'
  );
  const uncategorized = categorizableTransactions.filter(t => 
    !t.category_id && !t.expense_category_id && !t.income_category_id
  );
  
  if (uncategorized.length > 0 && uncategorized.length > categorizableTransactions.length * 0.3) {
    patterns.push({
      title: 'High Number of Uncategorized Transactions',
      description: `${uncategorized.length} transactions (${((uncategorized.length / categorizableTransactions.length) * 100).toFixed(0)}%) are uncategorized, making it harder to track spending patterns.`,
      transactionIds: uncategorized.map(t => t.id),
      suggestion: 'Categorize your transactions for better financial insights.'
    });
  }

  return patterns;
};

/**
 * Detects unusual transaction frequency patterns.
 */
const detectFrequencyAnomalies = (transactions: Transaction[]): Array<{
  title: string;
  description: string;
  transactionIds: string[];
  suggestion: string;
}> => {
  const patterns: Array<{
    title: string;
    description: string;
    transactionIds: string[];
    suggestion: string;
  }> = [];

  // Group transactions by day
  const byDay = new Map<string, Transaction[]>();
  transactions.forEach(t => {
    const day = t.date.split('T')[0];
    if (!byDay.has(day)) {
      byDay.set(day, []);
    }
    byDay.get(day)!.push(t);
  });

  // Find days with unusually high transaction counts
  const counts = Array.from(byDay.values()).map(group => group.length);
  const avgCount = counts.reduce((sum, c) => sum + c, 0) / counts.length;

  byDay.forEach((group, day) => {
    if (group.length > avgCount * 3) {
      patterns.push({
        title: 'Unusually High Transaction Activity',
        description: `${group.length} transactions recorded on ${new Date(day).toLocaleDateString()}, which is significantly higher than your average of ${avgCount.toFixed(0)} per day.`,
        transactionIds: group.map(t => t.id),
        suggestion: 'Review these transactions to ensure they\'re all legitimate.'
      });
    }
  });

  return patterns;
};

/**
 * Returns icon for anomaly type.
 */
const getAnomalyIcon = (type: string): string => {
  switch (type) {
    case 'spike': return 'fas fa-arrow-up';
    case 'duplicate': return 'fas fa-copy';
    case 'unusual_pattern': return 'fas fa-chart-line';
    case 'outlier': return 'fas fa-exclamation-circle';
    default: return 'fas fa-exclamation-triangle';
  }
};

/**
 * Returns color for severity level.
 */
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high': return 'danger';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'secondary';
  }
};

export const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({ transactions }) => {
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 5;

  // Inject pagination styles matching Transactions component
  useEffect(() => {
    const paginationStyles = `
      .anomaly-alerts-pagination .pagination .page-item.active .page-link,
      .anomaly-alerts-pagination .pagination .page-item.active .page-link:hover,
      .anomaly-alerts-pagination .pagination .page-item.active .page-link:focus,
      .anomaly-alerts-pagination .pagination .page-item.active .page-link:active {
        background: linear-gradient(180deg, #6366f1 10%, #4f46e5 100%) !important;
        border-color: #6366f1 !important;
        color: #fff !important;
        box-shadow: 0 0.125rem 0.25rem rgba(99, 102, 241, 0.3) !important;
      }

      .anomaly-alerts-pagination .pagination .page-item:not(.active) .page-link {
        color: #6366f1 !important;
        border: 1px solid #e0e7ff !important;
        background-color: #fff !important;
        transition: all 0.15s ease-in-out;
      }

      .anomaly-alerts-pagination .pagination .page-item:not(.active) .page-link:hover {
        background-color: #eef2ff !important;
        border-color: #818cf8 !important;
        color: #4f46e5 !important;
      }

      .anomaly-alerts-pagination .pagination .page-item.disabled .page-link {
        color: #9ca3af !important;
        background-color: #f9fafb !important;
        border-color: #e5e7eb !important;
        opacity: 0.6 !important;
      }
    `;

    const style = document.createElement('style');
    style.innerHTML = paginationStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const detected = detectAnomalies(transactions);
    // Filter out dismissed anomalies
    const filtered = detected.filter(a => !dismissedIds.has(a.id));
    setAnomalies(filtered);
    setLoading(false);
  }, [transactions, dismissedIds]);

  if (loading) {
    return (
      <>
        {/* Mobile Loading State */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Analyzing transactions...</p>
                <p className="text-[10px] text-gray-500">Checking for unusual patterns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="card shadow mb-4 border-left-warning hidden md:block">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="spinner-border text-warning mr-3" role="status">
                <span className="sr-only">Analyzing transactions...</span>
              </div>
              <div>
                <h6 className="mb-0">Analyzing for anomalies...</h6>
                <small className="text-muted">Checking your transactions for unusual patterns</small>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (anomalies.length === 0) {
    return (
      <>
        {/* Mobile No Anomalies State */}
        <div className="block md:hidden mb-4">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <i className="fas fa-check-circle text-emerald-500 text-lg"></i>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700">All Clear!</p>
                <p className="text-[10px] text-emerald-600">No anomalies detected in your transactions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop No Anomalies State */}
        <div className="card shadow mb-4 border-left-success hidden md:block">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="fas fa-check-circle fa-2x text-success mr-3"></i>
              <div>
                <h6 className="mb-0 text-success">No Anomalies Detected</h6>
                <small className="text-muted">Your transactions look normal. Keep up the good work!</small>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const handleReview = (anomaly: Anomaly) => {
    // If there's only one transaction, navigate directly to its details
    if (anomaly.transactionIds.length === 1) {
      navigate(`/transactions/${anomaly.transactionIds[0]}`);
    } else {
      // For multiple transactions, navigate to the first one
      navigate(`/transactions/${anomaly.transactionIds[0]}`);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(anomalies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAnomalies = anomalies.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setExpandedId(null); // Close any expanded items when changing pages
  };

  // Mobile severity colors
  const getMobileSeverityColors = (severity: string) => {
    switch (severity) {
      case 'high': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', badge: 'bg-rose-100 text-rose-600' };
      case 'medium': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-600' };
      case 'low': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-600' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-600' };
    }
  };

  return (
    <>
      {/* Mobile Anomaly Alerts */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
              <i className="fas fa-exclamation-triangle text-amber-500 text-[10px]"></i>
              Anomaly Alerts
            </h6>
            <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
              {anomalies.length}
            </span>
          </div>

          {/* Description */}
          <div className="px-3 py-2 bg-amber-50/50">
            <p className="text-[10px] text-amber-700">
              Unusual patterns detected. Review to ensure accuracy.
            </p>
          </div>

          {/* Anomaly List */}
          <div className="p-2 space-y-2">
            {currentAnomalies.map((anomaly) => {
              const colors = getMobileSeverityColors(anomaly.severity);
              return (
                <div
                  key={anomaly.id}
                  className={`${colors.bg} rounded-xl border ${colors.border} overflow-hidden`}
                >
                  <button
                    onClick={() => toggleExpand(anomaly.id)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <i className={`${getAnomalyIcon(anomaly.type)} ${colors.text} text-[10px]`}></i>
                          <span className="text-xs font-semibold text-gray-800 truncate">{anomaly.title}</span>
                        </div>
                        <p className="text-[10px] text-gray-600 line-clamp-2">{anomaly.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`${colors.badge} text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase`}>
                          {anomaly.severity}
                        </span>
                        <i className={`fas fa-chevron-${expandedId === anomaly.id ? 'up' : 'down'} text-gray-400 text-[10px]`}></i>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedId === anomaly.id && (
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100 animate__animated animate__fadeIn">
                      {anomaly.suggestion && (
                        <div className="bg-white rounded-lg p-2 mb-2">
                          <p className="text-[10px] text-blue-600">
                            <i className="fas fa-lightbulb mr-1"></i>
                            {anomaly.suggestion}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {anomaly.amount && (
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase">Amount</p>
                            <p className="text-xs font-semibold text-gray-800">₱{anomaly.amount.toLocaleString()}</p>
                          </div>
                        )}
                        {anomaly.date && (
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase">Date</p>
                            <p className="text-xs font-semibold text-gray-800">{new Date(anomaly.date).toLocaleDateString()}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase">Affected</p>
                          <p className="text-xs font-semibold text-gray-800">{anomaly.transactionIds.length}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReview(anomaly);
                          }}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-semibold text-white ${
                            anomaly.severity === 'high' ? 'bg-rose-500' : 
                            anomaly.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                        >
                          <i className="fas fa-search mr-1"></i>
                          Review
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(anomaly.id);
                          }}
                          className="px-4 py-2 rounded-lg text-[10px] font-semibold text-gray-600 bg-gray-100"
                        >
                          <i className="fas fa-times mr-1"></i>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2 bg-slate-50 border-t border-gray-100 flex items-center justify-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center disabled:opacity-50"
              >
                <i className="fas fa-chevron-left text-[10px]"></i>
              </button>
              <span className="text-[10px] text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center disabled:opacity-50"
              >
                <i className="fas fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          )}

          {/* Note */}
          <div className="px-3 py-2 bg-slate-50 border-t border-gray-100">
            <p className="text-[9px] text-gray-400 text-center">
              <i className="fas fa-info-circle mr-1"></i>
              Auto-generated based on statistical analysis
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Anomaly Alerts */}
      <div className="hidden md:block">
        <div className="card shadow mb-4 border-left-warning">
      <div className="card-header py-3 d-flex justify-content-between align-items-center">
        <h6 className="m-0 font-weight-bold text-warning">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Anomaly Alerts
        </h6>
        <span className="badge badge-warning badge-pill">{anomalies.length}</span>
      </div>
      <div className="card-body">
        <p className="text-muted mb-3">
          We've detected some unusual patterns in your transactions. Review these alerts to ensure everything is accurate.
        </p>

        <div className="list-group">
          {currentAnomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`list-group-item list-group-item-action border-left-${getSeverityColor(anomaly.severity)}`}
              onClick={() => toggleExpand(anomaly.id)}
              style={{ cursor: 'pointer', borderLeftWidth: '4px' }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-2">
                    <i className={`${getAnomalyIcon(anomaly.type)} text-${getSeverityColor(anomaly.severity)} mr-2`}></i>
                    <h6 className="mb-0">{anomaly.title}</h6>
                    <span className={`badge badge-${getSeverityColor(anomaly.severity)} ml-2`}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <p className="mb-1 text-muted">{anomaly.description}</p>
                  {anomaly.suggestion && (
                    <small className="text-info">
                      <i className="fas fa-lightbulb mr-1"></i>
                      {anomaly.suggestion}
                    </small>
                  )}
                </div>
                <i className={`fas fa-chevron-${expandedId === anomaly.id ? 'up' : 'down'} ml-2`}></i>
              </div>

              {expandedId === anomaly.id && (
                <div className="mt-3 pt-3 border-top">
                  <div className="row">
                    {anomaly.amount && (
                      <div className="col-md-4">
                        <small className="text-muted d-block">Amount</small>
                        <strong>₱{anomaly.amount.toLocaleString()}</strong>
                      </div>
                    )}
                    {anomaly.date && (
                      <div className="col-md-4">
                        <small className="text-muted d-block">Date</small>
                        <strong>{new Date(anomaly.date).toLocaleDateString()}</strong>
                      </div>
                    )}
                    <div className="col-md-4">
                      <small className="text-muted d-block">Affected Transactions</small>
                      <strong>{anomaly.transactionIds.length}</strong>
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      className={`btn btn-sm btn-${getSeverityColor(anomaly.severity)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReview(anomaly);
                      }}
                    >
                      <i className="fas fa-search mr-1"></i>
                      Review Transactions
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(anomaly.id);
                      }}
                    >
                      <i className="fas fa-times mr-1"></i>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="card-footer bg-white border-0 mt-3 anomaly-alerts-pagination">
            <div className="row align-items-center">
              {/* Left: Entry counter */}
              <div className="col-md-6 text-center text-md-start mb-2 mb-md-0">
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                  Showing {startIndex + 1} to {Math.min(endIndex, anomalies.length)} of {anomalies.length} alerts
                </span>
              </div>
              
              {/* Right: Page navigation */}
              <div className="col-md-6 text-center text-md-end">
                <nav>
                  <ul className="pagination mb-0 justify-content-center justify-content-md-end">
                    {/* Previous button */}
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                    </li>
                    
                    {/* Page numbers with smart logic */}
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
                            onClick={() => goToPage(pageNum)}
                            style={currentPage === pageNum ? { color: 'white' } : {}}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    
                    {/* Next button */}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        )}

        <div className="alert alert-light mt-4 mb-0" role="alert">
          <small>
            <i className="fas fa-info-circle mr-1"></i>
            <strong>Note:</strong> These alerts are generated automatically based on statistical analysis. 
            They may include legitimate transactions that are simply unusual for your spending patterns.
          </small>
        </div>
      </div>
    </div>
    </div>
    </>
  );
};

/**
 * Compact version for dashboard overview.
 */
export const AnomalyAlertsMini: React.FC<AnomalyAlertsProps> = ({ transactions }) => {
  const [anomalyCount, setAnomalyCount] = useState(0);

  useEffect(() => {
    const detected = detectAnomalies(transactions);
    setAnomalyCount(detected.length);
  }, [transactions]);

  if (anomalyCount === 0) {
    return null;
  }

  return (
    <div className="alert alert-warning d-flex align-items-center" role="alert">
      <i className="fas fa-exclamation-triangle mr-2"></i>
      <div className="flex-grow-1">
        <strong>{anomalyCount}</strong> anomal{anomalyCount === 1 ? 'y' : 'ies'} detected in your transactions
      </div>
      <button className="btn btn-sm btn-warning ml-2">
        Review
      </button>
    </div>
  );
};
