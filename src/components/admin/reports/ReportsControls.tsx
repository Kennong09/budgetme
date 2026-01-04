import React, { FC } from 'react';
import { AdminReportType } from './utils/adminDataProcessing';

interface ReportsControlsProps {
  selectedReportType: AdminReportType;
  onReportTypeChange: (reportType: AdminReportType) => void;
  timeframe: 'day' | 'week' | 'month' | 'quarter';
  onTimeframeChange: (timeframe: 'day' | 'week' | 'month' | 'quarter') => void;
  format: 'chart' | 'table';
  onFormatChange: (format: 'chart' | 'table') => void;
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
}

const ReportsControls: FC<ReportsControlsProps> = ({
  selectedReportType,
  onReportTypeChange,
  timeframe,
  onTimeframeChange,
  format,
  onFormatChange,
  loading = false,
  onRefresh,
  onExport
}) => {

  const reportTypes: { value: AdminReportType; label: string; description: string; icon: string }[] = [
    {
      value: 'system-activity',
      label: 'System Activity',
      description: 'System events and user activity tracking',
      icon: 'fas fa-server'
    },
    {
      value: 'user-engagement',
      label: 'User Engagement',
      description: 'User growth and engagement metrics',
      icon: 'fas fa-users'
    },
    {
      value: 'financial-health',
      label: 'Financial Health',
      description: 'Overall financial system performance',
      icon: 'fas fa-chart-line'
    },
    {
      value: 'aiml-analytics',
      label: 'AI/ML Analytics',
      description: 'AI predictions and insights usage',
      icon: 'fas fa-brain'
    },
    {
      value: 'chatbot-analytics',
      label: 'Chatbot Analytics',
      description: 'Chatbot usage and satisfaction metrics',
      icon: 'fas fa-robot'
    }
  ];

  const timeframes = [
    { value: 'day', label: 'Last 24 Hours', icon: 'fas fa-clock' },
    { value: 'week', label: 'Last 7 Days', icon: 'fas fa-calendar-week' },
    { value: 'month', label: 'This Month', icon: 'fas fa-calendar-alt' },
    { value: 'quarter', label: 'This Quarter', icon: 'fas fa-calendar' }
  ];

  if (loading) {
    return (
      <div className="controls-section mb-5">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 bg-gray-200 rounded-lg flex-1"></div>
              <div className="h-8 bg-gray-200 rounded-lg flex-1"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>

        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="skeleton-line skeleton-filter"></div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="skeleton-line skeleton-filter"></div>
                </div>
                <div className="col-md-2 mb-3">
                  <div className="skeleton-line skeleton-filter"></div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="d-flex gap-2">
                    <div className="skeleton-button flex-fill"></div>
                    <div className="skeleton-button flex-fill"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="controls-section mb-5">
      {/* Mobile Controls */}
      <div className="block md:hidden">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          {/* Mobile Section Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
              <i className="fas fa-filter text-red-500 text-[10px]"></i>
            </div>
            <span className="text-xs font-semibold text-gray-800">Filters & Controls</span>
          </div>

          {/* Mobile Report Type & Timeframe */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[9px] text-gray-500 font-medium uppercase mb-1 block">Report Type</label>
              <select
                className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={selectedReportType}
                onChange={(e) => onReportTypeChange(e.target.value as AdminReportType)}
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-500 font-medium uppercase mb-1 block">Time Period</label>
              <select
                className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={timeframe}
                onChange={(e) => onTimeframeChange(e.target.value as any)}
              >
                {timeframes.map((tf) => (
                  <option key={tf.value} value={tf.value}>
                    {tf.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Display Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="text-[9px] text-gray-500 font-medium uppercase mr-2">View:</label>
              <button
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  format === 'chart' 
                    ? 'bg-red-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                onClick={() => onFormatChange('chart')}
                aria-label="Chart view"
              >
                <i className="fas fa-chart-pie text-xs"></i>
              </button>
              <button
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  format === 'table' 
                    ? 'bg-red-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                onClick={() => onFormatChange('table')}
                aria-label="Table view"
              >
                <i className="fas fa-table text-xs"></i>
              </button>
            </div>

            {/* Mobile Info Badge */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
              <i className="fas fa-info-circle text-gray-400 text-[9px]"></i>
              <span className="text-[9px] text-gray-500">
                {reportTypes.find(t => t.value === selectedReportType)?.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Controls */}
      <div className="hidden md:block">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 py-3">
            <h6 className="card-title mb-0 font-weight-bold text-gray-800">
              <i className="fas fa-filter mr-2 text-primary"></i>
              Report Controls & Filters
            </h6>
          </div>
          <div className="card-body p-4">
            <div className="row align-items-end">
              {/* Report Type Selection */}
              <div className="col-md-4 mb-3">
                <label className="form-label font-weight-600 text-gray-700 mb-2">
                  <i className="fas fa-chart-bar mr-2"></i>
                  Report Type
                </label>
                <select
                  className="form-control modern-select"
                  value={selectedReportType}
                  onChange={(e) => onReportTypeChange(e.target.value as AdminReportType)}
                >
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted mt-1 d-block">
                  {reportTypes.find(t => t.value === selectedReportType)?.description}
                </small>
              </div>

              {/* Timeframe Selection */}
              <div className="col-md-3 mb-3">
                <label className="form-label font-weight-600 text-gray-700 mb-2">
                  <i className="fas fa-calendar mr-2"></i>
                  Time Period
                </label>
                <select
                  className="form-control modern-select"
                  value={timeframe}
                  onChange={(e) => onTimeframeChange(e.target.value as any)}
                >
                  {timeframes.map((tf) => (
                    <option key={tf.value} value={tf.value}>
                      {tf.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Format */}
              <div className="col-md-2 mb-3">
                <label className="form-label font-weight-600 text-gray-700 mb-2">
                  <i className="fas fa-eye mr-2"></i>
                  Display
                </label>
                <div className="btn-group d-flex" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${format === 'chart' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => onFormatChange('chart')}
                    title="Chart View"
                  >
                    <i className="fas fa-chart-pie"></i>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${format === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => onFormatChange('table')}
                    title="Table View"
                  >
                    <i className="fas fa-table"></i>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="col-md-3 mb-3">
                <div className="d-flex gap-2">
                  {onRefresh && (
                    <button
                      className="btn btn-outline-primary btn-sm flex-fill"
                      onClick={onRefresh}
                      disabled={loading}
                    >
                      <i className={`fas fa-sync-alt mr-1 ${loading ? 'fa-spin' : ''}`}></i>
                      Refresh
                    </button>
                  )}
                  {onExport && (
                    <button
                      className="btn btn-success btn-sm flex-fill"
                      onClick={onExport}
                    >
                      <i className="fas fa-download mr-1"></i>
                      Export
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Report Type Description Card */}
            <div className="report-description-card mt-4">
              <div className="alert alert-light border-left border-primary mb-0">
                <div className="d-flex align-items-start">
                  <div className="report-icon mr-3 mt-1">
                    <i className={`${reportTypes.find(t => t.value === selectedReportType)?.icon} text-primary`}></i>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center mb-2">
                      <h6 className="mb-0 font-weight-bold text-gray-800">
                        {reportTypes.find(t => t.value === selectedReportType)?.label}
                      </h6>
                      <span className="badge badge-primary badge-sm ml-2">
                        {timeframes.find(tf => tf.value === timeframe)?.label}
                      </span>
                    </div>
                    <p className="text-muted small mb-2">
                      {reportTypes.find(t => t.value === selectedReportType)?.description}
                    </p>
                    <div className="report-metadata">
                      <span className="badge badge-light mr-2">
                        <i className="fas fa-eye mr-1"></i>
                        {format.toUpperCase()} View
                      </span>
                      <span className="badge badge-light mr-2">
                        <i className="fas fa-clock mr-1"></i>
                        Auto-refresh: 5min
                      </span>
                      <span className="badge badge-light">
                        <i className="fas fa-shield-alt mr-1"></i>
                        Real-time
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsControls;
