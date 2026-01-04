import React, { FC, useState } from "react";
import { AIInsightStats } from "./types";
import { truncateNumber } from "../../../utils/helpers";

interface AIInsightsStatsCardsProps {
  stats: AIInsightStats;
  loading?: boolean;
}

// Stats Card Detail Modal Component
interface StatsDetailModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  color: string;
  icon: string;
  data: {
    label: string;
    value: string | number;
    subLabel?: string;
  }[];
}

const StatsDetailModal: FC<StatsDetailModalProps> = ({ show, onClose, title, color, icon, data }) => {
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
                    Data reflects current AI insights statistics
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

const AIInsightsStatsCards: FC<AIInsightsStatsCardsProps> = ({ stats, loading = false }) => {
  // Stats detail modal state
  const [statsDetailModal, setStatsDetailModal] = useState<{
    show: boolean;
    title: string;
    color: string;
    icon: string;
    data: { label: string; value: string | number; subLabel?: string }[];
  }>({ show: false, title: '', color: '', icon: '', data: [] });

  if (loading) {
    return (
      <>
        {/* Mobile Stats Cards Skeleton */}
        <div className="block md:hidden mb-4">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className="skeleton-icon w-7 h-7 rounded-lg mb-2"></div>
                <div className="skeleton-line skeleton-stat-title mb-1"></div>
                <div className="skeleton-line skeleton-stat-value mb-1"></div>
                <div className="skeleton-line skeleton-stat-subtitle"></div>
              </div>
            ))}
          </div>
        </div>
        {/* Desktop Stats Cards Skeleton */}
        <div className="row d-none d-md-flex">
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
      </>
    );
  }

  // Calculate derived stats
  const activePercentage = stats.totalUsers > 0 
    ? ((stats.activeServices / stats.totalUsers) * 100).toFixed(1) 
    : '0.0';
  const successRate = stats.processingMetrics.successRate.toFixed(1);
  const totalRiskInsights = stats.riskDistribution.high + stats.riskDistribution.medium + stats.riskDistribution.low + stats.riskDistribution.unknown;
  const highRiskPercentage = totalRiskInsights > 0 
    ? ((stats.riskDistribution.high / totalRiskInsights) * 100).toFixed(1) 
    : '0.0';

  // Modal open handlers
  const openTotalInsightsModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Insights Breakdown',
      color: 'danger',
      icon: 'fa-brain',
      data: [
        { label: 'Total Insights Generated', value: stats.totalInsights },
        { label: 'OpenRouter Insights', value: stats.serviceUsage.openrouter, subLabel: 'AI-powered analysis' },
        { label: 'ChatBot Insights', value: stats.serviceUsage.chatbot, subLabel: 'Conversational AI' },
        { label: 'Prophet Insights', value: stats.serviceUsage.prophet, subLabel: 'Predictive modeling' },
        { label: 'Fallback Insights', value: stats.serviceUsage.fallback, subLabel: 'Backup service' },
        { label: 'Usage Today', value: stats.usageToday },
        { label: 'Rate Limited Today', value: stats.rateLimitedToday },
      ]
    });
  };

  const openActiveUsersModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Active Users Breakdown',
      color: 'success',
      icon: 'fa-user-check',
      data: [
        { label: 'Active Users', value: stats.activeServices },
        { label: 'Total Users', value: stats.totalUsers },
        { label: 'Active Percentage', value: `${activePercentage}%`, subLabel: 'Users with insights' },
        { label: 'Insights per User', value: stats.totalUsers > 0 ? (stats.totalInsights / stats.totalUsers).toFixed(1) : '0', subLabel: 'Average' },
      ]
    });
  };

  const openAccuracyModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Accuracy & Performance',
      color: 'warning',
      icon: 'fa-bullseye',
      data: [
        { label: 'Average Confidence', value: `${stats.averageConfidence.toFixed(1)}%` },
        { label: 'Success Rate', value: `${successRate}%`, subLabel: 'Processing success' },
        { label: 'Avg Processing Time', value: `${stats.processingMetrics.averageTime.toFixed(0)}ms` },
        { label: 'Total Tokens Used', value: truncateNumber(stats.processingMetrics.totalTokens), subLabel: 'API consumption' },
      ]
    });
  };

  const openRiskDistributionModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Risk Distribution',
      color: 'info',
      icon: 'fa-shield-alt',
      data: [
        { label: 'High Risk', value: stats.riskDistribution.high, subLabel: `${highRiskPercentage}% of total` },
        { label: 'Medium Risk', value: stats.riskDistribution.medium, subLabel: 'Moderate attention needed' },
        { label: 'Low Risk', value: stats.riskDistribution.low, subLabel: 'Healthy financial status' },
        { label: 'Unknown Risk', value: stats.riskDistribution.unknown, subLabel: 'Pending assessment' },
        { label: 'Total Assessed', value: totalRiskInsights },
      ]
    });
  };

  return (
    <>
      {/* Mobile Stats Cards */}
      <div className="block md:hidden mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalInsightsModal}>
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <i className="fas fa-brain text-red-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Insights</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.totalInsights)}</p>
            <div className="flex items-center gap-1 mt-1 text-gray-400">
              <i className="fas fa-chart-line text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{stats.usageToday} today</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openActiveUsersModal}>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-user-check text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Active Users</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.activeServices)}</p>
            <div className="flex items-center gap-1 mt-1 text-emerald-500">
              <i className="fas fa-arrow-up text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{activePercentage}% of total</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openAccuracyModal}>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-bullseye text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Average Accuracy</p>
            <p className="text-sm font-bold text-gray-800">{stats.averageConfidence.toFixed(1)}%</p>
            <div className="flex items-center gap-1 mt-1 text-amber-500">
              <i className="fas fa-check-circle text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{successRate}% success</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openRiskDistributionModal}>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-shield-alt text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Users</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.totalUsers)}</p>
            <div className="flex items-center gap-1 mt-1 text-blue-500">
              <i className="fas fa-exclamation-triangle text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{stats.riskDistribution.high} high risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Stats Cards */}
      <div className="row d-none d-md-flex">
        {/* Total Insights Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalInsightsModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-danger text-uppercase mb-2">Total Insights</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.totalInsights)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-muted">
                    <i className="fas fa-chart-line mr-1"></i>
                    <span className="font-weight-medium text-truncate" style={{ maxWidth: '120px' }}>{stats.usageToday} generated today</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-danger">
                    <i className="fas fa-brain stat-icon"></i>
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
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.activeServices)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-success">
                    <i className="fas fa-arrow-up mr-1"></i>
                    <span className="font-weight-medium">{activePercentage}%</span>
                    <span className="ml-1 small text-truncate" style={{ maxWidth: '80px' }}>of total</span>
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
          <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openAccuracyModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-warning text-uppercase mb-2">Average Accuracy</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{stats.averageConfidence.toFixed(1)}%</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-warning">
                    <i className="fas fa-check-circle mr-1"></i>
                    <span className="font-weight-medium text-truncate" style={{ maxWidth: '100px' }}>{successRate}% success rate</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-warning">
                    <i className="fas fa-bullseye stat-icon"></i>
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

        {/* Total Users Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openRiskDistributionModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-info text-uppercase mb-2">Total Users</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.totalUsers)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-info">
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    <span className="font-weight-medium text-truncate" style={{ maxWidth: '100px' }}>{stats.riskDistribution.high} high risk</span>
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
        onClose={() => setStatsDetailModal({ ...statsDetailModal, show: false })}
        title={statsDetailModal.title}
        color={statsDetailModal.color}
        icon={statsDetailModal.icon}
        data={statsDetailModal.data}
      />
    </>
  );
};

export default AIInsightsStatsCards;
