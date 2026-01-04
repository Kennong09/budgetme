import React, { useState, useEffect } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import treemap from 'highcharts/modules/treemap';
import heatmap from 'highcharts/modules/heatmap';
import { CategoryExpenseData } from '../../../services/database/familyDataAggregationService';
import { useRealtimeFamilyData } from '../../../hooks/useRealtimeFamilyData';
import { ChartErrorBoundary } from '../../common/ChartErrorBoundary';
import { ChartErrorHandler } from '../../../utils/chartErrorHandler';

// Initialize Highcharts modules
treemap(Highcharts);
heatmap(Highcharts);

interface CategoryChartProps {
  familyId: string;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

const CategoryChart: React.FC<CategoryChartProps> = ({ familyId, chartRef, dateRange }) => {
  // Use real-time data hook
  const { data: realtimeData, loading, error, isConnected, manualRefresh } = useRealtimeFamilyData({
    familyId,
    enableCategories: true,
    enableBudgets: false,
    enableGoals: false
  });

  const errorHandler = ChartErrorHandler.getInstance();

  // Extract data from real-time hook
  const categoryData = realtimeData.categoryExpenses || [];
  const familyFinancialSummary = realtimeData.financialSummary;

  // Helper function to lighten colors for subcategories
  const lightenColor = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.round(r + (255 - r) * amount));
    const newG = Math.min(255, Math.round(g + (255 - g) * amount));
    const newB = Math.min(255, Math.round(b + (255 - b) * amount));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center text-muted p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden"></span>
        </div>
        <p className="mt-2">Loading family expense data...</p>
        {isConnected && (
          <small className="text-success d-block mt-1">
            <i className="fas fa-wifi me-1"></i>
            Real-time updates enabled
          </small>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
        <p className="text-danger">{error}</p>
        <div className="mt-2">
          <button 
            className="btn btn-sm btn-outline-primary me-2"
            onClick={manualRefresh}
          >
            <i className="fas fa-sync-alt me-1"></i>
            Retry
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
        <small className="text-muted d-block mt-2">
          Connection status: {isConnected ? 'Connected' : 'Disconnected'}
        </small>
      </div>
    );
  }

  // No data state
  if (!categoryData || categoryData.length === 0) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-sitemap fa-3x mb-3"></i>
        <p>No expense data available for the current period</p>
        <button 
          className="btn btn-sm btn-outline-primary mt-2"
          onClick={manualRefresh}
        >
          <i className="fas fa-sync-alt me-1"></i>
          Refresh Data
        </button>
        {isConnected && (
          <small className="text-success d-block mt-2">
            <i className="fas fa-wifi me-1"></i>
            Real-time monitoring active
          </small>
        )}
      </div>
    );
  }

  // Extract financial summary metrics
  const totalExpenses = familyFinancialSummary?.total_family_expenses || categoryData.reduce((sum, cat) => sum + cat.total_amount, 0);
  const totalIncome = familyFinancialSummary?.total_family_income || 0;
  const budgetUtilization = familyFinancialSummary?.budget_utilization || 0;
  const memberCount = familyFinancialSummary?.member_count || 1;
  
  // Create treemap data structure from real category data
  const treemapData: any[] = [];
  
  // Define color palette for categories
  const colorPalette = [
    '#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6', 
    '#95a5a6', '#34495e', '#e67e22', '#2ecc71', '#8e44ad'
  ];
  
  // Add main categories from real data
  categoryData.forEach((category, index) => {
    const categoryColor = category.category_color || colorPalette[index % colorPalette.length];
    
    treemapData.push({
      id: category.category_id,
      name: category.category_name,
      color: categoryColor,
      value: category.total_amount,
      // Store additional data for tooltips
      percentage: category.percentage_of_total,
      transactionCount: category.transaction_count,
      budget: category.monthly_budget,
      variance: category.variance,
      memberContributions: category.family_member_contributions
    });
    
    // Add member contributions as subcategories if there are multiple contributors
    if (category.family_member_contributions.length > 1) {
      category.family_member_contributions.forEach((contribution: any) => {
        if (contribution.amount > 0) {
          treemapData.push({
            name: contribution.full_name,
            parent: category.category_id,
            value: contribution.amount,
            color: lightenColor(categoryColor, 0.3),
            percentage: contribution.percentage
          });
        }
      });
    }
  });

  const chartOptions = {
    chart: {
      type: 'treemap',
      backgroundColor: '#f8f9fa',
      borderRadius: 10,
      height: 550,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    },
    title: {
      text: 'Family Budget Allocation Treemap',
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#2c3e50'
      }
    },
    subtitle: {
      text: `Monthly Spending Breakdown • ₱${totalExpenses.toLocaleString()} Total Expenses • ${budgetUtilization.toFixed(1)}% Budget Used${isConnected ? ' • Live' : ''}`,
      style: {
        fontSize: '12px',
        color: '#7f8c8d'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#bdc3c7',
      borderRadius: 8,
      shadow: true,
      formatter: function(): string {
        const point = (this as any).point;
        const value = point.value;
        const isMainCategory = !point.parent;
        
        if (isMainCategory) {
          const percentage = point.percentage || (value / totalExpenses) * 100;
          const budgetImpact = totalIncome > 0 ? (value / totalIncome) * 100 : 0;
          const budget = point.budget;
          const variance = point.variance;
          const transactionCount = point.transactionCount || 0;
          
          return `
            <div style="padding: 12px; max-width: 300px;">
              <b style="color: #2c3e50; font-size: 14px;">${point.name}</b><br/>
              <div style="margin: 8px 0;">
                <span style="color: #3498db; font-size: 16px; font-weight: bold;">₱${value.toLocaleString()}</span>
                <span style="font-size: 12px; color: #7f8c8d;"> (${percentage.toFixed(1)}% of expenses)</span>
              </div>
              ${budget ? `<div style="font-size: 11px; color: #34495e;">Budget: ₱${budget.toLocaleString()}</div>` : ''}
              ${variance !== undefined ? `<div style="font-size: 11px; color: ${variance > 0 ? '#e74c3c' : '#27ae60'};">Variance: ${variance > 0 ? '+' : ''}₱${variance.toLocaleString()}</div>` : ''}
              <div style="font-size: 10px; color: #95a5a6; margin-top: 6px;">
                ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} • ${budgetImpact.toFixed(1)}% of income
              </div>
            </div>
          `;
        } else {
          // Member contribution tooltip
          const memberPercentage = point.percentage || 0;
          return `
            <div style="padding: 8px;">
              <b>${point.name}</b><br/>
              <span style="color: #3498db;">₱${value.toLocaleString()}</span>
              <span style="font-size: 11px; color: #7f8c8d;"> (${memberPercentage.toFixed(1)}% of category)</span>
            </div>
          `;
        }
      }
    },
    plotOptions: {
      treemap: {
        layoutAlgorithm: 'squarified',
        dataLabels: {
          enabled: true,
          style: {
            fontSize: '11px',
            fontWeight: '600',
            color: '#ffffff',
            textOutline: '1px rgba(0,0,0,0.5)'
          },
          formatter: function(): string {
            const point = (this as any).point;
            const isMainCategory = !point.parent;
            
            if (isMainCategory) {
              const percentage = point.percentage || (point.value / totalExpenses) * 100;
              if (percentage >= 3) { // Only show labels for categories >= 3%
                return `${point.name}<br/>₱${(point.value / 1000).toFixed(0)}k<br/>(${percentage.toFixed(1)}%)`;
              }
            } else {
              // Member contribution labels
              const memberPercentage = point.percentage || 0;
              if (memberPercentage >= 10) { // Only show labels for contributions >= 10%
                return `${point.name}<br/>₱${(point.value / 1000).toFixed(0)}k`;
              }
            }
            return '';
          }
        },
        borderWidth: 2,
        borderColor: '#ffffff',
        levelIsConstant: false,
        levels: [
          {
            level: 1,
            dataLabels: {
              enabled: true,
              style: {
                fontSize: '13px',
                fontWeight: 'bold'
              }
            },
            borderWidth: 3,
            borderColor: '#ffffff'
          },
          {
            level: 2,
            dataLabels: {
              enabled: true,
              style: {
                fontSize: '10px',
                fontWeight: 'normal'
              }
            },
            borderWidth: 1,
            borderColor: '#ffffff'
          }
        ]
      }
    },
    series: [{
      name: 'Budget Allocation',
      data: treemapData,
      allowDrillToNode: true,
      cursor: 'pointer',
      dataLabels: {
        enabled: true
      }
    }],
    credits: {
      enabled: false
    }
  };

  // Calculate budget efficiency metrics from real data
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  
  // Find key categories (approximate categorization)
  const housingCategory = categoryData.find(cat => 
    cat.category_name.toLowerCase().includes('housing') || 
    cat.category_name.toLowerCase().includes('rent') ||
    cat.category_name.toLowerCase().includes('utilities')
  );
  
  const housingRatio = totalIncome > 0 && housingCategory ? (housingCategory.total_amount / totalIncome) * 100 : 0;
  
  // Calculate necessities ratio (housing + food + healthcare)
  const necessitiesAmount = categoryData
    .filter(cat => {
      const name = cat.category_name.toLowerCase();
      return name.includes('housing') || name.includes('food') || name.includes('health') || 
             name.includes('utilities') || name.includes('groceries') || name.includes('medical');
    })
    .reduce((sum, cat) => sum + cat.total_amount, 0);
  const necessitiesRatio = totalIncome > 0 ? (necessitiesAmount / totalIncome) * 100 : 0;
  
  // Calculate discretionary ratio (entertainment + shopping + dining out)
  const discretionaryAmount = categoryData
    .filter(cat => {
      const name = cat.category_name.toLowerCase();
      return name.includes('entertainment') || name.includes('shopping') || name.includes('dining') || 
             name.includes('hobby') || name.includes('leisure') || name.includes('travel');
    })
    .reduce((sum, cat) => sum + cat.total_amount, 0);
  const discretionaryRatio = totalIncome > 0 ? (discretionaryAmount / totalIncome) * 100 : 0;

  return (
    <ChartErrorBoundary>
      <div className="position-relative">
      <HighchartsReact 
        highcharts={Highcharts} 
        options={chartOptions}
        ref={chartRef} 
      />
      
      {/* Budget Analysis Insights */}
      <div className="mt-3 p-3 bg-light rounded">
        <div className="row">
          <div className="col-md-6">
            <h6 className="text-dark mb-3">
              <i className="fas fa-chart-pie text-primary me-2"></i>
              Budget Efficiency Analysis
            </h6>
            <div className="row">
              <div className="col-6">
                <div className="mb-2">
                  <small className="text-muted d-block">Housing Ratio</small>
                  <strong className={`h6 ${housingRatio <= 30 ? 'text-success' : housingRatio <= 35 ? 'text-warning' : 'text-danger'}`}>
                    {housingRatio.toFixed(1)}%
                  </strong>
                  <small className="d-block text-muted">Recommended: ≤30%</small>
                </div>
              </div>
              <div className="col-6">
                <div className="mb-2">
                  <small className="text-muted d-block">Necessities</small>
                  <strong className={`h6 ${necessitiesRatio <= 60 ? 'text-success' : necessitiesRatio <= 70 ? 'text-warning' : 'text-danger'}`}>
                    {necessitiesRatio.toFixed(1)}%
                  </strong>
                  <small className="d-block text-muted">Recommended: ≤60%</small>
                </div>
              </div>
              <div className="col-6">
                <div className="mb-2">
                  <small className="text-muted d-block">Discretionary</small>
                  <strong className={`h6 ${discretionaryRatio <= 20 ? 'text-success' : discretionaryRatio <= 30 ? 'text-warning' : 'text-danger'}`}>
                    {discretionaryRatio.toFixed(1)}%
                  </strong>
                  <small className="d-block text-muted">Recommended: ≤20%</small>
                </div>
              </div>
              <div className="col-6">
                <div className="mb-2">
                  <small className="text-muted d-block">Savings Available</small>
                  <strong className={`h6 ${savingsRate >= 20 ? 'text-success' : savingsRate >= 10 ? 'text-warning' : 'text-danger'}`}>
                    {savingsRate.toFixed(1)}%
                  </strong>
                  <small className="d-block text-muted">Target: ≥20%</small>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <h6 className="text-dark mb-3">
              <i className="fas fa-lightbulb text-warning me-2"></i>
              Family Spending Insights
            </h6>
            <ul className="list-unstyled small mb-0">
              {housingRatio > 35 && (
                <li className="text-danger mb-2">
                  <i className="fas fa-home me-2"></i>
                  <strong>Housing costs exceed 35% of income</strong> - Consider optimization strategies
                </li>
              )}
              {discretionaryRatio > 25 && (
                <li className="text-warning mb-2">
                  <i className="fas fa-shopping-cart me-2"></i>
                  <strong>High discretionary spending</strong> - Review entertainment and lifestyle costs
                </li>
              )}
              {savingsRate < 10 && (
                <li className="text-danger mb-2">
                  <i className="fas fa-piggy-bank me-2"></i>
                  <strong>Low savings rate</strong> - Focus on reducing largest expense categories
                </li>
              )}
              {savingsRate >= 20 && (
                <li className="text-success mb-2">
                  <i className="fas fa-star me-2"></i>
                  <strong>Excellent financial discipline</strong> - Consider increasing investment allocation
                </li>
              )}
              {categoryData.length > 0 && (
                <li className="text-info mb-2">
                  <i className="fas fa-users me-2"></i>
                  <strong>{memberCount} family member{memberCount !== 1 ? 's' : ''}</strong> contributing to {categoryData.length} expense categories
                </li>
              )}
              <li className="text-primary mb-2">
                <i className="fas fa-chart-line me-2"></i>
                <strong>Budget utilization at {budgetUtilization.toFixed(1)}%</strong> - 
                {budgetUtilization < 80 ? ' Room for strategic spending' : 
                 budgetUtilization > 95 ? ' Near budget limit - monitor closely' : 
                 ' Well-controlled spending'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </ChartErrorBoundary>
  );
};

export default CategoryChart;