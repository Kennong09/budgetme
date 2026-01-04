import React, { memo, useState } from 'react';
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
  // Mobile chart tab state
  const [mobileActiveChart, setMobileActiveChart] = useState<'expenses' | 'budget' | 'goals' | 'breakdown'>('expenses');

  return (
    <div className="animate__animated animate__fadeIn">
      {/* Mobile Charts - Tabbed interface */}
      <div className="block md:hidden">
        {/* Chart selector tabs */}
        <div className="flex bg-slate-50 rounded-xl mb-3 p-1">
          <button
            onClick={() => setMobileActiveChart('expenses')}
            className={`flex-1 py-2 text-[10px] font-semibold rounded-lg transition-all ${
              mobileActiveChart === 'expenses'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <i className="fas fa-chart-pie mr-1 text-[9px]"></i>
            Expenses
          </button>
          <button
            onClick={() => setMobileActiveChart('budget')}
            className={`flex-1 py-2 text-[10px] font-semibold rounded-lg transition-all ${
              mobileActiveChart === 'budget'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <i className="fas fa-chart-bar mr-1 text-[9px]"></i>
            Budget
          </button>
          <button
            onClick={() => setMobileActiveChart('goals')}
            className={`flex-1 py-2 text-[10px] font-semibold rounded-lg transition-all ${
              mobileActiveChart === 'goals'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <i className="fas fa-flag mr-1 text-[9px]"></i>
            Progress
          </button>
          <button
            onClick={() => setMobileActiveChart('breakdown')}
            className={`flex-1 py-2 text-[10px] font-semibold rounded-lg transition-all ${
              mobileActiveChart === 'breakdown'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <i className="fas fa-tasks mr-1 text-[9px]"></i>
            Status
          </button>
        </div>

        {/* Chart content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className={`fas fa-${
                mobileActiveChart === 'expenses' ? 'chart-pie' :
                mobileActiveChart === 'budget' ? 'chart-bar' :
                mobileActiveChart === 'goals' ? 'flag-checkered' : 'tasks'
              } text-indigo-500 text-[10px]`}></i>
              {mobileActiveChart === 'expenses' ? 'Family Expense Categories' :
               mobileActiveChart === 'budget' ? 'Budget vs Actual' :
               mobileActiveChart === 'goals' ? 'Goals Progress' : 'Goals by Status'}
            </h6>
            <button
              onClick={(e) => toggleTip(
                mobileActiveChart === 'expenses' ? 'expense-categories' :
                mobileActiveChart === 'budget' ? 'budget-performance' :
                mobileActiveChart === 'goals' ? 'goal-progress' : 'goal-breakdown', e
              )}
              className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <i className="fas fa-info text-gray-400 text-[8px]"></i>
            </button>
          </div>
          <div className="p-3">
            {mobileActiveChart === 'expenses' && (
              <div className="animate__animated animate__fadeIn">
                <CategoryChart 
                  key={`category-mobile-${refreshKey}`}
                  familyId={familyId} 
                  chartRef={expenseChartRef} 
                />
              </div>
            )}
            {mobileActiveChart === 'budget' && (
              <div className="animate__animated animate__fadeIn">
                <BudgetPerformanceChart 
                  key={`budget-mobile-${refreshKey}`}
                  familyId={familyId} 
                  chartRef={budgetChartRef} 
                />
              </div>
            )}
            {mobileActiveChart === 'goals' && (
              <div className="animate__animated animate__fadeIn">
                <GoalPerformanceChart 
                  key={`goal-performance-mobile-${refreshKey}`}
                  familyId={familyId} 
                  chartRef={goalChartRef} 
                />
              </div>
            )}
            {mobileActiveChart === 'breakdown' && (
              <div className="animate__animated animate__fadeIn">
                <GoalBreakdownChart 
                  key={`goal-breakdown-mobile-${refreshKey}`}
                  familyId={familyId} 
                  chartRef={goalBreakdownChartRef} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Quick Stats */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                <i className="fas fa-flag-checkered text-indigo-500 text-[10px]"></i>
              </div>
              <span className="text-[10px] text-gray-500 font-medium">Total Goals</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{chartData.familyGoalsCount}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                <i className="fas fa-percentage text-emerald-500 text-[10px]"></i>
              </div>
              <span className="text-[10px] text-gray-500 font-medium">Utilization</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{chartData.budgetUtilization.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Desktop Charts */}
      <div className="d-none d-md-block">
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
    </div>
  );
};

export default memo(OverviewTab);
