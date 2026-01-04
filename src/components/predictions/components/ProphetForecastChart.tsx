import React, { FC, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { ProphetPrediction } from '../../../services/database/predictionService';

interface ProphetForecastChartProps {
  predictions: ProphetPrediction[];
  historical?: ProphetPrediction[];
  title?: string;
  height?: number;
  showConfidenceIntervals?: boolean;
  showTrend?: boolean;
  showSeasonal?: boolean;
  timeframe?: string;
}

interface ChartDataPoint {
  date: string;
  predicted: number;
  upper: number;
  lower: number;
  trend: number;
  seasonal: number;
  confidence: number;
  actual?: number;
  dateTime: Date;
}

const ProphetForecastChart: FC<ProphetForecastChartProps> = ({
  predictions,
  historical = [],
  title = "Prophet Financial Forecast",
  height = 400,
  showConfidenceIntervals = true,
  showTrend = false,
  showSeasonal = false,
  timeframe = 'months_3'
}) => {
  const [mobileActiveTab, setMobileActiveTab] = useState<'forecast' | 'components' | 'confidence'>('forecast');
  // Process data for chart
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const allData = [...historical, ...predictions];
    
    return allData.map(point => ({
      date: format(new Date(point.date), 'MMM dd'),
      predicted: Number(point.predicted.toFixed(2)),
      upper: Number(point.upper.toFixed(2)),
      lower: Number(point.lower.toFixed(2)),
      trend: Number(point.trend.toFixed(2)),
      seasonal: Number((point.seasonal || 0).toFixed(2)),
      confidence: Number((point.confidence * 100).toFixed(1)),
      actual: historical.includes(point) ? point.predicted : undefined,
      dateTime: new Date(point.date)
    })).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [predictions, historical]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const avgPredicted = chartData.reduce((sum, point) => sum + point.predicted, 0) / chartData.length;
    const avgConfidence = chartData.reduce((sum, point) => sum + point.confidence, 0) / chartData.length;
    const trendDirection = chartData.length > 1 
      ? chartData[chartData.length - 1].trend - chartData[0].trend
      : 0;
    
    return {
      avgPredicted: avgPredicted.toFixed(2),
      avgConfidence: avgConfidence.toFixed(1),
      trendDirection: trendDirection > 0 ? 'increasing' : trendDirection < 0 ? 'decreasing' : 'stable',
      trendChange: Math.abs(trendDirection).toFixed(2)
    };
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">Predicted:</span> ${data.predicted}
            </p>
            {showConfidenceIntervals && (
              <>
                <p className="text-green-600">
                  <span className="font-medium">Upper Bound:</span> ${data.upper}
                </p>
                <p className="text-red-600">
                  <span className="font-medium">Lower Bound:</span> ${data.lower}
                </p>
              </>
            )}
            <p className="text-gray-600">
              <span className="font-medium">Confidence:</span> {data.confidence}%
            </p>
            {showTrend && (
              <p className="text-purple-600">
                <span className="font-medium">Trend:</span> ${data.trend}
              </p>
            )}
            {showSeasonal && data.seasonal !== 0 && (
              <p className="text-orange-600">
                <span className="font-medium">Seasonal:</span> ${data.seasonal}
              </p>
            )}
            {data.actual !== undefined && (
              <p className="text-gray-800 font-medium">
                <span className="font-medium">Historical:</span> ${data.actual}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <>
        {/* Mobile Empty State */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-chart-area text-indigo-500 text-[10px]"></i>
                {title}
              </h6>
            </div>
            <div className="p-6 text-center">
              <i className="fas fa-chart-line text-gray-300 text-2xl mb-2"></i>
              <p className="text-[10px] text-gray-500">No prediction data available</p>
            </div>
          </div>
        </div>
        
        {/* Desktop Empty State */}
        <div className="card d-none d-md-block">
          <div className="card-header">
            <h6 className="font-weight-bold text-primary">{title}</h6>
          </div>
          <div className="card-body text-center py-5">
            <p className="text-muted">No prediction data available</p>
          </div>
        </div>
      </>
    );
  }

  // Mobile View Component
  const MobileView = () => (
    <div className="block md:hidden mb-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile Header */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
            <i className="fas fa-chart-area text-indigo-500 text-[10px]"></i>
            Prophet Forecast
          </h6>
          {metrics && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
              metrics.trendDirection === 'increasing' ? 'bg-emerald-100 text-emerald-600' :
              metrics.trendDirection === 'decreasing' ? 'bg-amber-100 text-amber-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {metrics.trendDirection === 'increasing' ? '↗' : metrics.trendDirection === 'decreasing' ? '↘' : '→'} {metrics.trendDirection}
            </span>
          )}
        </div>
        
        {/* Mobile Summary Stats */}
        {metrics && (
          <div className="grid grid-cols-4 gap-1 p-2 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-100">
            <div className="text-center">
              <p className="text-[9px] text-gray-500">Avg Forecast</p>
              <p className="text-[11px] font-bold text-indigo-600">${metrics.avgPredicted}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500">Confidence</p>
              <p className="text-[11px] font-bold text-emerald-600">{metrics.avgConfidence}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500">Trend</p>
              <p className="text-[11px] font-bold text-amber-600 capitalize">{metrics.trendDirection}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500">Points</p>
              <p className="text-[11px] font-bold text-cyan-600">{chartData.length}</p>
            </div>
          </div>
        )}
        
        {/* Mobile Tab Navigation */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'forecast', label: 'Forecast', icon: 'fa-chart-line' },
            { key: 'components', label: 'Components', icon: 'fa-layer-group' },
            { key: 'confidence', label: 'Bands', icon: 'fa-arrows-alt-v' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMobileActiveTab(tab.key as any)}
              className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                mobileActiveTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`fas ${tab.icon} mr-1 text-[9px]`}></i>
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Mobile Chart */}
        <div className="p-2">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={45}
              />
              <YAxis 
                tick={{ fontSize: 9 }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{ fontSize: '10px', padding: '6px' }}
                formatter={(value: any) => [`$${value}`, '']}
              />
              
              {/* Confidence Intervals - shown in confidence tab */}
              {mobileActiveTab === 'confidence' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="#1cc88a"
                    fillOpacity={0.2}
                    name="Upper"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="#e74a3b"
                    fillOpacity={0.2}
                    name="Lower"
                  />
                </>
              )}
              
              {/* Historical Data */}
              {historical.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#858796"
                  strokeWidth={1.5}
                  dot={{ fill: '#858796', r: 2 }}
                  name="Historical"
                  connectNulls={false}
                />
              )}
              
              {/* Main Prediction Line */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#4e73df"
                strokeWidth={2}
                dot={{ fill: '#4e73df', r: 2 }}
                name="Forecast"
              />
              
              {/* Trend Line - shown in components tab */}
              {mobileActiveTab === 'components' && (
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#f6c23e"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ fill: '#f6c23e', r: 2 }}
                  name="Trend"
                />
              )}
              
              {/* Seasonal Component - shown in components tab */}
              {mobileActiveTab === 'components' && (
                <Line
                  type="monotone"
                  dataKey="seasonal"
                  stroke="#e74a3b"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={{ fill: '#e74a3b', r: 1 }}
                  name="Seasonal"
                />
              )}
              
              <ReferenceLine y={0} stroke="#d1d3e2" strokeDasharray="2 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Mobile Legend */}
        <div className="px-3 pb-3 flex flex-wrap gap-2 justify-center">
          <span className="flex items-center text-[9px] text-gray-600">
            <span className="w-3 h-0.5 bg-indigo-500 mr-1"></span>
            Forecast
          </span>
          {historical.length > 0 && (
            <span className="flex items-center text-[9px] text-gray-600">
              <span className="w-3 h-0.5 bg-gray-500 mr-1"></span>
              Historical
            </span>
          )}
          {mobileActiveTab === 'components' && (
            <>
              <span className="flex items-center text-[9px] text-gray-600">
                <span className="w-3 h-0.5 bg-amber-400 mr-1 border-dashed"></span>
                Trend
              </span>
              <span className="flex items-center text-[9px] text-gray-600">
                <span className="w-3 h-0.5 bg-rose-500 mr-1"></span>
                Seasonal
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MobileView />
      
      {/* Desktop View */}
      <div className="card mb-4 d-none d-md-block">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="font-weight-bold text-primary mb-0">{title}</h6>
          <div className="d-flex align-items-center space-x-2">
            {metrics && (
              <>
                <span className="badge badge-info">
                  Avg: ${metrics.avgPredicted}
                </span>
                <span className="badge badge-success">
                  Confidence: {metrics.avgConfidence}%
                </span>
                <span className={`badge ${
                  metrics.trendDirection === 'increasing' ? 'badge-success' :
                  metrics.trendDirection === 'decreasing' ? 'badge-warning' :
                  'badge-secondary'
                }`}>
                  Trend: {metrics.trendDirection}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Confidence Intervals */}
            {showConfidenceIntervals && (
              <>
                <Area
                  type="monotone"
                  dataKey="upper"
                  stackId="confidence"
                  stroke="none"
                  fill="#1cc88a"
                  fillOpacity={0.1}
                  name="Upper Confidence"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stackId="confidence"
                  stroke="none"
                  fill="#e74a3b"
                  fillOpacity={0.1}
                  name="Lower Confidence"
                />
              </>
            )}
            
            {/* Historical Data */}
            {historical.length > 0 && (
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#858796"
                strokeWidth={2}
                dot={{ fill: '#858796', strokeWidth: 2, r: 4 }}
                name="Historical"
                connectNulls={false}
              />
            )}
            
            {/* Main Prediction Line */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#4e73df"
              strokeWidth={3}
              dot={{ fill: '#4e73df', strokeWidth: 2, r: 4 }}
              name="Prophet Forecast"
            />
            
            {/* Trend Line */}
            {showTrend && (
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#f6c23e"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#f6c23e', strokeWidth: 2, r: 3 }}
                name="Trend Component"
              />
            )}
            
            {/* Seasonal Component */}
            {showSeasonal && (
              <Line
                type="monotone"
                dataKey="seasonal"
                stroke="#e74a3b"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={{ fill: '#e74a3b', strokeWidth: 1, r: 2 }}
                name="Seasonal Component"
              />
            )}
            
            {/* Reference line at zero */}
            <ReferenceLine y={0} stroke="#d1d3e2" strokeDasharray="2 2" />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Chart Controls */}
        <div className="row mt-3">
          <div className="col-md-12">
            <div className="d-flex justify-content-center">
              <div className="btn-group btn-group-sm" role="group">
                <button type="button" className="btn btn-outline-secondary active">
                  Forecast View
                </button>
                <button type="button" className="btn btn-outline-secondary">
                  Components View
                </button>
                <button type="button" className="btn btn-outline-secondary">
                  Confidence Bands
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Summary Stats */}
        {metrics && (
          <div className="row mt-3">
            <div className="col-md-3">
              <div className="text-center">
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                  Average Forecast
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  ${metrics.avgPredicted}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                  Avg Confidence
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {metrics.avgConfidence}%
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                  Trend Direction
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {metrics.trendDirection}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                  Data Points
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {chartData.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ProphetForecastChart;