import React, { FC, memo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { InsightData } from "../types";

interface FinancialInsightsProps {
  insights: InsightData[];
  expandedInsight: string | null;
  onToggleInsightExpand: (insightTitle: string) => void;
  onRefreshInsights?: () => void;
}

const FinancialInsights: FC<FinancialInsightsProps> = memo(({
  insights,
  expandedInsight,
  onToggleInsightExpand,
  onRefreshInsights,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileExpandedIndex, setMobileExpandedIndex] = useState<number | null>(null);
  
  const handleRefresh = async () => {
    if (onRefreshInsights) {
      setIsRefreshing(true);
      onRefreshInsights();
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Get icon and colors based on insight type
  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-emerald-50',
          iconBg: 'bg-emerald-500',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          icon: 'fa-check-circle'
        };
      case 'warning':
        return {
          bgColor: 'bg-amber-50',
          iconBg: 'bg-amber-500',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          icon: 'fa-exclamation-triangle'
        };
      case 'danger':
        return {
          bgColor: 'bg-rose-50',
          iconBg: 'bg-rose-500',
          textColor: 'text-rose-700',
          borderColor: 'border-rose-200',
          icon: 'fa-exclamation-circle'
        };
      default:
        return {
          bgColor: 'bg-blue-50',
          iconBg: 'bg-blue-500',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          icon: 'fa-info-circle'
        };
    }
  };
  
  if (insights.length === 0) {
    return (
      <>
        {/* Mobile empty state */}
        <div className="block md:hidden mb-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 text-center border border-indigo-100">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-lightbulb text-indigo-400 text-lg"></i>
            </div>
            <p className="text-xs font-semibold text-gray-700 mb-1">No Insights Yet</p>
            <p className="text-[10px] text-gray-500 mb-3">Add transactions to get personalized tips</p>
            <Link 
              to="/transactions/add" 
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-medium rounded-lg"
            >
              <i className="fas fa-plus text-[8px]"></i>
              Add Transaction
            </Link>
          </div>
        </div>

        {/* Desktop empty state */}
        <div className="desktop-insights-empty">
          <div className="col-12">
            <div className="card shadow-sm border-left-info">
              <div className="card-body p-4">
                <div className="text-center">
                  <i className="fas fa-lightbulb text-3xl text-gray-300 mb-3"></i>
                  <h5 className="text-gray-700 mb-1.5 text-lg font-semibold">No Insights Yet</h5>
                  <p className="text-gray-500 mb-2 text-xs">
                    As you add more transactions over time, we'll analyze your financial patterns and provide personalized insights to help you improve your financial health.
                  </p>
                  <Link 
                    to="/transactions/add" 
                    className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
                  >
                    <i className="fas fa-plus text-xs mr-1"></i>
                    Add More Transactions
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          .desktop-insights-empty { display: none; }
          @media (min-width: 768px) {
            .desktop-insights-empty { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; margin-bottom: 1rem; }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      {/* Mobile Insights - Stacked cards with expand/collapse */}
      <div className="block md:hidden mb-4">
        <div className="flex items-center justify-between mb-2">
          <h6 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
            <i className="fas fa-lightbulb text-[9px]"></i>
            Insights
            <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px]">
              {insights.length}
            </span>
          </h6>
          {onRefreshInsights && (
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <i className={`fas fa-sync-alt text-[10px] ${isRefreshing ? 'fa-spin' : ''}`}></i>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {insights.map((insight, index) => {
            const style = getInsightStyle(insight.type);
            const isExpanded = mobileExpandedIndex === index;
            
            return (
              <div 
                key={`insight-mobile-${index}`}
                className={`${style.bgColor} rounded-xl border ${style.borderColor} overflow-hidden transition-all duration-200 ${isRefreshing ? 'opacity-50' : ''}`}
              >
                <button
                  onClick={() => setMobileExpandedIndex(isExpanded ? null : index)}
                  className="w-full p-3 flex items-start gap-3 text-left bg-transparent border-0"
                >
                  <div className={`w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`fas ${insight.icon || style.icon} text-white text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-bold ${style.textColor} uppercase tracking-wide mb-0.5`}>
                      {insight.title}
                    </p>
                    <p className={`text-[11px] text-gray-700 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {insight.description}
                    </p>
                  </div>
                  <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400 text-[10px] mt-1`}></i>
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-3 animate__animated animate__fadeIn">
                    <div className="ml-11 pt-2 border-t border-gray-200/50">
                      <p className="text-[10px] text-gray-600 leading-relaxed">
                        {insight.type === 'success' && "Keep up the good work! This habit helps you reach your financial goals faster."}
                        {insight.type === 'warning' && "Consider reviewing your budget to address this before it affects your finances."}
                        {insight.type === 'danger' && "This needs attention. Visit Budgets to adjust your spending plan."}
                        {insight.type === 'info' && "Use this information to make better financial decisions."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Insights - Original grid layout */}
      <div className="desktop-insights-section">
        <div className="col-12">
          <div className="flex justify-between items-center mb-3">
            <h6 className="text-xs font-bold text-primary uppercase mb-0">
              Financial Insights
            </h6>
            {onRefreshInsights && insights.length > 0 && (
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`btn btn-sm btn-outline-primary shadow-sm refresh-btn px-2 py-1 text-xs ${isRefreshing ? 'refreshing' : ''}`}
              >
                <i className={`fas fa-sync-alt text-xs ${isRefreshing ? 'fa-spin' : ''}`}></i> 
                <span className="ml-1">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}
          </div>
          <div className="row">
            {insights.map((insight, index) => (
              <div 
                key={`insight-${index}`} 
                className={`col-md-${12 / insights.length} col-12 mb-3 ${index === 0 ? 'new-insight' : ''}`}
              >
                <div 
                  className={`card insight-card border-left-${insight.type} shadow-sm h-100 py-2 animate__animated animate__fadeIn ${isRefreshing ? 'refreshing' : ''}`} 
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="card-body p-3">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className={`text-xs font-weight-bold text-${insight.type} text-uppercase mb-1 small`}>
                          {insight.title}
                        </div>
                        <div className="h6 mb-0 font-weight-normal text-gray-800 small">
                          {insight.description}
                        </div>
                        {expandedInsight === insight.title && (
                          <div className="mt-3 text-sm text-gray-600 animate__animated animate__fadeIn">
                            {insight.type === 'success' && (
                              <p className="small">Keep up the good work! Maintaining this habit will help you reach your financial goals faster.</p>
                            )}
                            {insight.type === 'warning' && (
                              <p className="small">Consider reviewing your budget to address this issue before it affects your financial health.</p>
                            )}
                            {insight.type === 'danger' && (
                              <p className="small">This requires immediate attention. Visit the Budget section to make adjustments to your spending plan.</p>
                            )}
                            {insight.type === 'info' && (
                              <p className="small">This information can help you make better financial decisions going forward.</p>
                            )}
                          </div>
                        )}
                        <div 
                          className="insight-action"
                          onClick={() => onToggleInsightExpand(insight.title)}
                        >
                          {expandedInsight === insight.title ? 'Show less' : 'Learn more'}
                        </div>
                      </div>
                      <div className="col-auto">
                        <i className={`fas ${insight.icon} fa-2x text-gray-300`}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .desktop-insights-section { display: none; }
        @media (min-width: 768px) {
          .desktop-insights-section { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; margin-bottom: 1rem; }
        }
      `}</style>
    </>
  );
});

FinancialInsights.displayName = 'FinancialInsights';

export default FinancialInsights;
