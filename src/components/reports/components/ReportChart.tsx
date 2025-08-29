import React, { FC, useRef } from 'react';
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../../utils/highchartsInit";
import { ReportType, TimeframeType } from './ReportControls';

interface ReportChartProps {
  reportType: ReportType;
  timeframe: TimeframeType;
  chartOptions: Highcharts.Options;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const ReportChart: FC<ReportChartProps> = ({
  reportType,
  timeframe,
  chartOptions,
  onToggleTip
}) => {
  const chartRef = useRef<any>(null);

  const getReportTitle = (): string => {
    const typeTitle = reportType === "spending" 
      ? "Spending by Category" 
      : reportType === "income-expense" 
      ? "Income vs Expenses" 
      : reportType === "trends"
      ? "Financial Trends"
      : reportType === "goals"
      ? "Goal Allocations"
      : reportType === "savings"
      ? "Savings Rate"
      : "Financial Projections";

    const timeframeTitle = timeframe === "month" 
      ? "Monthly" 
      : timeframe === "quarter" 
      ? "Quarterly" 
      : "Yearly";

    return `${typeTitle} (${timeframeTitle})`;
  };

  return (
    <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
          {getReportTitle()}
          <div className="ml-2 position-relative">
            <i 
              className="fas fa-info-circle text-gray-400 cursor-pointer" 
              onClick={(e: React.MouseEvent) => onToggleTip('reportContent', e)}
              aria-label="Report content information"
            ></i>
          </div>
        </h6>
      </div>
      <div className="card-body">
        <div style={{ height: "auto", minHeight: "300px", maxHeight: "600px" }}>
          <HighchartsReact
            highcharts={Highcharts}
            options={chartOptions}
            ref={chartRef}
          />
        </div>
        
        <div className="mt-3 text-center">
          <div className="small text-muted">
            <i className="fas fa-info-circle mr-1"></i> 
            This report was generated based on your transaction history. Data may be subject to rounding.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportChart;