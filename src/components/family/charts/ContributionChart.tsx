import React from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';

interface ContributionChartProps {
  data: any;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
}

const ContributionChart: React.FC<ContributionChartProps> = ({ data, chartRef }) => {
  if (!data) {
    return (
      <div className="text-center text-muted p-4">
        <i className="fas fa-chart-line fa-3x mb-3"></i>
        <p>No contribution data available</p>
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

export default ContributionChart;
