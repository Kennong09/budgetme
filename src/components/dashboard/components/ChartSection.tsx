import React, { FC, useRef } from "react";
import { Link } from "react-router-dom";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../../utils/highchartsInit";
import { HighchartsConfig, PieChartConfig, DateFilterType } from "../types";

interface ChartSectionProps {
  monthlyData: HighchartsConfig | null;
  categoryData: PieChartConfig | null;
  highchartsLoaded: boolean;
  dateFilter: DateFilterType;
  customStartDate: string;
  customEndDate: string;
  activeTip: string | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const ChartSection: FC<ChartSectionProps> = ({
  monthlyData,
  categoryData,
  highchartsLoaded,
  dateFilter,
  customStartDate,
  customEndDate,
  activeTip,
  onToggleTip,
}) => {
  const monthlyChartRef = useRef<any>(null);
  const categoryChartRef = useRef<any>(null);

  const getFilteredChartTitle = (): string => {
    if (dateFilter === 'all') {
      return 'All Time Overview';
    } else if (dateFilter === 'current-month') {
      return 'Current Month Overview';
    } else if (dateFilter === 'last-3-months') {
      return 'Last 3 Months Overview';
    } else if (dateFilter === 'last-6-months') {
      return 'Last 6 Months Overview';
    } else if (dateFilter === 'last-year') {
      return 'Last Year Overview';
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      return `Custom Range (${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()})`;
    }
    return 'Monthly Overview';
  };

  const monthlyChartCallback = (chart: any): void => {
    if (monthlyChartRef.current) {
      monthlyChartRef.current.chart = chart;
    }
  };

  const categoryChartCallback = (chart: any): void => {
    if (categoryChartRef.current) {
      categoryChartRef.current.chart = chart;
    }
  };

  return (
    <div className="row">
      {/* Monthly Spending/Income Chart */}
      <div className="col-xl-8 col-lg-7">
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              {getFilteredChartTitle()}
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => onToggleTip('monthlyChart', e)}
                ></i>
                {activeTip === 'monthlyChart' && (
                  <div className="tip-box">
                    <div className="tip-title">Monthly Overview</div>
                    <div className="tip-description">
                      Comparison of your income vs expenses over time. This helps you visualize spending patterns and identify months where you saved or overspent.
                    </div>
                  </div>
                )}
              </div>
            </h6>
          </div>
          <div className="card-body">
            {highchartsLoaded && monthlyData && monthlyData.series && monthlyData.series.some(series => series.data && series.data.length > 0 && series.data.some(value => value > 0)) ? (
              <HighchartsReact
                highcharts={Highcharts}
                options={monthlyData}
                ref={monthlyChartRef}
                callback={monthlyChartCallback}
              />
            ) : (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i className="fas fa-chart-bar fa-3x text-gray-300"></i>
                </div>
                <h5 className="text-gray-700 mb-2">No Data Available</h5>
                <p className="text-gray-500 mb-4">
                  There's no transaction data to display for the selected period. Add some transactions to see your financial overview.
                </p>
                <Link to="/transactions/add" className="btn btn-primary btn-sm shadow-sm">
                  <i className="fas fa-plus fa-sm mr-1"></i>Add Transaction
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Pie Chart */}
      <div className="col-xl-4 col-lg-5">
        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
            <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
              Expense Categories
              <div className="ml-2 position-relative">
                <i 
                  className="fas fa-info-circle text-gray-400 cursor-pointer" 
                  onClick={(e) => onToggleTip('categoryChart', e)}
                ></i>
                {activeTip === 'categoryChart' && (
                  <div className="tip-box">
                    <div className="tip-title">Expense Breakdown</div>
                    <div className="tip-description">
                      Shows how your expenses are distributed across different categories. This helps identify your biggest spending areas.
                    </div>
                  </div>
                )}
              </div>
            </h6>
          </div>
          <div className="card-body">
            {highchartsLoaded && categoryData && categoryData.series && categoryData.series.length > 0 && categoryData.series[0].data.length > 0 ? (
              <HighchartsReact
                highcharts={Highcharts}
                options={categoryData}
                ref={categoryChartRef}
                callback={categoryChartCallback}
              />
            ) : (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i className="fas fa-chart-pie fa-3x text-gray-300"></i>
                </div>
                <h5 className="text-gray-700 mb-2">No Expenses Data</h5>
                <p className="text-gray-500 mb-4">
                  There are no expense transactions to categorize for the selected period.
                </p>
                <Link to="/transactions/add" className="btn btn-primary btn-sm shadow-sm">
                  <i className="fas fa-plus fa-sm mr-1"></i>Add Expense
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartSection;
