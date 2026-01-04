import React, { FC } from 'react';
import { AdminDashboardSummary } from './hooks/useAdminReportsData';

interface ReportsStatsCardsProps {
  dashboardSummary: AdminDashboardSummary | null;
  loading?: boolean;
}

const ReportsStatsCards: FC<ReportsStatsCardsProps> = ({ 
  dashboardSummary, 
  loading = false 
}) => {
  
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="stats-cards-container mb-5">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden mb-4">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-gray-200 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block">
          <div className="row">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="col-xl-3 col-md-6 mb-4">
                <div className="admin-stat-card">
                  <div className="card-bg-pattern"></div>
                  <div className="card-content p-3">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="skeleton-line skeleton-title mb-2"></div>
                        <div className="skeleton-line skeleton-value mb-1"></div>
                        <div className="skeleton-line skeleton-change"></div>
                      </div>
                      <div className="col-auto">
                        <div className="skeleton-icon"></div>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer d-flex align-items-center justify-content-between">
                    <div className="skeleton-line skeleton-footer"></div>
                    <div className="skeleton-line" style={{ width: '20px', height: '12px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardSummary) {
    return (
      <div className="stats-cards-container mb-5">
        {/* Mobile No Data State */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-info-circle text-blue-500 text-sm"></i>
            </div>
            <p className="text-xs text-gray-500">No dashboard summary data available</p>
          </div>
        </div>
        {/* Desktop No Data State */}
        <div className="hidden md:block">
          <div className="alert alert-info text-center">
            <i className="fas fa-info-circle mr-2"></i>
            No dashboard summary data available
          </div>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Users',
      value: formatNumber(dashboardSummary?.total_users),
      change: (dashboardSummary?.new_users_today || 0) > 0 ? `+${dashboardSummary?.new_users_today} today` : 'No new users today',
      changeType: (dashboardSummary?.new_users_today || 0) > 0 ? 'positive' : 'neutral',
      icon: 'fas fa-users',
      colorClass: 'admin-stat-card-primary',
      footerText: 'View All Users',
      footerLink: '/admin/users',
      footerBg: 'bg-primary',
      mobileIconBg: 'bg-red-100',
      mobileIconColor: 'text-red-500',
      mobileChangeColor: 'text-gray-400'
    },
    {
      title: 'Transactions Today',
      value: formatNumber(dashboardSummary?.transactions_today),
      change: (dashboardSummary?.transactions_today || 0) > 0 ? `${dashboardSummary?.transactions_today} transactions` : 'No transactions today',
      changeType: (dashboardSummary?.transactions_today || 0) > 0 ? 'positive' : 'neutral',
      icon: 'fas fa-exchange-alt',
      colorClass: 'admin-stat-card-success',
      footerText: 'View Transactions',
      footerLink: '/admin/transactions',
      footerBg: 'bg-success',
      mobileIconBg: 'bg-emerald-100',
      mobileIconColor: 'text-emerald-500',
      mobileChangeColor: 'text-emerald-500'
    },
    {
      title: 'Active Budgets',
      value: formatNumber(dashboardSummary?.active_budgets),
      change: (dashboardSummary?.active_budgets || 0) > 0 ? `${dashboardSummary?.active_budgets} active budgets` : 'No active budgets',
      changeType: (dashboardSummary?.active_budgets || 0) > 0 ? 'positive' : 'neutral',
      icon: 'fas fa-wallet',
      colorClass: 'admin-stat-card-info',
      footerText: 'View Budgets',
      footerLink: '/admin/budgets',
      footerBg: 'bg-info',
      mobileIconBg: 'bg-blue-100',
      mobileIconColor: 'text-blue-500',
      mobileChangeColor: 'text-blue-500'
    },
    {
      title: 'AI Predictions',
      value: formatNumber(dashboardSummary?.predictions_today),
      change: (dashboardSummary?.predictions_today || 0) > 5 ? 'High activity' : 'Normal activity',
      changeType: (dashboardSummary?.predictions_today || 0) > 5 ? 'positive' : 'neutral',
      icon: 'fas fa-brain',
      colorClass: 'admin-stat-card-warning',
      footerText: 'View Predictions',
      footerLink: '/admin/predictions',
      footerBg: 'bg-warning',
      mobileIconBg: 'bg-amber-100',
      mobileIconColor: 'text-amber-500',
      mobileChangeColor: 'text-amber-500'
    }
  ];

  return (
    <div className="stats-cards-container mb-5">
      {/* Mobile Stats Cards - 2x2 Grid */}
      <div className="block md:hidden mb-4">
        <div className="grid grid-cols-2 gap-2">
          {statsCards.map((card, index) => (
            <a 
              key={index} 
              href={card.footerLink}
              className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 block no-underline hover:shadow-md transition-shadow"
            >
              <div className={`w-7 h-7 rounded-lg ${card.mobileIconBg} flex items-center justify-center mb-2`}>
                <i className={`${card.icon} ${card.mobileIconColor} text-xs`}></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">{card.title}</p>
              <p className="text-sm font-bold text-gray-800">{card.value}</p>
              <div className={`flex items-center gap-1 mt-1 ${card.changeType === 'positive' ? card.mobileChangeColor : 'text-gray-400'}`}>
                <i className={`fas ${card.changeType === 'positive' ? 'fa-arrow-up' : 'fa-minus'} text-[8px]`}></i>
                <span className="text-[9px] font-medium truncate">{card.change}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Desktop Stats Cards */}
      <div className="hidden md:block">
        <div className="row">
          {statsCards.map((card, index) => (
            <div key={index} className="col-xl-3 col-md-6 mb-4">
              <div className={`admin-stat-card ${card.colorClass}`}>
                <div className="card-hover-overlay"></div>
                <div className="card-bg-pattern"></div>
                <div className="card-content p-3">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className={`stat-title text-${card.colorClass.split('-')[3]} font-weight-bold text-uppercase mb-1`}>
                        {card.title}
                      </div>
                      <div className="stat-value text-gray-800 font-weight-bold">
                        {card.value}
                      </div>
                      <div className={`stat-change small ${card.changeType === 'positive' ? 'text-success' : 'text-muted'}`}>
                        <i className={`fas ${card.changeType === 'positive' ? 'fa-arrow-up' : 'fa-minus'} mr-1`}></i>
                        {card.change}
                      </div>
                    </div>
                    <div className="col-auto">
                      <div className={`stat-icon-container stat-icon-${card.colorClass.split('-')[3]}`}>
                        <i className={`${card.icon} stat-icon`}></i>
                      </div>
                    </div>
                  </div>
                </div>
                <a 
                  href={card.footerLink} 
                  className={`card-footer-link ${card.footerBg} d-flex align-items-center justify-content-between text-white`}
                >
                  <span className="font-weight-600">{card.footerText}</span>
                  <span className="footer-arrow">
                    <i className="fas fa-angle-right"></i>
                  </span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsStatsCards;
