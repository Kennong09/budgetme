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
      <div className="card">
        <div className="card-header">
          <h6 className="font-weight-bold text-primary">{title}</h6>
        </div>
        <div className="card-body text-center py-5">
          <p className="text-muted">No category forecast data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-4">
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
  );
};

export default ProphetCategoryVisualization;