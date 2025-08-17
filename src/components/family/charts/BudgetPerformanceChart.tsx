import React from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';

interface BudgetPerformanceChartProps {
  data: any;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
}

const BudgetPerformanceChart: React.FC<BudgetPerformanceChartProps> = ({ data, chartRef }) => {
  if (!data) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-chart-bar fa-3x mb-3"></i>
        <p>No budget data available</p>
      </div>
    );
  }

  return (
    <HighchartsReact 
      highcharts={Highcharts} 
      options={data}
      ref={chartRef} 
    />
  );
};

export default BudgetPerformanceChart;
