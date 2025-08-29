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
          // Clean up chart reference if needed
          chartRef.current = null;
        } catch (error) {
          // Silent cleanup
        }
      }
    };
  }, [timeframe, dataType]);

  const chartData = data[timeframe];

  return (
    <div className="row">
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
                <button 
                  type="button" 
                  className={`btn ${timeframe === "3months" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => onTimeframeChange("3months")}
                >
                  3 Months
                </button>
                <button 
                  type="button" 
                  className={`btn ${timeframe === "6months" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => onTimeframeChange("6months")}
                >
                  6 Months
                </button>
                <button 
                  type="button" 
                  className={`btn ${timeframe === "1year" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => onTimeframeChange("1year")}
                >
                  1 Year
                </button>
              </div>
              <div className="btn-group ml-3" role="group">
                <button 
                  type="button" 
                  className={`btn ${dataType === "all" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => onDataTypeChange("all")}
                >
                  All
                </button>
                <button 
                  type="button" 
                  className={`btn ${dataType === "income" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => onDataTypeChange("income")}
                >
                  Income
                </button>
                <button 
                  type="button" 
                  className={`btn ${dataType === "expenses" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => onDataTypeChange("expenses")}
                >
                  Expenses
                </button>
                <button 
                  type="button" 
                  className={`btn ${dataType === "savings" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => onDataTypeChange("savings")}
                >
                  Savings
                </button>
              </div>
            </div>

            <div style={{ height: "400px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  ref={(ref) => {
                    if (ref) chartRef.current = ref;
                  }}
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)} 
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)}
                    labelFormatter={(label) => `Period: ${label}`}
                    contentStyle={{ borderRadius: "5px" }}
                  />
                  <Legend />
                  
                  {/* Confidence intervals for income */}
                  {(dataType === "all" || dataType === "income") && timeframe !== "3months" && (
                    <Area
                      type="monotone"
                      dataKey="incomeUpper"
                      stroke="transparent"
                      fill="#6366f1"
                      fillOpacity={0.1}
                      isAnimationActive={true}
                    />
                  )}
                  {(dataType === "all" || dataType === "income") && timeframe !== "3months" && (
                    <Area
                      type="monotone"
                      dataKey="incomeLower"
                      stroke="transparent"
                      fill="#6366f1"
                      fillOpacity={0.1}
                      isAnimationActive={true}
                    />
                  )}
                  
                  {/* Confidence intervals for expenses */}
                  {(dataType === "all" || dataType === "expenses") && timeframe !== "3months" && (
                    <Area
                      type="monotone"
                      dataKey="expensesUpper"
                      stroke="transparent"
                      fill="#e74a3b"
                      fillOpacity={0.1}
                      isAnimationActive={true}
                    />
                  )}
                  {(dataType === "all" || dataType === "expenses") && timeframe !== "3months" && (
                    <Area
                      type="monotone"
                      dataKey="expensesLower"
                      stroke="transparent"
                      fill="#e74a3b"
                      fillOpacity={0.1}
                      isAnimationActive={true}
                    />
                  )}
                  
                  {/* Main lines */}
                  {(dataType === "all" || dataType === "income") && (
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#6366f1"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                      isAnimationActive={true}
                      dot={{ stroke: '#6366f1', strokeWidth: 2, r: 4 }}
                    />
                  )}
                  {(dataType === "all" || dataType === "expenses") && (
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#e74a3b"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                      isAnimationActive={true}
                      dot={{ stroke: '#e74a3b', strokeWidth: 2, r: 4 }}
                    />
                  )}
                  {(dataType === "all" || dataType === "savings") && (
                    <Line
                      type="monotone"
                      dataKey="savings"
                      name="Savings"
                      stroke="#1cc88a"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                      isAnimationActive={true}
                      dot={{ stroke: '#1cc88a', strokeWidth: 2, r: 4 }}
                    />
                  )}
                  
                  {/* Prediction indicators */}
                  {(dataType === "all" || dataType === "income") && timeframe !== "3months" && (
                    <Line
                      type="monotone"
                      dataKey="incomePrediction"
                      name="Income Forecast"
                      stroke="#6366f1"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={true}
                    />
                  )}
                  {(dataType === "all" || dataType === "expenses") && timeframe !== "3months" && (
                    <Line
                      type="monotone"
                      dataKey="expensesPrediction"
                      name="Expense Forecast"
                      stroke="#e74a3b"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={true}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionChart;