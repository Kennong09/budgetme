import React from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';

interface CategoryChartProps {
  data: any;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
}

const CategoryChart: React.FC<CategoryChartProps> = ({ data, chartRef }) => {
  if (!data) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-chart-pie fa-3x mb-3"></i>
        <p>No expense data available for this period</p>
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

export default CategoryChart;
