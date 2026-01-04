import { FC, useState } from "react";
import { AccountStats } from "./types";
import { truncateNumber, formatCurrencyTruncated } from "../../../utils/helpers";

// Stats Card Detail Modal Component
interface StatsDetailModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  color: string;
  data: {
    label: string;
    value: string | number;
    subLabel?: string;
  }[];
}

const StatsDetailModal: FC<StatsDetailModalProps> = ({ show, onClose, title, icon, color, data }) => {
  if (!show) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1} 
        style={{ zIndex: 1050 }}
        onClick={onClose}
      >
        <div 
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content border-0 shadow-lg overflow-hidden">
            {/* Modal Header - Red with white text */}
            <div className="modal-header bg-gradient-danger text-white border-0">
              <h5 className="modal-title d-flex align-items-center">
                <div className="modal-icon-container mr-3" style={{ 
                  width: '45px', 
                  height: '45px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.2)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <i className={`fas ${icon}`} style={{ fontSize: '1.25rem' }}></i>
                </div>
                <div>
                  <div className="modal-title-main font-weight-bold">{title}</div>
                  <div className="modal-subtitle" style={{ opacity: 0.85, fontSize: '0.85rem' }}>Detailed breakdown</div>
                </div>
              </h5>
              <button 
                type="button" 
                className="close text-white" 
                onClick={onClose}
                style={{ textShadow: 'none', opacity: 0.9 }}
              >
                <span>&times;</span>
              </button>
            </div>

            {/* Modal Body - White background with colored accents */}
            <div className="modal-body bg-white p-0">
              <div className="stats-breakdown-list">
                {data.map((item, index) => (
                  <div 
                    key={index} 
                    className="stats-breakdown-item d-flex justify-content-between align-items-center py-3 px-4"
                    style={{ 
                      borderBottom: index < data.length - 1 ? '1px solid #f0f0f0' : 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <div>
                      <div className="font-weight-medium text-gray-800">{item.label}</div>
                      {item.subLabel && <small className="text-muted">{item.subLabel}</small>}
                    </div>
                    <span className={`badge badge-${color} badge-pill px-3 py-2`} style={{ 
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      minWidth: '60px',
                      textAlign: 'center'
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer - Light background with grey button */}
            <div className="modal-footer bg-light border-0">
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="modal-footer-info">
                  <small className="text-muted">
                    <i className="fas fa-info-circle mr-1 text-danger"></i>
                    Data reflects current statistics
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  <i className="fas fa-times mr-1"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

interface AccountStatsCardsProps {
  stats: AccountStats;
  loading?: boolean;
}

const AccountStatsCards: FC<AccountStatsCardsProps> = ({ stats, loading = false }) => {
  // Stats detail modal state
  const [statsDetailModal, setStatsDetailModal] = useState<{
    show: boolean;
    title: string;
    icon: string;
    color: string;
    data: { label: string; value: string | number; subLabel?: string }[];
  }>({ show: false, title: '', icon: '', color: '', data: [] });

  // Helper function to format currency amounts
  const formatCurrency = (amount: number): string => {
    return `₱${Math.abs(amount).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Calculate percentages
  const usersWithAccountsPercentage = stats.totalUsers > 0 
    ? ((stats.usersWithAccounts / stats.totalUsers) * 100).toFixed(1) 
    : '0';
  const activePercentage = stats.totalAccounts > 0 
    ? ((stats.activeAccounts / stats.totalAccounts) * 100).toFixed(1) 
    : '0';

  // Modal open handlers
  const openTotalAccountsModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Accounts Breakdown',
      icon: 'fa-university',
      color: 'danger',
      data: [
        { label: 'Total Accounts', value: stats.totalAccounts },
        { label: 'Active Accounts', value: stats.activeAccounts, subLabel: `${activePercentage}% of total` },
        { label: 'Inactive Accounts', value: stats.inactiveAccounts },
        { label: 'Closed Accounts', value: stats.closedAccounts || 0 },
        { label: 'Average per User', value: stats.usersWithAccounts > 0 ? (stats.totalAccounts / stats.usersWithAccounts).toFixed(1) : '0' },
      ]
    });
  };

  const openTotalBalanceModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Balance Breakdown',
      icon: 'fa-coins',
      color: 'success',
      data: [
        { label: 'Total Balance', value: formatCurrency(stats.totalBalance) },
        { label: 'Positive Balances', value: formatCurrency(stats.positiveBalance), subLabel: 'Assets' },
        { label: 'Negative Balances', value: formatCurrency(stats.negativeBalance), subLabel: 'Liabilities' },
        { label: 'Net Worth', value: formatCurrency(stats.totalBalance) },
        { label: 'Average per Account', value: formatCurrency(stats.totalAccounts > 0 ? stats.totalBalance / stats.totalAccounts : 0) },
      ]
    });
  };

  const openUsersWithAccountsModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Users with Accounts Breakdown',
      icon: 'fa-users',
      color: 'info',
      data: [
        { label: 'Users with Accounts', value: stats.usersWithAccounts },
        { label: 'Total Users', value: stats.totalUsers },
        { label: 'Coverage Rate', value: `${usersWithAccountsPercentage}%` },
        { label: 'Users without Accounts', value: stats.totalUsers - stats.usersWithAccounts },
        { label: 'Accounts per User', value: stats.usersWithAccounts > 0 ? (stats.totalAccounts / stats.usersWithAccounts).toFixed(1) : '0' },
      ]
    });
  };

  const openMonthlyGrowthModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Monthly Growth Breakdown',
      icon: 'fa-chart-line',
      color: 'warning',
      data: [
        { label: 'Growth Rate', value: `${stats.growthPercentage >= 0 ? '+' : ''}${stats.growthPercentage.toFixed(1)}%` },
        { label: 'New This Month', value: stats.newAccountsThisMonth },
        { label: 'New Last Month', value: stats.newAccountsLastMonth },
        { label: 'Change', value: stats.newAccountsThisMonth - stats.newAccountsLastMonth, subLabel: 'Month over month' },
        { label: 'Trend', value: stats.growthPercentage > 0 ? 'Growing' : stats.growthPercentage < 0 ? 'Declining' : 'Stable' },
      ]
    });
  };

  if (loading) {
    return (
      <>
        {/* Mobile Loading State */}
        <div className="d-block d-md-none mb-4">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-gray-200 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="row d-none d-md-flex">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-4">
              <div className="admin-stat-card admin-card-loading">
                <div className="card-content">
                  <div className="skeleton-line skeleton-stat-value mb-2"></div>
                  <div className="skeleton-line skeleton-stat-title"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Stats Cards */}
      <div className="d-block d-md-none mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalAccountsModal}>
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <i className="fas fa-university text-red-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Accounts</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.totalAccounts)}</p>
            <div className="flex items-center gap-1 mt-1 text-gray-400">
              <i className="fas fa-check-circle text-[8px]"></i>
              <span className="text-[9px] font-medium">{stats.activeAccounts} active, {stats.inactiveAccounts} inactive</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalBalanceModal}>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-coins text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Balance</p>
            <p className="text-sm font-bold text-gray-800 truncate">{formatCurrencyTruncated(stats.totalBalance)}</p>
            <div className="flex items-center gap-1 mt-1 text-emerald-500">
              <i className="fas fa-plus-circle text-[8px]"></i>
              <span className="text-[9px] font-medium">{formatCurrencyTruncated(stats.positiveBalance)}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openUsersWithAccountsModal}>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-users text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Users with Accounts</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.usersWithAccounts)}</p>
            <div className="flex items-center gap-1 mt-1 text-blue-500">
              <i className="fas fa-percentage text-[8px]"></i>
              <span className="text-[9px] font-medium">{usersWithAccountsPercentage}% coverage</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openMonthlyGrowthModal}>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-chart-line text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Monthly Growth</p>
            <p className={`text-sm font-bold ${stats.growthPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.growthPercentage >= 0 ? '+' : ''}{stats.growthPercentage.toFixed(1)}%
            </p>
            <div className="flex items-center gap-1 mt-1 text-gray-400">
              <i className="fas fa-calendar text-[8px]"></i>
              <span className="text-[9px] font-medium">This: {stats.newAccountsThisMonth} | Last: {stats.newAccountsLastMonth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Stats Cards */}
      <div className="row d-none d-md-flex">
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalAccountsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-danger text-uppercase mb-2">Total Accounts</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.totalAccounts)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-muted">
                    <i className="fas fa-check-circle mr-1"></i>
                    <span className="font-weight-medium">{stats.activeAccounts} active, {stats.inactiveAccounts} inactive</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-danger">
                    <i className="fas fa-university stat-icon"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer-link bg-danger">
              <div className="d-flex justify-content-between align-items-center py-2 px-4">
                <span className="font-weight-medium">View Details</span>
                <div className="footer-arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
            <div className="card-hover-overlay"></div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-success h-100 position-relative" onClick={openTotalBalanceModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-success text-uppercase mb-2">Total Balance</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{formatCurrencyTruncated(stats.totalBalance)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-success">
                    <i className="fas fa-plus-circle mr-1"></i>
                    <span className="font-weight-medium">{formatCurrencyTruncated(stats.positiveBalance)}</span>
                    <span className="ml-1 small">assets</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-success">
                    <i className="fas fa-coins stat-icon"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer-link bg-success">
              <div className="d-flex justify-content-between align-items-center py-2 px-4">
                <span className="font-weight-medium">View Details</span>
                <div className="footer-arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
            <div className="card-hover-overlay"></div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openUsersWithAccountsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-info text-uppercase mb-2">Users with Accounts</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.usersWithAccounts)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-info">
                    <i className="fas fa-percentage mr-1"></i>
                    <span className="font-weight-medium">{usersWithAccountsPercentage}%</span>
                    <span className="ml-1 small">coverage</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-info">
                    <i className="fas fa-users stat-icon"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer-link bg-info">
              <div className="d-flex justify-content-between align-items-center py-2 px-4">
                <span className="font-weight-medium">View Details</span>
                <div className="footer-arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
            <div className="card-hover-overlay"></div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openMonthlyGrowthModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-warning text-uppercase mb-2">Monthly Growth</div>
                  <div className={`stat-value mb-0 font-weight-bold ${stats.growthPercentage >= 0 ? 'text-success' : 'text-danger'}`}>
                    {stats.growthPercentage >= 0 ? '+' : ''}{stats.growthPercentage.toFixed(1)}%
                  </div>
                  <div className="stat-change mt-2 d-flex align-items-center text-muted">
                    <i className="fas fa-calendar mr-1"></i>
                    <span className="font-weight-medium">This: {stats.newAccountsThisMonth} | Last: {stats.newAccountsLastMonth}</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-warning">
                    <i className="fas fa-chart-line stat-icon"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer-link bg-warning">
              <div className="d-flex justify-content-between align-items-center py-2 px-4">
                <span className="font-weight-medium">View Details</span>
                <div className="footer-arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
            <div className="card-hover-overlay"></div>
          </div>
        </div>
      </div>

      {/* Stats Detail Modal */}
      <StatsDetailModal
        show={statsDetailModal.show}
        onClose={() => setStatsDetailModal(prev => ({ ...prev, show: false }))}
        title={statsDetailModal.title}
        icon={statsDetailModal.icon}
        color={statsDetailModal.color}
        data={statsDetailModal.data}
      />
    </>
  );
};

export default AccountStatsCards;
