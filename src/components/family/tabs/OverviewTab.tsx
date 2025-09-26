import React, { memo } from 'react';
import type HighchartsReact from 'highcharts-react-official';
import { CategoryChart, BudgetPerformanceChart, GoalPerformanceChart, GoalBreakdownChart } from '../charts';

interface FamilyInsightData {
  totalExpenses: number;
  totalIncome: number;
  budgetUtilization: number;
  familyGoalsCount: number;
}

interface OverviewTabProps {
  chartData: FamilyInsightData;
  familyId: string;
  expenseChartRef: React.RefObject<HighchartsReact.RefObject>;
  budgetChartRef: React.RefObject<HighchartsReact.RefObject>;
  goalChartRef: React.RefObject<HighchartsReact.RefObject>;
  goalBreakdownChartRef: React.RefObject<HighchartsReact.RefObject>;
  toggleTip: (tipId: string, event?: React.MouseEvent) => void;
  refreshKey?: number;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  chartData,
  familyId,
  expenseChartRef,
  budgetChartRef,
  goalChartRef,
  goalBreakdownChartRef,
  toggleTip,
  refreshKey
}) => {
  return (
    <div className="animate__animated animate__fadeIn">
      {/* Family Expense Categories Chart */}
      <div className="row mb-4">
        <div className="col-12">
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
              <CategoryChart 
                key={`category-${refreshKey}`}
                familyId={familyId} 
                chartRef={expenseChartRef} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Performance Chart */}
      <div className="row mb-4">
        <div className="col-12">
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
              <BudgetPerformanceChart 
                key={`budget-${refreshKey}`}
                familyId={familyId} 
                chartRef={budgetChartRef} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Goal Performance Chart */}
      <div className="row mb-4">
        <div className="col-12">
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
              <GoalPerformanceChart 
                key={`goal-performance-${refreshKey}`}
                familyId={familyId} 
                chartRef={goalChartRef} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Goal Breakdown Chart */}
      <div className="row mb-4">
        <div className="col-12">
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
              <GoalBreakdownChart 
                key={`goal-breakdown-${refreshKey}`}
                familyId={familyId} 
                chartRef={goalBreakdownChartRef} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(OverviewTab);
