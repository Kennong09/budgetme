import { FC, useState } from "react";
import { PredictionStats } from "./types";
import { truncateNumber } from "../../../utils/helpers";

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
                    Data reflects current prediction statistics
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

interface PredictionStatsCardsProps {
  stats: PredictionStats;
  loading?: boolean;
}

const PredictionStatsCards: FC<PredictionStatsCardsProps> = ({ stats, loading = false }) => {
  const [statsDetailModal, setStatsDetailModal] = useState<{
    show: boolean;
    title: string;
    icon: string;
    color: string;
    data: { label: string; value: string | number; subLabel?: string }[];
  }>({ show: false, title: '', icon: '', color: '', data: [] });

  if (loading) {
    return (
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
    );
  }

  // Calculate derived stats
  const activePercentage = stats.predictionUsers > 0 
    ? ((stats.activePredictions / stats.predictionUsers) * 100).toFixed(1) 
    : '0';
  const pendingUsers = stats.predictionsByStatus?.pending || 0;
  const errorUsers = stats.predictionsByStatus?.error || 0;
  const inactivePredictions = stats.predictionUsers - stats.activePredictions;

  // Modal handlers
  const openTotalPredictionsModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Predictions Breakdown',
      icon: 'fa-chart-line',
      color: 'danger',
      data: [
        { label: 'Total Predictions', value: truncateNumber(stats.totalPredictions) },
        { label: 'Income Predictions', value: truncateNumber(stats.predictionsByType?.income || 0), subLabel: 'Financial income forecasts' },
        { label: 'Expense Predictions', value: truncateNumber(stats.predictionsByType?.expense || 0), subLabel: 'Spending pattern forecasts' },
        { label: 'Savings Predictions', value: truncateNumber(stats.predictionsByType?.savings || 0), subLabel: 'Savings goal forecasts' },
      ]
    });
  };

  const openActiveUsersModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Active Users Breakdown',
      icon: 'fa-user-check',
      color: 'success',
      data: [
        { label: 'Active Users', value: truncateNumber(stats.activePredictions) },
        { label: 'Percentage of Total', value: `${activePercentage}%` },
        { label: 'Pending Users', value: truncateNumber(pendingUsers), subLabel: 'Awaiting first prediction' },
        { label: 'Users with Errors', value: truncateNumber(errorUsers), subLabel: 'Prediction generation failed' },
      ]
    });
  };

  const openAccuracyModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Prediction Accuracy Breakdown',
      icon: 'fa-bullseye',
      color: 'info',
      data: [
        { label: 'Average Accuracy', value: `${(stats.averageAccuracy || 0).toFixed(1)}%` },
        { label: 'High Accuracy (>80%)', value: 'Good', subLabel: 'Model performing well' },
        { label: 'Model Confidence', value: `${(stats.averageAccuracy || 0).toFixed(1)}%`, subLabel: 'Based on historical data' },
        { label: 'Prediction Quality', value: stats.averageAccuracy >= 70 ? 'Reliable' : 'Improving', subLabel: 'Overall model assessment' },
      ]
    });
  };

  const openTotalUsersModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Users Breakdown',
      icon: 'fa-users',
      color: 'warning',
      data: [
        { label: 'Total Users', value: truncateNumber(stats.predictionUsers) },
        { label: 'Active Users', value: truncateNumber(stats.activePredictions), subLabel: `${activePercentage}% of total` },
        { label: 'Inactive Users', value: truncateNumber(inactivePredictions), subLabel: 'No recent predictions' },
        { label: 'User to Prediction Ratio', value: stats.predictionUsers > 0 ? (stats.totalPredictions / stats.predictionUsers).toFixed(1) : '0', subLabel: 'Avg predictions per user' },
      ]
    });
  };

  return (
    <>
      {/* Mobile Stats Cards */}
      <div className="block md:hidden mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalPredictionsModal}>
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <i className="fas fa-chart-line text-red-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Predictions</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.totalPredictions)}</p>
            <div className="flex items-center gap-1 mt-1 text-gray-400">
              <i className="fas fa-database text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{truncateNumber(stats.predictionsByType?.income || 0)} inc...</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openActiveUsersModal}>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-user-check text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Active Users</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.activePredictions)}</p>
            <div className="flex items-center gap-1 mt-1 text-emerald-500">
              <i className="fas fa-arrow-up text-[8px]"></i>
              <span className="text-[9px] font-medium">{activePercentage}% of total</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openAccuracyModal}>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-bullseye text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Avg Accuracy</p>
            <p className="text-sm font-bold text-gray-800">{(stats.averageAccuracy || 0).toFixed(1)}%</p>
            <div className="flex items-center gap-1 mt-1 text-blue-500">
              <i className="fas fa-chart-bar text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">Model confidence</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalUsersModal}>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-users text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Users</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.predictionUsers)}</p>
            <div className="flex items-center gap-1 mt-1 text-amber-500">
              <i className="fas fa-user text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{truncateNumber(inactivePredictions)} inactive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Stats Cards */}
      <div className="row d-none d-md-flex">
        {/* Total Predictions Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalPredictionsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-danger text-uppercase mb-2">Total Predictions</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.totalPredictions)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-muted">
                    <i className="fas fa-database mr-1"></i>
                    <span className="font-weight-medium text-truncate">{truncateNumber(stats.predictionsByType?.income || 0)} income, {truncateNumber(stats.predictionsByType?.expense || 0)} expense</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-danger">
                    <i className="fas fa-chart-line stat-icon"></i>
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

        {/* Active Users Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-success h-100 position-relative" onClick={openActiveUsersModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-success text-uppercase mb-2">Active Users</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.activePredictions)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-success">
                    <i className="fas fa-arrow-up mr-1"></i>
                    <span className="font-weight-medium">{activePercentage}%</span>
                    <span className="ml-1 small">of total</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-success">
                    <i className="fas fa-user-check stat-icon"></i>
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

        {/* Average Accuracy Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openAccuracyModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-info text-uppercase mb-2">Average Accuracy</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{(stats.averageAccuracy || 0).toFixed(1)}%</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-info">
                    <i className="fas fa-chart-bar mr-1"></i>
                    <span className="font-weight-medium text-truncate">Model confidence</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-info">
                    <i className="fas fa-bullseye stat-icon"></i>
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

        {/* Total Users Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openTotalUsersModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-warning text-uppercase mb-2">Total Users</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.predictionUsers)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-muted">
                    <i className="fas fa-user mr-1"></i>
                    <span className="font-weight-medium text-truncate">{truncateNumber(inactivePredictions)} inactive</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-warning">
                    <i className="fas fa-users stat-icon"></i>
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
        onClose={() => setStatsDetailModal({ ...statsDetailModal, show: false })}
        title={statsDetailModal.title}
        icon={statsDetailModal.icon}
        color={statsDetailModal.color}
        data={statsDetailModal.data}
      />
    </>
  );
};

export default PredictionStatsCards;
