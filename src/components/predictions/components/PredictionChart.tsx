import React, { FC, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";
import { formatCurrency } from "../../../utils/helpers";
import { PredictionChartProps } from "../types";

const PredictionChart: FC<PredictionChartProps> = ({
  timeframe,
  dataType,
  data,
  modelAccuracy,
  activeTip,
  tooltipPosition,
  onTimeframeChange,
  onDataTypeChange,
  onToggleTip
}) => {
  const chartRef = useRef<any>(null);

  // Cleanup chart when component unmounts or when filters change
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current = null;
        } catch (error) {
          // Silent cleanup
        }
      }
    };
  }, [timeframe, dataType]);

  const chartData = data[timeframe];
  
  // Check if chart has valid data
  const hasData = chartData && chartData.length > 0;
  const hasValidData = hasData && chartData.some(point => 
    (point.income > 0 || point.expenses > 0 || point.savings !== 0 ||
     (point.incomePrediction && point.incomePrediction > 0) || 
     (point.expensesPrediction && point.expensesPrediction > 0) || 
     (point.savingsPrediction && point.savingsPrediction !== 0))
  );

  return (
    <>
      {/* Mobile Chart Card */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <i className="fas fa-chart-line text-indigo-500 text-[10px]"></i>
              Financial Forecast
            </h6>
            <span className="text-[9px] text-gray-500">
              <i className="fas fa-info-circle mr-1"></i>
              {modelAccuracy[4]?.value}% Confidence
            </span>
          </div>
          
          {/* Timeframe Tabs */}
          <div className="flex bg-slate-50 border-b border-gray-100">
            {(['3months', '6months', '1year'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`flex-1 py-2.5 text-[10px] font-semibold transition-all relative ${
                  timeframe === tf
                    ? 'text-indigo-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tf === '3months' ? '3 Mo' : tf === '6months' ? '6 Mo' : '1 Yr'}
                {timeframe === tf && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                )}
              </button>
            ))}
          </div>
          
          {/* Data Type Pills */}
          <div className="px-3 py-2 flex gap-1.5 overflow-x-auto">
            {(['all', 'income', 'expenses', 'savings'] as const).map((dt) => (
              <button
                key={dt}
                onClick={() => onDataTypeChange(dt)}
                className={`px-2.5 py-1 rounded-full text-[9px] font-medium whitespace-nowrap transition-all ${
                  dataType === dt
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dt.charAt(0).toUpperCase() + dt.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Chart Content */}
          <div className="p-3">
            {!hasValidData ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-chart-line text-gray-400 text-lg"></i>
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">No Data Available</p>
                <p className="text-[10px] text-gray-500">Add transactions to see forecasts</p>
              </div>
            ) : (
              <div style={{ height: "250px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    ref={(ref) => { if (ref) chartRef.current = ref; }}
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="month"
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      interval={0}
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₱${(value/1000).toFixed(0)}k`}
                      tick={{ fontSize: 9 }}
                      width={45}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      labelFormatter={(label) => `${label}`}
                      contentStyle={{ borderRadius: "8px", fontSize: "10px" }}
                    />
                  
                  {(dataType === "all" || dataType === "income") && (
                    <Area type="monotone" dataKey="incomeUpper" stroke="transparent" fill="#6366f1" fillOpacity={0.1} />
                  )}
                  {(dataType === "all" || dataType === "expenses") && (
                    <Area type="monotone" dataKey="expensesUpper" stroke="transparent" fill="#e74a3b" fillOpacity={0.1} />
                  )}
                  
                  {(dataType === "all" || dataType === "income") && (
                    <Line type="monotone" dataKey="income" name="Income" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  )}
                  {(dataType === "all" || dataType === "expenses") && (
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#e74a3b" strokeWidth={2} dot={{ r: 3 }} />
                  )}
                  {(dataType === "all" || dataType === "savings") && (
                    <Line type="monotone" dataKey="savings" name="Savings" stroke="#1cc88a" strokeWidth={2} dot={{ r: 3 }} />
                  )}
                  
                  {(dataType === "all" || dataType === "income") && (
                    <Line type="monotone" dataKey="incomePrediction" name="Income Forecast" stroke="#6366f1" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                  )}
                  {(dataType === "all" || dataType === "expenses") && (
                    <Line type="monotone" dataKey="expensesPrediction" name="Expense Forecast" stroke="#e74a3b" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                  )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Legend */}
          {hasValidData && (
            <div className="px-3 pb-3">
              <div className="flex flex-wrap gap-3 justify-center text-[9px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-indigo-500 rounded"></span>
                  <span className="text-gray-600">Income</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-rose-500 rounded"></span>
                  <span className="text-gray-600">Expenses</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-emerald-500 rounded"></span>
                  <span className="text-gray-600">Savings</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-gray-400"></span>
                  <span className="text-gray-600">Forecast</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Chart Card */}
      <div className="row d-none d-md-block">
        <div className="col-12">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
                Financial Forecast
                <div className="ml-2 position-relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => onToggleTip('financialForecast', e)}
                    aria-label="Financial forecast information"
                  ></i>
                </div>
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <div className="btn-group" role="group">
                  <button type="button" className={`btn ${timeframe === "3months" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => onTimeframeChange("3months")}>3 Months</button>
                  <button type="button" className={`btn ${timeframe === "6months" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => onTimeframeChange("6months")}>6 Months</button>
                  <button type="button" className={`btn ${timeframe === "1year" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => onTimeframeChange("1year")}>1 Year</button>
                </div>
                <div className="btn-group ml-3" role="group">
                  <button type="button" className={`btn ${dataType === "all" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => onDataTypeChange("all")}>All</button>
                  <button type="button" className={`btn ${dataType === "income" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => onDataTypeChange("income")}>Income</button>
                  <button type="button" className={`btn ${dataType === "expenses" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => onDataTypeChange("expenses")}>Expenses</button>
                  <button type="button" className={`btn ${dataType === "savings" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => onDataTypeChange("savings")}>Savings</button>
                </div>
              </div>

              {!hasValidData ? (
                <div style={{ height: "400px" }} className="d-flex align-items-center justify-content-center">
                  <div className="text-center py-5">
                    <div className="mb-4"><i className="fas fa-chart-line fa-4x text-gray-300"></i></div>
                    <h5 className="text-gray-600 mb-3">No Financial Data Available</h5>
                    <p className="text-gray-500 mb-4">Add transactions to your account to see financial forecasts and predictions.</p>
                    <div className="alert alert-info mx-auto" style={{ maxWidth: '500px' }}>
                      <i className="fas fa-lightbulb mr-2"></i>
                      <strong>Getting Started:</strong> Add at least 3-6 months of transaction history to generate accurate AI-powered financial forecasts.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ height: "400px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart ref={(ref) => { if (ref) chartRef.current = ref; }} data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} interval={0} />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} labelFormatter={(label) => `Period: ${label}`} contentStyle={{ borderRadius: "5px" }} />
                      <Legend />
                    
                    {(dataType === "all" || dataType === "income") && <Area type="monotone" dataKey="incomeUpper" stroke="transparent" fill="#6366f1" fillOpacity={0.1} />}
                    {(dataType === "all" || dataType === "income") && <Area type="monotone" dataKey="incomeLower" stroke="transparent" fill="#6366f1" fillOpacity={0.1} />}
                    {(dataType === "all" || dataType === "expenses") && <Area type="monotone" dataKey="expensesUpper" stroke="transparent" fill="#e74a3b" fillOpacity={0.1} />}
                    {(dataType === "all" || dataType === "expenses") && <Area type="monotone" dataKey="expensesLower" stroke="transparent" fill="#e74a3b" fillOpacity={0.1} />}
                    
                    {(dataType === "all" || dataType === "income") && <Line type="monotone" dataKey="income" name="Income" stroke="#6366f1" activeDot={{ r: 8 }} strokeWidth={2} dot={{ stroke: '#6366f1', strokeWidth: 2, r: 4 }} />}
                    {(dataType === "all" || dataType === "expenses") && <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#e74a3b" activeDot={{ r: 8 }} strokeWidth={2} dot={{ stroke: '#e74a3b', strokeWidth: 2, r: 4 }} />}
                    {(dataType === "all" || dataType === "savings") && <Line type="monotone" dataKey="savings" name="Savings" stroke="#1cc88a" activeDot={{ r: 8 }} strokeWidth={2} dot={{ stroke: '#1cc88a', strokeWidth: 2, r: 4 }} />}
                    
                    {(dataType === "all" || dataType === "income") && <Line type="monotone" dataKey="incomePrediction" name="Income Forecast" stroke="#6366f1" strokeDasharray="5 5" strokeWidth={1.5} dot={false} activeDot={false} />}
                    {(dataType === "all" || dataType === "expenses") && <Line type="monotone" dataKey="expensesPrediction" name="Expense Forecast" stroke="#e74a3b" strokeDasharray="5 5" strokeWidth={1.5} dot={false} activeDot={false} />}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {hasValidData && (
                <div className="mt-3 d-flex justify-content-between">
                  <div className="text-xs text-gray-500">
                    <i className="fas fa-lightbulb text-warning mr-1"></i>
                    <strong>Tip:</strong> Hover over the chart to see detailed values. Shaded areas represent prediction confidence intervals.
                  </div>
                  <div className="text-xs text-gray-500">
                    <i className="fas fa-info-circle text-info mr-1"></i>
                    <strong>Prophet Model</strong> | Confidence: {modelAccuracy[4]?.value}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PredictionChart;
