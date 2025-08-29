import React, { FC } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../../../utils/highchartsInit";
import { ChartConfig } from "../../types";

interface BudgetChartProps {
  options: ChartConfig | null;
  chartRef?: React.MutableRefObject<any>;
}

const BudgetChart: FC<BudgetChartProps> = ({ options, chartRef }) => {
  if (!options) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-chart-bar fa-2x text-gray-300 mb-2"></i>
        <p className="text-gray-500">No data available for chart</p>
      </div>
    );
  }

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={options}
      ref={chartRef}
    />
  );
};

export default BudgetChart;
