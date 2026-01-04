import React, { FC, useState } from 'react';

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
  mobileExpanded?: boolean;
  onMobileToggle?: () => void;
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
  onToggleTip,
  mobileExpanded = false,
  onMobileToggle
}) => {
  const [mobileActiveTab, setMobileActiveTab] = useState<'type' | 'time' | 'chart'>('type');

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

  const getReportTypeIcon = (type: ReportType): string => {
    switch (type) {
      case 'spending': return 'fa-chart-pie';
      case 'income-expense': return 'fa-exchange-alt';
      case 'savings': return 'fa-piggy-bank';
      case 'trends': return 'fa-chart-line';
      case 'goals': return 'fa-bullseye';
      case 'predictions': return 'fa-magic';
      default: return 'fa-chart-bar';
    }
  };

  const getReportTypeLabel = (type: ReportType): string => {
    switch (type) {
      case 'spending': return 'Spending';
      case 'income-expense': return 'Income/Expense';
      case 'savings': return 'Savings';
      case 'trends': return 'Trends';
      case 'goals': return 'Goals';
      case 'predictions': return 'Predictions';
      default: return type;
    }
  };

  return (
    <>
      {/* Mobile Report Controls - Collapsible card */}
      <div className={`block md:hidden mb-4 ${mobileExpanded ? '' : 'hidden'}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate__animated animate__fadeIn">
          {/* Tab header */}
          <div className="flex bg-slate-50">
            <button
              onClick={() => setMobileActiveTab('type')}
              className={`flex-1 py-3 text-xs font-semibold transition-all relative ${
                mobileActiveTab === 'type'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-bar mr-1.5 text-[10px]"></i>
              Type
              {mobileActiveTab === 'type' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
            <button
              onClick={() => setMobileActiveTab('time')}
              className={`flex-1 py-3 text-xs font-semibold transition-all relative ${
                mobileActiveTab === 'time'
                  ? 'text-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-calendar mr-1.5 text-[10px]"></i>
              Time
              {mobileActiveTab === 'time' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
            {format === 'chart' && (
              <button
                onClick={() => setMobileActiveTab('chart')}
                className={`flex-1 py-3 text-xs font-semibold transition-all relative ${
                  mobileActiveTab === 'chart'
                    ? 'text-indigo-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fas fa-chart-area mr-1.5 text-[10px]"></i>
                Chart
                {mobileActiveTab === 'chart' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                )}
              </button>
            )}
          </div>

          {/* Tab content */}
          <div className="p-3">
            {mobileActiveTab === 'type' && (
              <div className="grid grid-cols-2 gap-2 animate__animated animate__fadeIn">
                {(['spending', 'income-expense', 'savings', 'trends', 'goals', 'predictions'] as ReportType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onReportTypeChange(type)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      reportType === type
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <i className={`fas ${getReportTypeIcon(type)} text-[10px]`}></i>
                    {getReportTypeLabel(type)}
                  </button>
                ))}
              </div>
            )}

            {mobileActiveTab === 'time' && (
              <div className="space-y-3 animate__animated animate__fadeIn">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">Timeframe</p>
                  <div className="flex gap-2">
                    {(['month', 'quarter', 'year'] as TimeframeType[]).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => onTimeframeChange(tf)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          timeframe === tf
                            ? 'bg-gray-800 text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {tf.charAt(0).toUpperCase() + tf.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">View Format</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onFormatChange('chart')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        format === 'chart'
                          ? 'bg-cyan-500 text-white shadow-md'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <i className="fas fa-chart-bar text-[10px]"></i>
                      Chart
                    </button>
                    <button
                      onClick={() => onFormatChange('table')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        format === 'table'
                          ? 'bg-cyan-500 text-white shadow-md'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <i className="fas fa-table text-[10px]"></i>
                      Table
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mobileActiveTab === 'chart' && format === 'chart' && (
              <div className="animate__animated animate__fadeIn">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">Chart Style</p>
                <div className="grid grid-cols-3 gap-2">
                  {availableChartTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => onChartTypeChange(type)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all ${
                        chartType === type
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <i className={`fas fa-chart-${type === 'column' ? 'bar' : type} text-sm`}></i>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current selection summary */}
          <div className="px-3 py-2 bg-slate-50 border-t border-gray-100">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">
                <i className={`fas ${getReportTypeIcon(reportType)} mr-1`}></i>
                {getReportTypeLabel(reportType)} • {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} • {format === 'chart' ? chartType.charAt(0).toUpperCase() + chartType.slice(1) : 'Table'}
              </span>
              <button
                onClick={onMobileToggle}
                className="text-indigo-500 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Quick Filter Pills (always visible) */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={onMobileToggle}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-semibold"
          >
            <i className={`fas ${getReportTypeIcon(reportType)}`}></i>
            {getReportTypeLabel(reportType)}
            <i className="fas fa-chevron-down text-[8px] ml-0.5"></i>
          </button>
          <span className="flex-shrink-0 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">
            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
          </span>
          <span className="flex-shrink-0 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">
            <i className={`fas fa-${format === 'chart' ? 'chart-bar' : 'table'} mr-1`}></i>
            {format === 'chart' ? chartType.charAt(0).toUpperCase() + chartType.slice(1) : 'Table'}
          </span>
        </div>
      </div>

      {/* Desktop Report Controls */}
      <div className="hidden md:block">
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
              <div className="btn-group btn-group-toggle d-flex flex-wrap w-100" data-toggle="buttons">
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

            {/* Timeframe */}
            <div className="col-6 col-md-3 mb-4">
              <label className="text-xs font-weight-bold text-gray-700 text-uppercase mb-2">Timeframe</label>
              <div className="btn-group btn-group-toggle d-flex w-100" data-toggle="buttons">
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
              <div className="btn-group btn-group-toggle d-flex w-100" data-toggle="buttons">
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
                <div className="btn-group btn-group-toggle d-flex flex-wrap" data-toggle="buttons">
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default ReportControls;