import React, { FC, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { CategoryForecast } from '../../../services/database/predictionService';

interface ProphetCategoryVisualizationProps {
  categoryForecasts: Record<string, CategoryForecast>;
  title?: string;
  height?: number;
  viewType?: 'bar' | 'pie' | 'trend';
}

interface CategoryChartData {
  category: string;
  historical: number;
  predicted: number;
  confidence: number;
  trend: string;
  change: number;
  changePercent: number;
}

const COLORS = [
  '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
  '#858796', '#5a5c69', '#4e73df', '#1cc88a', '#36b9cc'
];

const ProphetCategoryVisualization: FC<ProphetCategoryVisualizationProps> = ({
  categoryForecasts,
  title = "Category Spending Forecasts",
  height = 400,
  viewType = 'bar'
}): JSX.Element => {
  const [activeView, setActiveView] = useState<'bar' | 'pie' | 'trend'>(viewType);
  const [sortBy, setSortBy] = useState<'predicted' | 'change' | 'confidence'>('predicted');

  // Process category data for visualization
  const chartData = useMemo<CategoryChartData[]>(() => {
    return Object.entries(categoryForecasts)
      .map(([category, forecast]) => {
        const change = forecast.predicted - forecast.historicalAverage;
        const changePercent = forecast.historicalAverage > 0 
          ? (change / forecast.historicalAverage) * 100 
          : 0;
        
        return {
          category: category.length > 12 ? category.substring(0, 12) + '...' : category,
          fullCategory: category,
          historical: Number(forecast.historicalAverage.toFixed(2)),
          predicted: Number(forecast.predicted.toFixed(2)),
          confidence: Number((forecast.confidence * 100).toFixed(1)),
          trend: forecast.trend,
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(1))
        };
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'change':
            return Math.abs(b.change) - Math.abs(a.change);
          case 'confidence':
            return b.confidence - a.confidence;
          default:
            return b.predicted - a.predicted;
        }
      })
      .slice(0, 10); // Limit to top 10 categories
  }, [categoryForecasts, sortBy]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const totalPredicted = chartData.reduce((sum, item) => sum + item.predicted, 0);
    const totalHistorical = chartData.reduce((sum, item) => sum + item.historical, 0);
    const avgConfidence = chartData.reduce((sum, item) => sum + item.confidence, 0) / chartData.length;
    const increasingCategories = chartData.filter(item => item.trend === 'increasing').length;
    const decreasingCategories = chartData.filter(item => item.trend === 'decreasing').length;
    
    return {
      totalPredicted: totalPredicted.toFixed(2),
      totalHistorical: totalHistorical.toFixed(2),
      totalChange: (totalPredicted - totalHistorical).toFixed(2),
      totalChangePercent: totalHistorical > 0 ? (((totalPredicted - totalHistorical) / totalHistorical) * 100).toFixed(1) : '0',
      avgConfidence: avgConfidence.toFixed(1),
      increasingCategories,
      decreasingCategories,
      stableCategories: chartData.length - increasingCategories - decreasingCategories
    };
  }, [chartData]);

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-gray-800">{data.fullCategory}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">Predicted:</span> ${data.predicted}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Historical:</span> ${data.historical}
            </p>
            <p className={`${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span className="font-medium">Change:</span> ${data.change} ({data.changePercent}%)
            </p>
            <p className="text-purple-600">
              <span className="font-medium">Confidence:</span> {data.confidence}%
            </p>
            <p className="text-orange-600">
              <span className="font-medium">Trend:</span> {data.trend}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Render pie chart view
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ category, predicted, percent }) => 
            `${category}: $${predicted} (${(percent * 100).toFixed(0)}%)`
          }
          outerRadius={120}
          fill="#8884d8"
          dataKey="predicted"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any, name: string, props: any) => [
            `$${value}`, 
            `${props.payload.fullCategory} (${props.payload.confidence}% confidence)`
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  // Render trend comparison view
  const renderTrendChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="category" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip content={<BarTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="historical"
          stroke="#858796"
          strokeWidth={2}
          dot={{ fill: '#858796', strokeWidth: 2, r: 4 }}
          name="Historical Average"
        />
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#4e73df"
          strokeWidth={3}
          dot={{ fill: '#4e73df', strokeWidth: 2, r: 4 }}
          name="Prophet Forecast"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  // Render bar chart view
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="category" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip content={<BarTooltip />} />
        <Legend />
        <Bar 
          dataKey="historical" 
          fill="#858796" 
          name="Historical Average" 
          radius={[0, 0, 4, 4]}
        />
        <Bar 
          dataKey="predicted" 
          fill="#4e73df" 
          name="Prophet Forecast" 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  if (Object.keys(categoryForecasts).length === 0) {
    return (
      <>
        {/* Mobile Empty State */}
        <div className="block md:hidden mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                <i className="fas fa-tags text-indigo-500 text-[10px]"></i>
                {title}
              </h6>
            </div>
            <div className="p-6 text-center">
              <i className="fas fa-folder-open text-gray-300 text-2xl mb-2"></i>
              <p className="text-[10px] text-gray-500">No category forecast data available</p>
            </div>
          </div>
        </div>
        
        {/* Desktop Empty State */}
        <div className="card d-none d-md-block">
          <div className="card-header">
            <h6 className="font-weight-bold text-primary">{title}</h6>
          </div>
          <div className="card-body text-center py-5">
            <p className="text-muted">No category forecast data available</p>
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
            <i className="fas fa-tags text-indigo-500 text-[10px]"></i>
            Category Forecasts
          </h6>
          <div className="flex items-center gap-1">
            {summary && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-100 text-indigo-600">
                {chartData.length} categories
              </span>
            )}
          </div>
        </div>
        
        {/* Mobile Summary Stats */}
        {summary && (
          <div className="grid grid-cols-4 gap-1 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
            <div className="text-center">
              <p className="text-[9px] text-gray-500">Total</p>
              <p className="text-[11px] font-bold text-indigo-600">${summary.totalPredicted}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500">Confidence</p>
              <p className="text-[11px] font-bold text-emerald-600">{summary.avgConfidence}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500">Change</p>
              <p className={`text-[11px] font-bold ${Number(summary.totalChange) >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                {Number(summary.totalChange) >= 0 ? '+' : ''}{summary.totalChangePercent}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500">Trends</p>
              <p className="text-[11px] font-bold">
                <span className="text-emerald-600">↗{summary.increasingCategories}</span>
                <span className="text-rose-600 ml-0.5">↘{summary.decreasingCategories}</span>
              </p>
            </div>
          </div>
        )}
        
        {/* Mobile Tab Navigation */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'bar', label: 'Bar', icon: 'fa-chart-bar' },
            { key: 'trend', label: 'Trend', icon: 'fa-chart-line' },
            { key: 'pie', label: 'Dist', icon: 'fa-chart-pie' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                activeView === tab.key
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
          {activeView === 'bar' && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 8 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: '10px', padding: '6px' }} />
                <Bar dataKey="historical" fill="#858796" name="Historical" radius={[0, 0, 2, 2]} />
                <Bar dataKey="predicted" fill="#4e73df" name="Forecast" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {activeView === 'trend' && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 8 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: '10px', padding: '6px' }} />
                <Line type="monotone" dataKey="historical" stroke="#858796" strokeWidth={1.5} dot={{ r: 2 }} name="Historical" />
                <Line type="monotone" dataKey="predicted" stroke="#4e73df" strokeWidth={2} dot={{ r: 2 }} name="Forecast" />
              </LineChart>
            </ResponsiveContainer>
          )}
          
          {activeView === 'pie' && (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="predicted"
                  label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px', padding: '6px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Mobile Category List */}
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-gray-700">Top Categories</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-[9px] border border-gray-200 rounded px-1.5 py-0.5 bg-white"
            >
              <option value="predicted">By Amount</option>
              <option value="change">By Change</option>
              <option value="confidence">By Confidence</option>
            </select>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {chartData.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-[10px] font-medium text-gray-700">{item.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-600">${item.predicted}</span>
                  <span className={`text-[9px] ${item.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.change >= 0 ? '+' : ''}{item.changePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
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
          <div className="d-flex align-items-center">
            {/* Sort Controls */}
            <div className="dropdown mr-3">
              <button 
                className="btn btn-sm btn-outline-secondary dropdown-toggle" 
                type="button" 
                data-toggle="dropdown"
              >
                Sort by: {sortBy}
              </button>
              <div className="dropdown-menu">
                <button 
                  className="dropdown-item" 
                  onClick={() => setSortBy('predicted')}
                >
                  Predicted Amount
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => setSortBy('change')}
                >
                  Change Amount
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => setSortBy('confidence')}
                >
                  Confidence Level
                </button>
              </div>
            </div>
            
            {/* View Controls */}
            <div className="btn-group btn-group-sm" role="group">
              <button 
                type="button" 
                className={`btn ${activeView === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveView('bar')}
              >
                Bar Chart
              </button>
              <button 
                type="button" 
                className={`btn ${activeView === 'trend' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveView('trend')}
              >
                Trend
              </button>
              <button 
                type="button" 
                className={`btn ${activeView === 'pie' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveView('pie')}
              >
                Distribution
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card-body">
        {/* Chart Rendering */}
        {activeView === 'bar' && renderBarChart()}
        {activeView === 'pie' && renderPieChart()}
        {activeView === 'trend' && renderTrendChart()}
        
        {/* Summary Statistics */}
        {summary && (
          <div className="row mt-4">
            <div className="col-lg-3 col-md-6">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Total Forecast
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        ${summary.totalPredicted}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="card border-left-success shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Avg Confidence
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {summary.avgConfidence}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className={`card border-left-${Number(summary.totalChange) >= 0 ? 'warning' : 'danger'} shadow h-100 py-2`}>
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className={`text-xs font-weight-bold text-${Number(summary.totalChange) >= 0 ? 'warning' : 'danger'} text-uppercase mb-1`}>
                        Total Change
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        ${summary.totalChange} ({summary.totalChangePercent}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="card border-left-info shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Trend Distribution
                      </div>
                      <div className="h6 mb-0 font-weight-bold text-gray-800">
                        <span className="text-success">↗{summary.increasingCategories}</span> 
                        <span className="text-warning mx-1">→{summary.stableCategories}</span> 
                        <span className="text-danger">↘{summary.decreasingCategories}</span>
                      </div>
                    </div>
                  </div>
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

export default ProphetCategoryVisualization;