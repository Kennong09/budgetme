import { FC, useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "./types";
import { truncateNumber } from "../../../utils/helpers";

interface DashboardStatsCardsProps {
  statCards: StatCard[];
  loading?: boolean;
  onRefresh?: () => void;
}

const DashboardStatsCards: FC<DashboardStatsCardsProps> = ({ statCards, loading = false, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setTimeout(() => setRefreshing(false), 500); // Add slight delay for better UX
    }
  };

  // Helper to get mobile color classes based on card color
  const getMobileColorClasses = (color: string) => {
    switch (color) {
      case 'danger':
        return { bg: 'bg-red-100', text: 'text-red-500', icon: 'bg-red-500' };
      case 'success':
        return { bg: 'bg-emerald-100', text: 'text-emerald-500', icon: 'bg-emerald-500' };
      case 'warning':
        return { bg: 'bg-amber-100', text: 'text-amber-500', icon: 'bg-amber-500' };
      case 'info':
        return { bg: 'bg-blue-100', text: 'text-blue-500', icon: 'bg-blue-500' };
      case 'primary':
        return { bg: 'bg-indigo-100', text: 'text-indigo-500', icon: 'bg-indigo-500' };
      default:
        return { bg: 'bg-red-100', text: 'text-red-500', icon: 'bg-red-500' };
    }
  };

  if (loading) {
    return (
      <>
        {/* Mobile Loading State */}
        <div className="block md:hidden">
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
        <div className="hidden md:block">
          <div className="row">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-4">
                <div className="card shadow h-100 py-3 admin-card admin-card-loading">
                  <div className="card-body">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="skeleton-line skeleton-title mb-2"></div>
                        <div className="skeleton-line skeleton-value mb-3"></div>
                        <div className="skeleton-line skeleton-change"></div>
                      </div>
                      <div className="col-auto d-none d-sm-block">
                        <div className="skeleton-icon"></div>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer">
                    <div className="skeleton-line skeleton-footer"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="stats-cards-container">
      {/* Mobile Stats Cards - Grid layout like Dashboard */}
      <div className="block md:hidden mb-4">
        <div className="grid grid-cols-2 gap-2">
          {statCards.map((card, index) => {
            const colors = getMobileColorClasses(card.color);
            return (
              <Link
                key={index}
                to={card.link}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center mb-2`}>
                  <i className={`fas ${card.icon} ${colors.text} text-xs`}></i>
                </div>
                <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">{card.title}</p>
                <p className="text-sm font-bold text-gray-800 truncate">
                  {typeof card.value === 'number' ? truncateNumber(card.value) : card.value}
                </p>
                {card.change && (
                  <div className={`flex items-center gap-1 mt-1 ${
                    card.changeType === 'increase' ? 'text-emerald-500' :
                    card.changeType === 'decrease' ? 'text-rose-500' : 'text-gray-400'
                  }`}>
                    <i className={`fas fa-${
                      card.changeType === 'increase' ? 'arrow-up' :
                      card.changeType === 'decrease' ? 'arrow-down' : 'minus'
                    } text-[8px]`}></i>
                    <span className="text-[9px] font-medium">{card.change}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop Stats Header with Refresh Button */}
      <div className="d-none d-md-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="text-gray-800 font-weight-bold mb-0">Dashboard Overview</h5>
          <p className="text-muted small mb-0">Real-time statistics and key metrics</p>
        </div>
        {onRefresh && (
          <button 
            className="btn btn-outline-danger btn-sm shadow-sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <i className={`fas fa-sync-alt mr-1 ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Desktop Stats Cards Grid */}
      <div className="row d-none d-md-flex">
        {statCards.map((card, index) => (
          <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-4">
            <div className={`admin-stat-card admin-stat-card-${card.color} h-100 position-relative`}>
              {/* Card Background Pattern */}
              <div className="card-bg-pattern"></div>
              
              {/* Card Content */}
              <div className="card-content">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className={`stat-title text-${card.color} text-uppercase mb-2`}>
                      {card.title}
                    </div>
                    <div className="stat-value mb-0 font-weight-bold text-gray-800">
                      {typeof card.value === 'number' ? truncateNumber(card.value) : card.value}
                    </div>
                    {card.change && (
                      <div className={`stat-change mt-2 d-flex align-items-center ${
                        card.changeType === "increase" ? "text-success" : 
                        card.changeType === "decrease" ? "text-danger" : "text-muted"
                      }`}>
                        <i className={`fas ${
                          card.changeType === "increase" ? "fa-arrow-up" :
                          card.changeType === "decrease" ? "fa-arrow-down" : "fa-equals"
                        } mr-1`}></i>
                        <span className="font-weight-medium">{card.change}</span>
                        <span className="ml-1 small">vs last month</span>
                      </div>
                    )}
                  </div>
                  <div className="col-auto">
                    <div className={`stat-icon-container stat-icon-${card.color}`}>
                      <i className={`fas ${card.icon} stat-icon`}></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Footer */}
              <Link to={card.link} className={`card-footer-link bg-${card.color}`}>
                <div className="d-flex justify-content-between align-items-center py-2 px-4">
                  <span className="font-weight-medium">View Details</span>
                  <div className="footer-arrow">
                    <i className="fas fa-chevron-right"></i>
                  </div>
                </div>
              </Link>

              {/* Hover Effect Overlay */}
              <div className="card-hover-overlay"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardStatsCards;