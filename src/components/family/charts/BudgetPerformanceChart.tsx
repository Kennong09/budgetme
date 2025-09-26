import React, { useState, useEffect } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import { FamilyBudgetPerformanceData } from '../../../services/database/familyBudgetService';
import { useRealtimeFamilyData } from '../../../hooks/useRealtimeFamilyData';
import { ChartErrorBoundary } from '../../common/ChartErrorBoundary';
import { ChartErrorHandler } from '../../../utils/chartErrorHandler';

// Import required Highcharts modules
require('highcharts/modules/solid-gauge')(Highcharts);

interface BudgetPerformanceChartProps {
  familyId: string;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
  period?: 'monthly' | 'quarterly' | 'yearly';
}

const BudgetPerformanceChart: React.FC<BudgetPerformanceChartProps> = ({ 
  familyId, 
  chartRef, 
  period = 'monthly' 
}) => {
  // Use real-time data hook
  const { data: realtimeData, loading, error, isConnected, manualRefresh } = useRealtimeFamilyData({
    familyId,
    enableCategories: false,
    enableBudgets: true,
    enableGoals: false
  });

  // Extract performance data from real-time hook
  const performanceData = realtimeData.budgetPerformance;

  // Loading state
  if (loading) {
    return (
      <div className="text-center text-muted p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden"></span>
        </div>
        <p className="mt-2">Loading budget performance data...</p>
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

  // No data state - check if we have meaningful financial data
  if (!performanceData) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-tachometer-alt fa-3x mb-3"></i>
        <p>No performance data available</p>
      </div>
    );
  }

  // Extract metrics from real data with safe defaults
  const { 
    total_family_income = 0,
    total_family_expenses = 0,
    budget_utilization = 0,
    savings_rate = 0,
    family_financial_health = 0,
    budget_efficiency = 0,
    member_count = 0 
  } = performanceData || {};

  // Safe value calculation to prevent NaN and null values
  const safeExpenseRatio = (total_family_income > 0) ? (total_family_expenses / total_family_income) * 100 : 0;
  const safeSavingsRate = (typeof savings_rate === 'number' && !isNaN(savings_rate)) ? savings_rate : 0;
  const safeBudgetUtilization = (typeof budget_utilization === 'number' && !isNaN(budget_utilization)) ? budget_utilization : 0;
  const safeFinancialHealth = (typeof family_financial_health === 'number' && !isNaN(family_financial_health)) ? family_financial_health : 0;
  const safeBudgetEfficiency = (typeof budget_efficiency === 'number' && !isNaN(budget_efficiency)) ? budget_efficiency : 0;
  const safeMonthlySurplus = total_family_income - total_family_expenses;

  // Check if we have meaningful financial data (not just zeros or null)
  const hasFinancialActivity = (
    total_family_income > 0 || 
    total_family_expenses > 0 || 
    safeBudgetUtilization > 0
  );

  // Show no data state if there's no meaningful financial activity
  if (!hasFinancialActivity) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-chart-line fa-3x mb-3"></i>
        <h5 className="text-muted mb-3">No Budget Data Available</h5>
        <p className="mb-3">No budget or transaction data found for your family during the current period.</p>
        
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 bg-light">
              <div className="card-body p-3">
                <h6 className="text-primary mb-2">
                  <i className="fas fa-lightbulb me-2"></i>
                  Get Started with Family Budgeting
                </h6>
                <ul className="list-unstyled small mb-0 text-start">
                  <li className="mb-1">
                    <i className="fas fa-plus-circle text-success me-2"></i>
                    Create family budgets for different expense categories
                  </li>
                  <li className="mb-1">
                    <i className="fas fa-receipt text-info me-2"></i>
                    Add family transactions and income records
                  </li>
                  <li>
                    <i className="fas fa-chart-bar text-warning me-2"></i>
                    Track spending patterns and budget performance
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          className="btn btn-primary mt-3 me-2"
          onClick={manualRefresh}
        >
          <i className="fas fa-sync-alt me-1"></i>
          Refresh Data
        </button>
        
        {isConnected && (
          <small className="text-success d-block mt-3">
            <i className="fas fa-wifi me-1"></i>
            Real-time monitoring active - data will update automatically
          </small>
        )}
      </div>
    );
  }

  // Determine performance grades with updated status system matching Goals component
  const getPerformanceGrade = (score: number) => {
    if (isNaN(score) || score === 0) return { grade: 'N/A', color: '#95a5a6', description: 'No Data' };
    if (score >= 90) return { grade: 'A+', color: '#1cc88a', description: 'Healthy' };
    if (score >= 75) return { grade: 'A', color: '#36b9cc', description: 'On Track' };
    if (score >= 50) return { grade: 'B', color: '#f6c23e', description: 'Getting Started' };
    return { grade: 'C', color: '#e74a3b', description: 'Just Beginning' };
  };

  const healthGrade = getPerformanceGrade(safeFinancialHealth);
  const savingsGrade = getPerformanceGrade(Math.min(100, safeSavingsRate * 5)); // Amplify for grading
  const budgetGrade = getPerformanceGrade(safeBudgetEfficiency);

  const chartOptions = {
    chart: {
      type: 'solidgauge',
      height: '400px',
      backgroundColor: 'transparent',
      margin: [0, 0, 0, 0]
    },
    title: {
      text: 'Family Financial Performance Dashboard',
      style: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#5a5c69'
      },
      y: 40
    },
    pane: {
      center: ['50%', '70%'],
      size: '80%',
      startAngle: -90,
      endAngle: 90,
      background: {
        backgroundColor: '#f8f9fc',
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc'
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderWidth: 1,
      borderRadius: 8,
      shadow: true,
      useHTML: true,
      formatter: function() {
        return `
          <div style="padding: 10px;">
            <strong>Family Financial Performance Analysis</strong><br/>
            <strong>Overall Score:</strong> ${Math.round(safeFinancialHealth)}/100<br/>
            <strong>Status:</strong> ${healthGrade.description}<br/><br/>
            <strong>Component Breakdown:</strong><br/>
            • Savings Rate: ${safeSavingsRate.toFixed(1)}%<br/>
            • Budget Efficiency: ${safeBudgetEfficiency.toFixed(0)}%<br/>
            • Budget Utilization: ${safeBudgetUtilization.toFixed(1)}%<br/>
          </div>
        `;
      }
    },
    yAxis: {
      min: 0,
      max: 100,
      title: {
        text: '',
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          color: healthGrade.color,
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        },
        y: 60
      },
      // Use solid colors based on data point color - no gradient stops needed
      lineWidth: 0,
      tickWidth: 0,
      minorTickInterval: null,
      tickAmount: 2,
      labels: {
        y: 16,
        style: {
          fontSize: '12px'
        }
      }
    },
    plotOptions: {
      solidgauge: {
        dataLabels: {
          y: 5,
          borderWidth: 0,
          useHTML: true,
          style: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white'
          },
          format: '<div style="text-align:center"><div style="background: linear-gradient(135deg, ' + healthGrade.color + ' 0%, ' + healthGrade.color + 'dd 100%);color:white;padding:12px 16px;border-radius:20px;font-weight:600;box-shadow:0 8px 25px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.1);display:inline-block;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);transform:perspective(1px) translateZ(0);"><div style="font-size:24px;line-height:0.9;font-weight:700;margin-bottom:2px;text-shadow:0 1px 2px rgba(0,0,0,0.2)">{y}</div><div style="font-size:10px;line-height:1;opacity:0.9;font-weight:500;letter-spacing:0.5px;text-transform:uppercase">out of 100</div></div></div>'
        },
        animation: {
          duration: 1500
        }
      }
    },
    series: [{
      name: 'Financial Health',
      data: [{
        y: Math.round(safeFinancialHealth),
        color: healthGrade.color
      }],
      tooltip: {
        valueSuffix: ' points'
      }
    }],
    credits: {
      enabled: false
    }
  };

  return (
    <ChartErrorBoundary>
      <div className="position-relative">
      <div className="row">
        <div className="col-md-6">
          <HighchartsReact 
            highcharts={Highcharts} 
            options={chartOptions}
            ref={chartRef} 
          />
          
          {/* Financial Health Status Indicators */}
          <div className="text-center mt-2">
            <div className="text-xs font-weight-bold text-gray-500 text-uppercase mb-1">FINANCIAL HEALTH STATUS</div>
            <div className="row">
              <div className="col-md-3 mb-4">
                <div style={{ 
                  backgroundColor: "#1cc88a", 
                  borderRadius: "8px", 
                  height: "100%",
                  padding: "15px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}>
                  <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Healthy</div>
                  <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>90-100%</div>
                  <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                </div>
              </div>
              <div className="col-md-3 mb-4">
                <div style={{ 
                  backgroundColor: "#36b9cc", 
                  borderRadius: "8px", 
                  height: "100%",
                  padding: "15px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}>
                  <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>On Track</div>
                  <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>75-89%</div>
                  <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                </div>
              </div>
              <div className="col-md-3 mb-4">
                <div style={{ 
                  backgroundColor: "#f6c23e", 
                  borderRadius: "8px", 
                  height: "100%",
                  padding: "15px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}>
                  <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Getting</div>
                  <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Started</div>
                  <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>50-74%</div>
                  <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                </div>
              </div>
              <div className="col-md-3 mb-4">
                <div style={{ 
                  backgroundColor: "#e74a3b", 
                  borderRadius: "8px", 
                  height: "100%",
                  padding: "15px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}>
                  <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Just</div>
                  <div className="text-white font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Beginning</div>
                  <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>0-49%</div>
                  <div className="text-white" style={{ opacity: 0.7, fontSize: "0.75rem" }}>progress</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          {/* KPI Cards */}
          <div className="row h-100">
            <div className="col-12 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="card-title mb-1 text-muted">Savings Rate</h6>
                      <h4 className="mb-0" style={{ color: savingsGrade.color }}>
                        {safeSavingsRate.toFixed(1)}%
                        <span className="ms-2 badge" style={{ backgroundColor: savingsGrade.color + '20', color: savingsGrade.color }}>
                          {savingsGrade.grade}
                        </span>
                      </h4>
                      <small className="text-muted">{savingsGrade.description}</small>
                    </div>
                    <div className="text-end">
                      <i className="fas fa-piggy-bank fa-2x" style={{ color: savingsGrade.color }}></i>
                    </div>
                  </div>
                  <div className="progress mt-2" style={{ height: '4px' }}>
                    <div 
                      className="progress-bar" 
                      style={{ width: `${Math.min(100, safeSavingsRate * 5)}%`, backgroundColor: savingsGrade.color }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-12 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="card-title mb-1 text-muted">Budget Efficiency</h6>
                      <h4 className="mb-0" style={{ color: budgetGrade.color }}>
                        {safeBudgetEfficiency.toFixed(0)}%
                        <span className="ms-2 badge" style={{ backgroundColor: budgetGrade.color + '20', color: budgetGrade.color }}>
                          {budgetGrade.grade}
                        </span>
                      </h4>
                      <small className="text-muted">{budgetGrade.description}</small>
                    </div>
                    <div className="text-end">
                      <i className="fas fa-chart-line fa-2x" style={{ color: budgetGrade.color }}></i>
                    </div>
                  </div>
                  <div className="progress mt-2" style={{ height: '4px' }}>
                    <div 
                      className="progress-bar" 
                      style={{ width: `${safeBudgetEfficiency}%`, backgroundColor: budgetGrade.color }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-12">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="card-title mb-1 text-muted">Budget Utilization</h6>
                      <h4 className="mb-0 text-primary">
                        {safeBudgetUtilization.toFixed(1)}%
                        <span className="ms-2 badge bg-primary bg-opacity-10 text-primary">
                          {safeBudgetUtilization <= 80 ? 'Controlled' : safeBudgetUtilization <= 95 ? 'On Track' : 'Critical'}
                        </span>
                      </h4>
                      <small className="text-muted">
                        {safeBudgetUtilization <= 80 ? 'Room for strategic spending' : 
                         safeBudgetUtilization > 95 ? 'Near budget limit - monitor closely' : 
                         'Well-controlled spending'}
                      </small>
                    </div>
                    <div className="text-end">
                      <i className="fas fa-bullseye fa-2x text-primary"></i>
                    </div>
                  </div>
                  <div className="progress mt-2" style={{ height: '4px' }}>
                    <div 
                      className="progress-bar bg-primary" 
                      style={{ width: `${Math.min(100, safeBudgetUtilization)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Detailed Performance Analysis */}
      <div className="mt-4 p-3 bg-light rounded">
        <div className="row">
          <div className="col-md-8">
            <h6 className="text-dark mb-3">
              <i className="fas fa-analytics text-primary me-2"></i>
              Performance Analysis & Recommendations
            </h6>
            <div className="row">
              <div className="col-md-6">
                <h6 className="text-success mb-2">Strengths</h6>
                <ul className="list-unstyled small mb-0">
                  {savings_rate >= 15 && (
                    <li className="text-success mb-1">
                      <i className="fas fa-check-circle me-2"></i>
                      Excellent savings discipline ({savings_rate.toFixed(1)}%)
                    </li>
                  )}
                  {budget_utilization >= 70 && budget_utilization <= 90 && (
                    <li className="text-success mb-1">
                      <i className="fas fa-check-circle me-2"></i>
                      Optimal budget utilization ({budget_utilization.toFixed(1)}%)
                    </li>
                  )}
                  {total_family_income > 0 && (
                    <li className="text-success mb-1">
                      <i className="fas fa-check-circle me-2"></i>
                      Active income tracking with ₱{total_family_income.toLocaleString()} monthly
                    </li>
                  )}
                  {(total_family_income - total_family_expenses) / total_family_income <= 0.7 && (
                    <li className="text-success mb-1">
                      <i className="fas fa-check-circle me-2"></i>
                      Conservative spending habits
                    </li>
                  )}
                </ul>
              </div>
              <div className="col-md-6">
                <h6 className="text-warning mb-2">Improvement Areas</h6>
                <ul className="list-unstyled small mb-0">
                  {savings_rate < 10 && (
                    <li className="text-danger mb-1">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Increase savings rate to 10%+ (currently {savings_rate.toFixed(1)}%)
                    </li>
                  )}
                  {budget_utilization > 95 && (
                    <li className="text-warning mb-1">
                      <i className="fas fa-info-circle me-2"></i>
                      Budget nearly exhausted - monitor spending closely
                    </li>
                  )}
                  {budget_efficiency < 70 && (
                    <li className="text-warning mb-1">
                      <i className="fas fa-chart-line me-2"></i>
                      Budget efficiency could be improved - review allocations
                    </li>
                  )}
                  {(total_family_expenses / total_family_income) > 0.8 && (
                    <li className="text-warning mb-1">
                      <i className="fas fa-chart-line me-2"></i>
                      High expense ratio - review spending categories
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <h6 className="text-dark mb-3">
              <i className="fas fa-trophy text-warning me-2"></i>
              Performance Metrics
            </h6>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-dark">Financial Health:</span>
              <span className="badge text-white" style={{ backgroundColor: healthGrade.color }}>
                {healthGrade.grade} ({safeFinancialHealth.toFixed(0)}/100)
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-dark">Expense Control:</span>
              <span className={`badge text-white ${safeExpenseRatio <= 70 ? 'bg-success' : safeExpenseRatio <= 80 ? 'bg-warning' : 'bg-danger'}`}>
                {isNaN(safeExpenseRatio) ? 'N/A' : `${safeExpenseRatio.toFixed(1)}% of income`}
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-dark">Budget Usage:</span>
              <span className={`badge text-white ${safeBudgetUtilization <= 80 ? 'bg-success' : safeBudgetUtilization <= 95 ? 'bg-warning' : 'bg-danger'}`}>
                {isNaN(safeBudgetUtilization) ? 'N/A' : `${safeBudgetUtilization.toFixed(1)}% utilized`}
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <span className="small text-dark">Monthly Surplus:</span>
              <span className={`badge text-white ${safeMonthlySurplus > 0 ? 'bg-success' : 'bg-danger'}`}>
                {isNaN(safeMonthlySurplus) ? 'N/A' : `₱${Math.abs(safeMonthlySurplus).toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </ChartErrorBoundary>
  );
};

export default BudgetPerformanceChart;