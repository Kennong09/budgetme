import { MonthlyData, CategoryData, HighchartsConfig, PieChartConfig, UserData } from '../types';
import { formatCurrency } from '../../../utils/helpers';

/**
 * Format monthly data for Highcharts
 */
export const formatMonthlyDataForHighcharts = (
  data: MonthlyData | null
): HighchartsConfig | null => {
  if (!data || !data.datasets || !data.labels) {
    console.log('Monthly data format check: missing data structure', { data });
    return null;
  }
  
  // Check if we have any data (allow zero values for better display)
  const hasData = data.datasets.some(dataset => 
    dataset.data && dataset.data.length > 0
  );
  
  if (!hasData) {
    console.log('Monthly data format check: no data in datasets');
    return null;
  }

  const categories = data.labels;

  const series = [
    {
      name: "Income",
      data: data.datasets[0].data,
      color: "#4e73df",
      type: "column",
    },
    {
      name: "Expenses",
      data: data.datasets[1].data,
      color: "#e74a3b",
      type: "column",
    },
  ];

  return {
    chart: {
      type: "column",
      style: {
        fontFamily:
          'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      },
      backgroundColor: "transparent",
      animation: {
        duration: 1000,
      },
      height: 350,
    },
    title: {
      text: null, // Remove the title as it's redundant with the card header
    },
    xAxis: {
      categories: categories,
      crosshair: true,
      labels: {
        style: {
          color: "#858796",
        },
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: null,
      },
      gridLineColor: "#eaecf4",
      gridLineDashStyle: "dash",
      labels: {
        formatter: function () {
          // Use 'this' as any to avoid TypeScript errors with Highcharts
          return formatCurrency((this as any).value).replace("$", "$");
        },
        style: {
          color: "#858796",
        },
      },
    },
    tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
      pointFormat:
        '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
        '<td style="padding:0"><b>{point.y:,.2f}</b></td></tr>',
      footerFormat: "</table>",
      shared: true,
      useHTML: true,
      style: {
        fontSize: "12px",
        fontFamily:
          'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      },
      valuePrefix: "$",
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0,
        borderRadius: 5,
      },
      series: {
        animation: {
          duration: 1000,
        },
      },
    },
    credits: {
      enabled: false,
    },
    series: series,
  };
};

/**
 * Format category data for Highcharts pie chart
 */
export const formatCategoryDataForHighcharts = (
  data: CategoryData | null,
  userData?: UserData | null
): PieChartConfig | null => {
  if (!data || !data.datasets || !data.labels || data.labels.length === 0 || data.datasets[0].data.length === 0) {
    console.log('Category data format check: missing data structure', { data });
    return null;
  }

  // Check if we have any values greater than zero
  const hasValues = data.datasets[0].data.some(value => value > 0);
  if (!hasValues) {
    console.log('Category data format check: no non-zero values');
    return null;
  }

  // Get actual categoryIds matching the labels from expenseCategories
  const getCategoryIdFromName = (categoryName: string): string => {
    if (!userData || !userData.expenseCategories) return "";
    
    const category = userData.expenseCategories.find(
      cat => cat.category_name === categoryName
    );
    
    return category ? category.id : "";
  };

  const pieData = data.labels.map((label, index) => ({
    name: label,
    y: data.datasets[0].data[index],
    // First segment slightly pulled out
    sliced: index === 0,
    selected: index === 0
  }));

  return {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      style: {
        fontFamily:
          'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      },
      height: 350,
    },
    title: {
      text: null,
    },
    tooltip: {
      pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>${point.y:,.2f}',
      valuePrefix: "$",
      useHTML: true,
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.percentage:.1f}%",
          style: {
            fontWeight: "normal",
          },
          // Remove connection lines by setting distance to 0
          connectorWidth: 0,
          distance: 30
        },
        showInLegend: false,
        size: '85%'
      },
    },
    legend: {
      enabled: false,
    },
    series: [
      {
        name: "Spending",
        colorByPoint: true,
        data: pieData,
      },
    ],
    credits: {
      enabled: false,
    },
  };
};

/**
 * Get dynamic chart title based on filters
 */
export const getFilteredChartTitle = (
  dateFilter: string,
  customStartDate: string,
  customEndDate: string
): string => {
  if (dateFilter === 'all') {
    return 'All Time Overview';
  } else if (dateFilter === 'current-month') {
    return 'Current Month Overview';
  } else if (dateFilter === 'last-3-months') {
    return 'Last 3 Months Overview';
  } else if (dateFilter === 'last-6-months') {
    return 'Last 6 Months Overview';
  } else if (dateFilter === 'last-year') {
    return 'Last Year Overview';
  } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
    return `Custom Range (${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()})`;
  }
  return 'Monthly Overview';
};
