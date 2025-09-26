import React, { FC, useState } from "react";
import { Link } from "react-router-dom";
import { InsightData } from "../types";

interface FinancialInsightsProps {
  insights: InsightData[];
  expandedInsight: string | null;
  onToggleInsightExpand: (insightTitle: string) => void;
  onRefreshInsights?: () => void;
}

const FinancialInsights: FC<FinancialInsightsProps> = ({
  insights,
  expandedInsight,
  onToggleInsightExpand,
  onRefreshInsights,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    if (onRefreshInsights) {
      setIsRefreshing(true);
      onRefreshInsights();
      // Reset refreshing state after animation
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };
  // Debug logging to understand why no insights are shown
  console.log('FinancialInsights Debug:', {
    insightsReceived: insights,
    insightsLength: insights.length,
    insightsArray: insights.map(i => ({ title: i.title, type: i.type }))
  });
  
  if (insights.length === 0) {
    console.log('FinancialInsights: Showing "No Financial Insights Yet" because insights array is empty');
    return (
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-left-info">
            <div className="card-body p-4">
              <div className="text-center">
                <i className="fas fa-lightbulb fa-3x text-gray-300 mb-3"></i>
                <h5 className="text-gray-700 mb-2">No Financial Insights Yet</h5>
                <p className="text-gray-500 mb-3">
                  As you add more transactions over time, we'll analyze your financial patterns and provide personalized insights to help you improve your financial health.
                </p>
                <Link to="/transactions/add" className="btn btn-sm btn-primary shadow-sm">
                  <i className="fas fa-plus fa-sm mr-1"></i> Add More Transactions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="text-xs font-weight-bold text-primary text-uppercase mb-0">
            Financial Insights
          </h6>
          {onRefreshInsights && insights.length > 0 && (
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`btn btn-sm btn-outline-primary shadow-sm refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              title="Refresh insights to see different recommendations"
            >
              <i className={`fas fa-sync-alt fa-sm mr-1 ${isRefreshing ? 'fa-spin' : ''}`}></i> 
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
        <div className="row">
          {insights.map((insight, index) => (
            <div 
              key={`insight-${index}`} 
              className={`col-md-${12 / insights.length} mb-2 ${index === 0 ? 'new-insight' : ''}`}
            >
              <div 
                className={`card insight-card border-left-${insight.type} shadow-sm h-100 py-2 animate__animated animate__fadeIn ${isRefreshing ? 'refreshing' : ''}`} 
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className={`text-xs font-weight-bold text-${insight.type} text-uppercase mb-1`}>
                        {insight.title}
                      </div>
                      <div className="h6 mb-0 font-weight-normal text-gray-800">
                        {insight.description}
                      </div>
                      {expandedInsight === insight.title && (
                        <div className="mt-3 text-sm text-gray-600 animate__animated animate__fadeIn">
                          {insight.type === 'success' && (
                            <p>Keep up the good work! Maintaining this habit will help you reach your financial goals faster.</p>
                          )}
                          {insight.type === 'warning' && (
                            <p>Consider reviewing your budget to address this issue before it affects your financial health.</p>
                          )}
                          {insight.type === 'danger' && (
                            <p>This requires immediate attention. Visit the Budget section to make adjustments to your spending plan.</p>
                          )}
                          {insight.type === 'info' && (
                            <p>This information can help you make better financial decisions going forward.</p>
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
  );
};

export default FinancialInsights;
