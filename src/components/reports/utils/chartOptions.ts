import Highcharts from '../../../utils/highchartsInit';
import {
  ReportType,
  ChartType
} from '../components/ReportControls';
import {
  SpendingDataItem,
  IncomeExpenseDataItem,
  SavingsDataItem,
  TrendData
} from '../hooks';

// Chart options generator
export const generateChartOptions = (
  reportType: ReportType,
  chartType: ChartType,
  categoryData?: SpendingDataItem[] | any,
  monthlyData?: IncomeExpenseDataItem[] | SavingsDataItem[] | any,
  trendsData?: TrendData[],
  budgetData?: any[]
): Highcharts.Options => {
  const baseOptions: any = {
    credits: { enabled: false },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: ['downloadPNG', 'downloadPDF', 'downloadCSV']
        }
      }
    },
    chart: {
      height: 400,
      style: {
        fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      },
      reflow: true,
      spacingBottom: 15,
      spacingTop: 10,
      spacingLeft: 10,
      spacingRight: 10
    },
    title: { text: '' },
    colors: [
      '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', 
      '#6f42c1', '#5a5c69', '#858796', '#2e59d9', '#17a673'
    ],
    responsive: {
      rules: [{
        condition: { maxWidth: 500 },
        chartOptions: {
          legend: { enabled: false },
          tooltip: { enabled: true }
        }
      }]
    }
  };

  switch (reportType) {
    case 'spending':
      if (categoryData && categoryData.length > 0) {
        if (chartType === 'pie') {
          return {
            ...baseOptions,
            chart: { ...baseOptions.chart, type: 'pie' },
            tooltip: {
              pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b><br>Amount: <b>${point.y:,.2f}</b>'
            },
            plotOptions: {
              pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                  enabled: true,
                  format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                  style: { textOutline: 'none' }
                },
                showInLegend: true
              }
            },
            series: [{
              name: 'Spending',
              colorByPoint: true,
              data: categoryData.map((item: SpendingDataItem) => ({
                name: item.name,
                y: item.value,
                color: item.color
              }))
            }]
          };
        } else {
          return {
            ...baseOptions,
            chart: { ...baseOptions.chart, type: chartType },
            xAxis: {
              categories: categoryData.map((item: SpendingDataItem) => item.name),
              title: { text: null }
            },
            yAxis: { title: { text: 'Amount (₱)' } },
            tooltip: {
              formatter: function(this: any): string {
                return `<b>${this.x}</b><br>${this.series.name}: ₱${this.y.toFixed(2)}`;
              }
            },
            series: [{
              name: 'Spending',
              data: categoryData.map((item: SpendingDataItem) => ({
                y: item.value,
                color: item.color
              }))
            }]
          };
        }
      }
      break;
      
    case 'income-expense':
      if (monthlyData && monthlyData.length > 0) {
        return {
          ...baseOptions,
          chart: { ...baseOptions.chart, type: chartType === 'pie' ? 'column' : chartType },
          xAxis: { categories: monthlyData.map((item: IncomeExpenseDataItem) => item.name) },
          yAxis: { title: { text: 'Amount (₱)' } },
          tooltip: {
            shared: true,
            formatter: function(this: any): string {
              let tooltip = `<b>${this.x}</b><br>`;
              if (this.points) {
                this.points.forEach((point: any) => {
                  tooltip += `${point.series.name}: ₱${point.y.toFixed(2)}<br>`;
                });
              }
              return tooltip;
            }
          },
          series: [
            {
              name: 'Income',
              data: monthlyData.map((item: IncomeExpenseDataItem) => item.income),
              color: '#1cc88a'
            },
            {
              name: 'Expenses',
              data: monthlyData.map((item: IncomeExpenseDataItem) => item.expenses),
              color: '#e74a3b'
            }
          ]
        };
      }
      break;
      
    case 'savings':
      if (monthlyData && monthlyData.length > 0) {
        return {
          ...baseOptions,
          chart: { ...baseOptions.chart, type: chartType === 'pie' ? 'line' : chartType },
          xAxis: { categories: monthlyData.map((item: SavingsDataItem) => item.name) },
          yAxis: { title: { text: 'Savings Rate (%)' }, min: 0, max: 100 },
          tooltip: {
            formatter: function(this: any): string {
              return `<b>${this.x}</b><br>Savings Rate: ${this.y.toFixed(1)}%`;
            }
          },
          series: [{
            name: 'Savings Rate',
            data: monthlyData.map((item: SavingsDataItem) => item.rate),
            color: '#4e73df'
          }]
        };
      }
      break;
      
    case 'trends':
      if (trendsData && trendsData.length > 0) {
        return {
          ...baseOptions,
          chart: { ...baseOptions.chart, type: chartType === 'pie' ? 'bar' : chartType },
          xAxis: { categories: trendsData.map(item => item.category), title: { text: null } },
          yAxis: { title: { text: 'Change (%)' } },
          tooltip: {
            formatter: function(this: any): string {
              const trend = trendsData.find(item => item.category === this.x);
              if (trend) {
                return `<b>${this.x}</b><br>` +
                  `Previous: ₱${trend.previousAmount.toFixed(2)}<br>` +
                  `Current: ₱${trend.currentAmount.toFixed(2)}<br>` +
                  `Change: ${this.y.toFixed(1)}%`;
              }
              return `<b>${this.x}</b><br>Change: ${this.y.toFixed(1)}%`;
            }
          },
          series: [{
            name: 'Change',
            data: trendsData.map(item => ({
              y: item.change,
              color: item.change >= 0 ? '#1cc88a' : '#e74a3b'
            }))
          }]
        };
      }
      break;
      
    case 'goals':
      if (budgetData && budgetData.length > 0) {
        return {
          ...baseOptions,
          chart: { ...baseOptions.chart, type: chartType === 'pie' ? 'column' : chartType },
          xAxis: { categories: budgetData.map((item: any) => item.name) },
          yAxis: { title: { text: 'Amount (₱)' } },
          tooltip: {
            formatter: function(this: any): string {
              const goal = budgetData.find((item: any) => item.name === this.x);
              if (goal) {
                return `<b>${this.x}</b><br>` +
                  `Target: ₱${goal.target.toFixed(2)}<br>` +
                  `Current: ₱${goal.current.toFixed(2)}<br>` +
                  `Progress: ${(goal.current / goal.target * 100).toFixed(1)}%`;
              }
              return `<b>${this.x}</b><br>Amount: ₱${this.y.toFixed(2)}`;
            }
          },
          series: [
            {
              name: 'Target',
              data: budgetData.map((item: any) => item.target),
              color: '#4e73df'
            },
            {
              name: 'Current',
              data: budgetData.map((item: any) => item.current),
              color: '#1cc88a'
            }
          ]
        };
      }
      break;
      
    case 'predictions':
      if (monthlyData && monthlyData.length > 0) {
        return {
          ...baseOptions,
          chart: { ...baseOptions.chart, type: chartType === 'pie' ? 'line' : chartType },
          xAxis: { categories: monthlyData.map((item: IncomeExpenseDataItem) => item.name) },
          yAxis: { title: { text: 'Amount (₱)' } },
          tooltip: {
            shared: true,
            formatter: function(this: any): string {
              let tooltip = `<b>${this.x}</b><br>`;
              if (this.points) {
                this.points.forEach((point: any) => {
                  tooltip += `${point.series.name}: ₱${point.y.toFixed(2)}<br>`;
                });
              }
              return tooltip;
            }
          },
          series: [
            {
              name: 'Projected Income',
              data: monthlyData.map((item: IncomeExpenseDataItem) => item.income),
              color: '#1cc88a',
              dashStyle: 'shortdot'
            },
            {
              name: 'Projected Expenses',
              data: monthlyData.map((item: IncomeExpenseDataItem) => item.expenses),
              color: '#e74a3b',
              dashStyle: 'shortdot'
            }
          ]
        };
      }
      break;
  }

  return baseOptions;
};