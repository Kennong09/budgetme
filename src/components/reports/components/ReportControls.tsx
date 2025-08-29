import React, { FC } from 'react';

export type ReportType = "spending" | "income-expense" | "savings" | "trends" | "goals" | "predictions";
export type TimeframeType = "month" | "quarter" | "year";
export type FormatType = "chart" | "table";
export type ChartType = "bar" | "pie" | "line" | "area" | "column";

interface ReportControlsProps {
  reportType: ReportType;
  timeframe: TimeframeType;
  format: FormatType;
  chartType: ChartType;
  onReportTypeChange: (type: ReportType) => void;
  onTimeframeChange: (timeframe: TimeframeType) => void;
  onFormatChange: (format: FormatType) => void;
  onChartTypeChange: (chartType: ChartType) => void;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
}

const ReportControls: FC<ReportControlsProps> = ({
  reportType,
  timeframe,
  format,
  chartType,
  onReportTypeChange,
  onTimeframeChange,
  onFormatChange,
  onChartTypeChange,
  onToggleTip
}) => {
  const getChartTypesForReport = (reportType: ReportType): ChartType[] => {
    switch (reportType) {
      case "spending":
        return ["pie", "column"];
      case "income-expense":
        return ["column", "line", "area"];
      case "trends":
        return ["line", "column"];
      case "goals":
        return ["column", "pie"];
      case "savings":
        return ["line", "area"];
      case "predictions":
        return ["line", "area"];
      default:
        return ["column"];
    }
  };

  const availableChartTypes = getChartTypesForReport(reportType);

  return (
    <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
          Report Settings
          <div className="ml-2 position-relative">
            <i 
              className="fas fa-info-circle text-gray-400 cursor-pointer" 
              onClick={(e: React.MouseEvent) => onToggleTip('reportSettings', e)}
              aria-label="Report settings information"
            ></i>
          </div>
        </h6>
      </div>
      <div className="card-body">
        <div className="row">
          {/* Report Type */}
          <div className="col-12 col-md-6 mb-4">
            <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Report Type</label>
            <div className="d-flex flex-wrap">
              <div className="btn-group-vertical btn-group-sm d-block d-sm-none w-100" role="group">
                <button 
                  className={`btn ${reportType === "spending" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                  onClick={() => onReportTypeChange("spending")}
                >
                  <i className="fas fa-chart-pie fa-sm mr-1"></i> Spending
                </button>
                <button 
                  className={`btn ${reportType === "income-expense" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                  onClick={() => onReportTypeChange("income-expense")}
                >
                  <i className="fas fa-exchange-alt fa-sm mr-1"></i> Income/Expense
                </button>
                <button 
                  className={`btn ${reportType === "savings" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                  onClick={() => onReportTypeChange("savings")}
                >
                  <i className="fas fa-piggy-bank fa-sm mr-1"></i> Savings
                </button>
                <button 
                  className={`btn ${reportType === "trends" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                  onClick={() => onReportTypeChange("trends")}
                >
                  <i className="fas fa-chart-line fa-sm mr-1"></i> Trends
                </button>
                <button 
                  className={`btn ${reportType === "goals" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                  onClick={() => onReportTypeChange("goals")}
                >
                  <i className="fas fa-bullseye fa-sm mr-1"></i> Goals
                </button>
                <button 
                  className={`btn ${reportType === "predictions" ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                  onClick={() => onReportTypeChange("predictions")}
                >
                  <i className="fas fa-magic fa-sm mr-1"></i> Predictions
                </button>
              </div>
              <div className="btn-group btn-group-toggle d-none d-sm-flex flex-wrap w-100" data-toggle="buttons">
                <button 
                  className={`btn ${reportType === "spending" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                  onClick={() => onReportTypeChange("spending")}
                >
                  <i className="fas fa-chart-pie fa-sm mr-1"></i> Spending
                </button>
                <button 
                  className={`btn ${reportType === "income-expense" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                  onClick={() => onReportTypeChange("income-expense")}
                >
                  <i className="fas fa-exchange-alt fa-sm mr-1"></i> Income/Expense
                </button>
                <button 
                  className={`btn ${reportType === "savings" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                  onClick={() => onReportTypeChange("savings")}
                >
                  <i className="fas fa-piggy-bank fa-sm mr-1"></i> Savings
                </button>
                <button 
                  className={`btn ${reportType === "trends" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                  onClick={() => onReportTypeChange("trends")}
                >
                  <i className="fas fa-chart-line fa-sm mr-1"></i> Trends
                </button>
                <button 
                  className={`btn ${reportType === "goals" ? "btn-primary" : "btn-outline-primary"} mb-2 mr-1`}
                  onClick={() => onReportTypeChange("goals")}
                >
                  <i className="fas fa-bullseye fa-sm mr-1"></i> Goals
                </button>
                <button 
                  className={`btn ${reportType === "predictions" ? "btn-primary" : "btn-outline-primary"} mb-2`}
                  onClick={() => onReportTypeChange("predictions")}
                >
                  <i className="fas fa-magic fa-sm mr-1"></i> Predictions
                </button>
              </div>
            </div>
          </div>

          {/* Timeframe */}
          <div className="col-6 col-md-3 mb-4">
            <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Timeframe</label>
            <div className="btn-group-vertical btn-group-sm d-block d-sm-none w-100" data-toggle="buttons">
              <button 
                className={`btn ${timeframe === "month" ? "btn-secondary" : "btn-outline-secondary"} mb-2 w-100`}
                onClick={() => onTimeframeChange("month")}
              >
                Month
              </button>
              <button 
                className={`btn ${timeframe === "quarter" ? "btn-secondary" : "btn-outline-secondary"} mb-2 w-100`}
                onClick={() => onTimeframeChange("quarter")}
              >
                Quarter
              </button>
              <button 
                className={`btn ${timeframe === "year" ? "btn-secondary" : "btn-outline-secondary"} w-100`}
                onClick={() => onTimeframeChange("year")}
              >
                Year
              </button>
            </div>
            <div className="btn-group btn-group-toggle d-none d-sm-flex w-100" data-toggle="buttons">
              <button 
                className={`btn ${timeframe === "month" ? "btn-secondary" : "btn-outline-secondary"}`}
                onClick={() => onTimeframeChange("month")}
              >
                Month
              </button>
              <button 
                className={`btn ${timeframe === "quarter" ? "btn-secondary" : "btn-outline-secondary"}`}
                onClick={() => onTimeframeChange("quarter")}
              >
                Quarter
              </button>
              <button 
                className={`btn ${timeframe === "year" ? "btn-secondary" : "btn-outline-secondary"}`}
                onClick={() => onTimeframeChange("year")}
              >
                Year
              </button>
            </div>
          </div>

          {/* View Format */}
          <div className="col-6 col-md-3 mb-4">
            <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">View Format</label>
            <div className="btn-group-vertical btn-group-sm d-block d-sm-none w-100" data-toggle="buttons">
              <button 
                className={`btn ${format === "chart" ? "btn-info" : "btn-outline-info"} mb-2 w-100`}
                onClick={() => onFormatChange("chart")}
              >
                <i className="fas fa-chart-bar mr-1"></i> Chart
              </button>
              <button 
                className={`btn ${format === "table" ? "btn-info" : "btn-outline-info"} w-100`}
                onClick={() => onFormatChange("table")}
              >
                <i className="fas fa-table mr-1"></i> Table
              </button>
            </div>
            <div className="btn-group btn-group-toggle d-none d-sm-flex w-100" data-toggle="buttons">
              <button 
                className={`btn ${format === "chart" ? "btn-info" : "btn-outline-info"}`}
                onClick={() => onFormatChange("chart")}
              >
                <i className="fas fa-chart-bar mr-1"></i> Chart
              </button>
              <button 
                className={`btn ${format === "table" ? "btn-info" : "btn-outline-info"}`}
                onClick={() => onFormatChange("table")}
              >
                <i className="fas fa-table mr-1"></i> Table
              </button>
            </div>
          </div>
        </div>

        {/* Chart Type Selection */}
        {format === "chart" && (
          <div className="row mt-2">
            <div className="col-12 mb-4">
              <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Chart Type</label>
              {/* Chart Type buttons for mobile */}
              <div className="d-block d-sm-none">
                <div className="btn-group-vertical btn-group-sm w-100">
                  {availableChartTypes.map((type) => (
                    <button 
                      key={`mobile-${type}`}
                      className={`btn ${chartType === type ? "btn-primary" : "btn-outline-primary"} mb-2 w-100`}
                      onClick={() => onChartTypeChange(type)}
                    >
                      <i className={`fas fa-chart-${type === 'column' ? 'bar' : type} mr-1`}></i> 
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Chart Type buttons for desktop */}
              <div className="btn-group btn-group-toggle d-none d-sm-flex flex-wrap" data-toggle="buttons">
                {availableChartTypes.map((type, index) => (
                  <button 
                    key={`desktop-${type}`}
                    className={`btn ${chartType === type ? "btn-primary" : "btn-outline-primary"} ${index < availableChartTypes.length - 1 ? 'mr-2' : ''}`}
                    onClick={() => onChartTypeChange(type)}
                  >
                    <i className={`fas fa-chart-${type === 'column' ? 'bar' : type} mr-1`}></i> 
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-2 small text-gray-600">
                <i className="fas fa-info-circle mr-1"></i> 
                Different chart types provide unique insights into your financial data.
                <br className="d-none d-md-block" />
                <span className="font-weight-bold d-md-inline-block">Auto-selected default chart type based on report type.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportControls;