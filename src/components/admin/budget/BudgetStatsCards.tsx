import { FC, useState } from "react";
import { BudgetStats } from "./types";
import { truncateNumber } from "../../../utils/helpers";

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

interface BudgetStatsCardsProps {
  stats: BudgetStats;
  loading?: boolean;
}

const BudgetStatsCards: FC<BudgetStatsCardsProps> = ({ stats, loading = false }) => {
  // Stats detail modal state
  const [statsDetailModal, setStatsDetailModal] = useState<{
    show: boolean;
    title: string;
    icon: string;
    color: string;
    data: { label: string; value: string | number; subLabel?: string }[];
  }>({ show: false, title: '', icon: '', color: '', data: [] });

  // Calculate percentages
  const activePercentage = stats.totalBudgets > 0 
    ? ((stats.activeBudgets / stats.totalBudgets) * 100).toFixed(1) 
    : '0';
  const inactiveBudgets = stats.totalBudgets - stats.activeBudgets;
  const inactivePercentage = stats.totalBudgets > 0 
    ? ((inactiveBudgets / stats.totalBudgets) * 100).toFixed(1) 
    : '0';

  // Get category count from budgetsByCategory
  const categoryCount = Object.keys(stats.budgetsByCategory || {}).length;
  
  // Get status counts
  const statusCounts = stats.budgetsByStatus || {};
  const completedBudgets = statusCounts['completed'] || 0;
  const archivedBudgets = statusCounts['archived'] || 0;

  // Modal open handlers
  const openTotalBudgetsModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Budgets Breakdown',
      icon: 'fa-calculator',
      color: 'danger',
      data: [
        { label: 'Total Budgets', value: stats.totalBudgets },
        { label: 'Active Budgets', value: stats.activeBudgets, subLabel: `${activePercentage}% of total` },
        { label: 'Inactive Budgets', value: inactiveBudgets, subLabel: `${inactivePercentage}% of total` },
        { label: 'Completed Budgets', value: completedBudgets },
        { label: 'Archived Budgets', value: archivedBudgets },
      ]
    });
  };

  const openActiveBudgetsModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Active Budgets Breakdown',
      icon: 'fa-check-circle',
      color: 'success',
      data: [
        { label: 'Active Budgets', value: stats.activeBudgets },
        { label: 'Percentage of Total', value: `${activePercentage}%` },
        { label: 'Inactive Budgets', value: inactiveBudgets },
        { label: 'Completed Budgets', value: completedBudgets },
        { label: 'Active Rate', value: `${activePercentage}%`, subLabel: 'Currently tracking' },
      ]
    });
  };

  const openBudgetCategoriesModal = () => {
    // Get top categories
    const categories = Object.entries(stats.budgetsByCategory || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const categoryData: { label: string; value: string | number; subLabel?: string }[] = [
      { label: 'Total Categories', value: stats.budgetCategories || categoryCount },
      { label: 'Budgets per Category', value: stats.totalBudgets > 0 && categoryCount > 0 ? (stats.totalBudgets / categoryCount).toFixed(1) : '0', subLabel: 'Average' },
    ];
    
    // Add top categories
    categories.forEach(([category, count]) => {
      categoryData.push({ 
        label: category || 'Uncategorized', 
        value: count, 
        subLabel: `${stats.totalBudgets > 0 ? ((count / stats.totalBudgets) * 100).toFixed(1) : 0}% of budgets` 
      });
    });

    setStatsDetailModal({
      show: true,
      title: 'Budget Categories Breakdown',
      icon: 'fa-tags',
      color: 'warning',
      data: categoryData
    });
  };

  const openUsersWithBudgetsModal = () => {
    // Get user distribution
    const userCount = Object.keys(stats.budgetsByUser || {}).length;
    const avgBudgetsPerUser = userCount > 0 ? (stats.totalBudgets / userCount).toFixed(1) : '0';
    
    setStatsDetailModal({
      show: true,
      title: 'Users with Budgets Breakdown',
      icon: 'fa-users',
      color: 'info',
      data: [
        { label: 'Users with Budgets', value: stats.usersWithBudgets },
        { label: 'Total Budgets', value: stats.totalBudgets },
        { label: 'Budgets per User', value: avgBudgetsPerUser, subLabel: 'Average' },
        { label: 'Active Budgets', value: stats.activeBudgets },
        { label: 'Active per User', value: stats.usersWithBudgets > 0 ? (stats.activeBudgets / stats.usersWithBudgets).toFixed(1) : '0', subLabel: 'Average active' },
      ]
    });
  };

  if (loading) {
    return (
      <>
        {/* Mobile Loading State */}
        <div className="block md:hidden mb-4">
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
      <div className="block md:hidden mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalBudgetsModal}>
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <i className="fas fa-calculator text-red-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Budgets</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.totalBudgets)}</p>
            <div className="flex items-center gap-1 mt-1 text-gray-400">
              <i className="fas fa-chart-pie text-[8px]"></i>
              <span className="text-[9px] font-medium">{stats.activeBudgets} active, {inactiveBudgets} inactive</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openActiveBudgetsModal}>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-check-circle text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Active Budgets</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.activeBudgets)}</p>
            <div className="flex items-center gap-1 mt-1 text-emerald-500">
              <i className="fas fa-arrow-up text-[8px]"></i>
              <span className="text-[9px] font-medium">{activePercentage}% of total</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openBudgetCategoriesModal}>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-tags text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Budget Categories</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.budgetCategories || categoryCount)}</p>
            <div className="flex items-center gap-1 mt-1 text-amber-500">
              <i className="fas fa-layer-group text-[8px]"></i>
              <span className="text-[9px] font-medium">{categoryCount > 0 ? (stats.totalBudgets / categoryCount).toFixed(1) : 0} per category</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openUsersWithBudgetsModal}>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-users text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Users with Budgets</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.usersWithBudgets)}</p>
            <div className="flex items-center gap-1 mt-1 text-blue-500">
              <i className="fas fa-user-check text-[8px]"></i>
              <span className="text-[9px] font-medium">{stats.usersWithBudgets > 0 ? (stats.totalBudgets / stats.usersWithBudgets).toFixed(1) : 0} budgets/user</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Stats Cards */}
      <div className="row d-none d-md-flex">
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalBudgetsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-danger text-uppercase mb-2">Total Budgets</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.totalBudgets)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-muted">
                    <i className="fas fa-chart-pie mr-1"></i>
                    <span className="font-weight-medium">{stats.activeBudgets} active, {inactiveBudgets} inactive</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-danger">
                    <i className="fas fa-calculator stat-icon"></i>
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
          <div className="admin-stat-card admin-stat-card-success h-100 position-relative" onClick={openActiveBudgetsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-success text-uppercase mb-2">Active Budgets</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.activeBudgets)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-success">
                    <i className="fas fa-arrow-up mr-1"></i>
                    <span className="font-weight-medium">{activePercentage}%</span>
                    <span className="ml-1 small">of total</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-success">
                    <i className="fas fa-check-circle stat-icon"></i>
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
          <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openBudgetCategoriesModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-warning text-uppercase mb-2">Budget Categories</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.budgetCategories || categoryCount)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-warning">
                    <i className="fas fa-layer-group mr-1"></i>
                    <span className="font-weight-medium">{categoryCount > 0 ? (stats.totalBudgets / categoryCount).toFixed(1) : 0}</span>
                    <span className="ml-1 small">per category</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-warning">
                    <i className="fas fa-tags stat-icon"></i>
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
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openUsersWithBudgetsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-info text-uppercase mb-2">Users with Budgets</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.usersWithBudgets)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-info">
                    <i className="fas fa-user-check mr-1"></i>
                    <span className="font-weight-medium">{stats.usersWithBudgets > 0 ? (stats.totalBudgets / stats.usersWithBudgets).toFixed(1) : 0}</span>
                    <span className="ml-1 small">budgets/user</span>
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

export default BudgetStatsCards;
