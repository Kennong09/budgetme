import React from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';

interface GoalPerformanceChartProps {
  data: any;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
}

const GoalPerformanceChart: React.FC<GoalPerformanceChartProps> = ({ data, chartRef }) => {
  if (!data) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-bullseye fa-3x mb-3"></i>
        <p>No goals data available</p>
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

export default GoalPerformanceChart;
