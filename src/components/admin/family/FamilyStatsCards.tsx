import { FC, useState } from "react";
import { truncateNumber } from "../../../utils/helpers";
import { FamilyStats } from "./types";

interface FamilyStatsCardsProps {
  stats: FamilyStats;
  loading?: boolean;
}

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

const FamilyStatsCards: FC<FamilyStatsCardsProps> = ({ stats, loading = false }) => {
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

  // Calculate percentages
  const activePercentage = stats.totalFamilies > 0 ? ((stats.activeFamilies / stats.totalFamilies) * 100).toFixed(1) : "0";
  const inactiveFamilies = stats.totalFamilies - stats.activeFamilies;

  // Modal handlers
  const openTotalFamiliesModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Families Breakdown',
      icon: 'fa-users',
      color: 'danger',
      data: [
        { label: 'Total Families', value: stats.totalFamilies },
        { label: 'Active Families', value: stats.activeFamilies, subLabel: `${activePercentage}% of total` },
        { label: 'Inactive Families', value: inactiveFamilies, subLabel: `${(100 - Number(activePercentage)).toFixed(1)}% of total` },
        { label: 'Total Members', value: stats.totalMembers },
      ]
    });
  };

  const openActiveFamiliesModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Active Families Breakdown',
      icon: 'fa-user-check',
      color: 'success',
      data: [
        { label: 'Active Families', value: stats.activeFamilies },
        { label: 'Percentage of Total', value: `${activePercentage}%` },
        { label: 'Inactive Families', value: inactiveFamilies },
        { label: 'Avg. Members', value: stats.avgMembersPerFamily.toFixed(1) },
      ]
    });
  };

  const openTotalMembersModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Total Members Breakdown',
      icon: 'fa-user-friends',
      color: 'warning',
      data: [
        { label: 'Total Members', value: stats.totalMembers },
        { label: 'Across Families', value: stats.totalFamilies },
        { label: 'Avg. Per Family', value: stats.avgMembersPerFamily.toFixed(1) },
        { label: 'Active Families', value: stats.activeFamilies },
      ]
    });
  };

  const openAvgMembersModal = () => {
    setStatsDetailModal({
      show: true,
      title: 'Average Members Overview',
      icon: 'fa-chart-line',
      color: 'info',
      data: [
        { label: 'Avg. Members Per Family', value: stats.avgMembersPerFamily.toFixed(1) },
        { label: 'Total Members', value: stats.totalMembers },
        { label: 'Total Families', value: stats.totalFamilies },
        { label: 'Active Families', value: stats.activeFamilies },
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
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalFamiliesModal}>
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <i className="fas fa-users text-red-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Families</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.totalFamilies)}</p>
            <div className="flex items-center gap-1 mt-1 text-gray-400">
              <i className="fas fa-users text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{inactiveFamilies} inactive</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openActiveFamiliesModal}>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <i className="fas fa-user-check text-emerald-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Active Families</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.activeFamilies)}</p>
            <div className="flex items-center gap-1 mt-1 text-emerald-500">
              <i className="fas fa-arrow-up text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{activePercentage}% of total</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openTotalMembersModal}>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <i className="fas fa-user-friends text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Total Members</p>
            <p className="text-sm font-bold text-gray-800">{truncateNumber(stats.totalMembers)}</p>
            <div className="flex items-center gap-1 mt-1 text-amber-500">
              <i className="fas fa-home text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">{stats.totalFamilies} families</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100" onClick={openAvgMembersModal}>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <i className="fas fa-chart-line text-blue-500 text-xs"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Avg. Members</p>
            <p className="text-sm font-bold text-gray-800">{stats.avgMembersPerFamily.toFixed(1)}</p>
            <div className="flex items-center gap-1 mt-1 text-blue-500">
              <i className="fas fa-users text-[8px]"></i>
              <span className="text-[9px] font-medium truncate">per family</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Stats Cards */}
      <div className="row d-none d-md-flex">
        {/* Total Families Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-danger h-100 position-relative" onClick={openTotalFamiliesModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-danger text-uppercase mb-2">Total Families</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.totalFamilies)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-muted">
                    <i className="fas fa-users mr-1"></i>
                    <span className="font-weight-medium text-truncate">{inactiveFamilies} inactive</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-danger">
                    <i className="fas fa-users stat-icon"></i>
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

        {/* Active Families Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-success h-100 position-relative" onClick={openActiveFamiliesModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-success text-uppercase mb-2">Active Families</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.activeFamilies)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-success">
                    <i className="fas fa-arrow-up mr-1"></i>
                    <span className="font-weight-medium">{activePercentage}%</span>
                    <span className="ml-1 small text-truncate">of total</span>
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

        {/* Total Members Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-warning h-100 position-relative" onClick={openTotalMembersModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-warning text-uppercase mb-2">Total Members</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{truncateNumber(stats.totalMembers)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-warning">
                    <i className="fas fa-home mr-1"></i>
                    <span className="font-weight-medium">{stats.totalFamilies}</span>
                    <span className="ml-1 small text-truncate">families</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-warning">
                    <i className="fas fa-user-friends stat-icon"></i>
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

        {/* Avg. Members Per Family Card */}
        <div className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className="admin-stat-card admin-stat-card-info h-100 position-relative" onClick={openAvgMembersModal} style={{ cursor: 'pointer' }}>
            <div className="card-bg-pattern"></div>
            <div className="card-content">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="stat-title text-info text-uppercase mb-2">Avg. Members</div>
                  <div className="stat-value mb-0 font-weight-bold text-gray-800">{stats.avgMembersPerFamily.toFixed(1)}</div>
                  <div className="stat-change mt-2 d-flex align-items-center text-info">
                    <i className="fas fa-users mr-1"></i>
                    <span className="font-weight-medium text-truncate">per family</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-icon-container stat-icon-info">
                    <i className="fas fa-chart-line stat-icon"></i>
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

export default FamilyStatsCards;
