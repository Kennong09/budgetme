import React from 'react';
import type HighchartsReact from 'highcharts-react-official';
import { formatCurrency } from '../../../utils/helpers';
import { CategoryChart, BudgetPerformanceChart, GoalPerformanceChart, GoalBreakdownChart } from '../charts';

interface OverviewTabProps {
  totalExpenses: number;
  totalIncome: number;
  budgetUtilization: number;
  familyGoalsCount: number;
  categoryChartData: any;
  budgetPerformanceData: any;
  goalPerformanceData: any;
  goalBreakdownData: any;
  expenseChartRef: React.RefObject<HighchartsReact.RefObject>;
  budgetChartRef: React.RefObject<HighchartsReact.RefObject>;
  goalChartRef: React.RefObject<HighchartsReact.RefObject>;
  goalBreakdownChartRef: React.RefObject<HighchartsReact.RefObject>;
  toggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  totalExpenses,
  totalIncome,
  budgetUtilization,
  familyGoalsCount,
  categoryChartData,
  budgetPerformanceData,
  goalPerformanceData,
  goalBreakdownData,
  expenseChartRef,
  budgetChartRef,
  goalChartRef,
  goalBreakdownChartRef,
  toggleTip
}) => {
  return (
    <div className="animate__animated animate__fadeIn">
      {/* Summary Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Total Expenses (Monthly)
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalExpenses)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-credit-card fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Total Income (Monthly)
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(totalIncome)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-money-bill-alt fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Budget Utilization
                  </div>
                  <div className="row no-gutters align-items-center">
                    <div className="col-auto">
                      <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">
                        {budgetUtilization.toFixed(0)}%
                      </div>
                    </div>
                    <div className="col">
                      <div className="progress progress-sm mr-2">
                        <div 
                          className={`progress-bar ${
                            budgetUtilization > 100 ? 'bg-danger' : 
                            budgetUtilization > 80 ? 'bg-warning' : 
                            'bg-success'
                          }`} 
                          role="progressbar" 
                          style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                          aria-valuenow={budgetUtilization}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-chart-pie fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Family Goals
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {familyGoalsCount}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-flag-checkered fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row">
        <div className="col-xl-6 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">
                Family Expense Categories
                <i 
                  className="fas fa-info-circle ml-2 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('expense-categories', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <CategoryChart data={categoryChartData} chartRef={expenseChartRef} />
            </div>
          </div>
        </div>
        
        <div className="col-xl-6 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">
                Budget vs Actual Spending
                <i 
                  className="fas fa-info-circle ml-2 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('budget-performance', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <BudgetPerformanceChart data={budgetPerformanceData} chartRef={budgetChartRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Family Goals Charts */}
      <div className="row">
        <div className="col-xl-6 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">
                Family Goals Progress
                <i 
                  className="fas fa-info-circle ml-2 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('goal-progress', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <GoalPerformanceChart data={goalPerformanceData} chartRef={goalChartRef} />
            </div>
          </div>
        </div>
        
        <div className="col-xl-6 mb-4">
          <div className="card shadow h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">
                Goals by Status
                <i 
                  className="fas fa-info-circle ml-2 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('goal-breakdown', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <GoalBreakdownChart data={goalBreakdownData} chartRef={goalBreakdownChartRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
