import { FC, useState } from "react";
import { formatCurrency, formatCurrencyTruncated, truncateNumber } from "../../../utils/helpers";
import { GoalStatsCardsProps } from "./types";

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

const GoalStatsCards: FC<GoalStatsCardsProps> = ({ summary, loading = false }) => {
  const [statsDetailModal, setStatsDetailModal] = useState<{
    show: boolean;
    title: string;
    icon: string;
    color: string;
    data: { label: string; value: string | number; subLabel?: string }[];
  }>({ show: false, title: '', icon: '', color: '', data: [] });

  if (loading) {
    return (
      <div className="stats-section mb-5">
        <div className="row">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-4">
              <div className="card shadow h-100 py-3 admin-card admin-card-loading">
                <div className="card-body text-center">
                  <div className="skeleton-line skeleton-stat-value mb-2"></div>
                  <div className="skeleton-line skeleton-stat-title"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Stats are now calculated based on progress percentage in AdminGoals
  // Active = progress < 100%, Completed = progress >= 100%
  const activeGoalsCount = summary.activeGoals;
  const activePercentage = summary.totalGoals > 0 ? ((activeGoalsCount / summary.totalGoals) * 100).toFixed(1) : "0";
  const completedPercentage = summary.totalGoals > 0 ? ((summary.completedGoals / summary.totalGoals) * 100).toFixed(1) : "0";
  const progressPercentage = summary.overallProgress.toFixed(1);

  // Modal handlers
  const openTotalGoalsModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Goals Breakdown',
      icon: 'fa-bullseye',
      color: 'danger',
      data: [
        { label: 'Total Goals', value: summary.totalGoals },
        { label: 'Active Goals', value: activeGoalsCount, subLabel: `${activePercentage}% of total` },
        { label: 'Completed Goals', value: summary.completedGoals, subLabel: `${completedPercentage}% of total` },
        { label: 'Overdue Goals', value: summary.overdueGoals },
      ]
    });
  };

  const openActiveGoalsModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Active Goals Breakdown',
      icon: 'fa-play-circle',
      color: 'success',
      data: [
        { label: 'Active Goals', value: activeGoalsCount },
        { label: 'Percentage of Total', value: `${activePercentage}%` },
        { label: 'High Priority', value: summary.goalsByPriority.high },
        { label: 'Medium Priority', value: summary.goalsByPriority.medium },
        { label: 'Low Priority', value: summary.goalsByPriority.low },
        { label: 'Overdue Goals', value: summary.overdueGoals },
      ]
    });
  };

  const openTargetAmountModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Target Amount Breakdown',
      icon: 'fa-chart-line',
      color: 'warning',
      data: [
        { label: 'Total Target', value: formatCurrency(summary.totalTargetAmount) },
        { label: 'Total Saved', value: formatCurrency(summary.totalCurrentAmount) },
        { label: 'Remaining Amount', value: formatCurrency(summary.totalRemainingAmount) },
        { label: 'Overall Progress', value: `${progressPercentage}%` },
        { label: 'Average Progress', value: `${summary.averageProgress.toFixed(1)}%` },
      ]
    });
  };

  const openProgressModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Progress Overview',
      icon: 'fa-percentage',
      color: 'info',
      data: [
        { label: 'Overall Progress', value: `${progressPercentage}%` },
        { label: 'Average Progress', value: `${summary.averageProgress.toFixed(1)}%` },
        { label: 'Completed This Month', value: summary.goalsCompletedThisMonth },
        { label: 'Total Saved', value: formatCurrency(summary.totalCurrentAmount) },
        { label: 'Remaining to Save', value: formatCurrency(summary.totalRemainingAmount) },
      ]
    });
  };

  return (
    <div className="stats-section mb-5">
      {/* Stats Detail Modal */}
      <StatsDetailModal
        show={statsDetailModal.show}
        onClose={() => setStatsDetailModal({ ...statsDetailModal, show: false })}
        title={statsDetailModal.title}
        icon={statsDetailModal.icon}
        color={statsDetailModal.color}
        data={statsDetailModal.data}
      />

      {/* Mobile Stats Cards */}
      <div className="block md:hidden mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalGoalsModal}>
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <i className="fas fa-bullseye text-red-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Goals</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(summary.totalGoals)}</p>
            <div className="flex items-center gap-1 mt-1 text-gray-400">
              <i className="fas fa-flag text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{summary.overdueGoals} overdue</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openActiveGoalsModal}>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-play-circle text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Active Goals</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(activeGoalsCount)}</p>
            <div className="flex items-center gap-1 mt-1 text-emerald-500">
              <i className="fas fa-arrow-up text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{activePercentage}% of total</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTargetAmountModal}>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-chart-line text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Target</p>
            <p className="text-sm font-bold text-gray-800 truncate">{formatCurrencyTruncated(summary.totalTargetAmount)}</p>
            <div className="flex items-center gap-1 mt-1 text-amber-500">
              <i className="fas fa-piggy-bank text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{formatCurrencyTruncated(summary.totalCurrentAmount)} saved</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openProgressModal}>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-percentage text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Overall Progress</p>
            <p className="text-sm font-bold text-gray-800">{progressPercentage}%</p>
            <div className="flex items-center gap-1 mt-1 text-blue-500">
              <i className="fas fa-check-circle text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{summary.completedGoals} completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Stats Cards */}
      <div className="row d-none d-md-flex">
        {/* Total Goals Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalGoalsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-danger text-uppercase mb-2">Total Goals</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(summary.totalGoals)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-muted">
                    <i className="fas fa-flag mr-1"></i>
                    <span className="font-weight-medium text-truncate">{summary.overdueGoals} overdue</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-danger">
                    <i className="fas fa-bullseye stat-icon"></i>
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

        {/* Active Goals Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-success h-100 position-relative" onClick={openActiveGoalsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-success text-uppercase mb-2">Active Goals</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(activeGoalsCount)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-success">
                    <i className="fas fa-arrow-up mr-1"></i>
                    <span className="font-weight-medium">{activePercentage}%</span>
                    <span className="ml-1 small text-truncate">of total</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-success">
                    <i className="fas fa-play-circle stat-icon"></i>
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

        {/* Total Target Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openTargetAmountModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-warning text-uppercase mb-2">Total Target</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800 text-truncate">{formatCurrencyTruncated(summary.totalTargetAmount)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-warning">
                    <i className="fas fa-piggy-bank mr-1"></i>
                    <span className="font-weight-medium text-truncate">{formatCurrencyTruncated(summary.totalCurrentAmount)}</span>
                    <span className="ml-1 small text-truncate">saved</span>
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

        {/* Overall Progress Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openProgressModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-info text-uppercase mb-2">Overall Progress</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{progressPercentage}%</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-info">
                    <i className="fas fa-check-circle mr-1"></i>
                    <span className="font-weight-medium">{summary.completedGoals}</span>
                    <span className="ml-1 small text-truncate">completed</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-info">
                    <i className="fas fa-percentage stat-icon"></i>
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
    </div>
  );
};

export default GoalStatsCards;
