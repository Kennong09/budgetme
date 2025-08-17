import Highcharts from 'highcharts';
import { Transaction, Goal } from '../types';
import { formatCurrency } from '../../../utils/helpers';

// Type definitions for chart data
export interface CategoryData {
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor?: string[];
  }>;
}

export interface BudgetPerformanceData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

// Category colors for charts
const CATEGORY_COLORS = [
  "#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b",
  "#858796", "#5a5c69", "#2e59d9", "#17a673", "#2c9faf"
];

// Helper function to get category name
const getCategoryName = (categoryId: number): string => {
  const categories: { [key: number]: string } = {
    1: "Housing",
    2: "Transportation", 
    3: "Food",
    4: "Utilities",
    5: "Healthcare",
    6: "Personal",
    7: "Entertainment",
    8: "Education",
    9: "Other",
    10: "Income"
  };
  return categories[categoryId] || "Other";
};

// Prepare category chart data for expenses breakdown
export const prepareCategoryChartData = (transactions: Transaction[]): CategoryData => {
  const categoryMap = new Map<string, number>();
  
  transactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const categoryName = getCategoryName(tx.category_id || 9);
      const current = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, current + tx.amount);
    });

  const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
  const labels = sortedCategories.map(([name]) => name);
  const data = sortedCategories.map(([, amount]) => amount);
  const backgroundColor = labels.map((_, index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length]);

  return {
    labels,
    datasets: [{ data, backgroundColor }],
  };
};

// Prepare budget performance data comparing budgeted vs. actual expenses by category
export const prepareBudgetPerformanceData = (budgets: any[], transactions: Transaction[]): BudgetPerformanceData => {
  // Group budgets by category
  const budgetsByCategory = new Map<number, number>();
  budgets.forEach(budget => {
    const categoryId = budget.category_id;
    const currentAmount = budgetsByCategory.get(categoryId) || 0;
    budgetsByCategory.set(categoryId, currentAmount + budget.amount);
  });
  
  // Group expenses by category
  const expensesByCategory = new Map<number, number>();
  transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    if (tx.category_id) {
      const currentAmount = expensesByCategory.get(tx.category_id) || 0;
      expensesByCategory.set(tx.category_id, currentAmount + tx.amount);
    }
  });
  
  // Combine data for chart
  const categories = new Set([...Array.from(budgetsByCategory.keys()), ...Array.from(expensesByCategory.keys())]);
  const labels: string[] = [];
  const budgetedData: number[] = [];
  const actualData: number[] = [];
  
  categories.forEach(categoryId => {
    labels.push(getCategoryName(categoryId));
    budgetedData.push(budgetsByCategory.get(categoryId) || 0);
    actualData.push(expensesByCategory.get(categoryId) || 0);
  });
  
  return {
    labels,
    datasets: [
      { label: "Budgeted", data: budgetedData },
      { label: "Actual", data: actualData },
    ]
  };
};

// Format budget performance data for Highcharts
export const formatBudgetPerformanceForHighcharts = (data: BudgetPerformanceData | null): any | null => {
  if (!data) return null;
  return {
    chart: {
      type: "column", 
      style: { fontFamily: 'Nunito, sans-serif' }, 
      backgroundColor: "transparent", 
      height: 350,
      animation: {
        duration: 800,
        easing: 'easeOutBounce'
      }
    },
    title: { text: null },
    xAxis: { categories: data.labels, crosshair: true, labels: { style: { color: "#858796" } } },
    yAxis: { 
      min: 0, 
      title: { text: null }, 
      gridLineColor: "#eaecf4", 
      gridLineDashStyle: "dash", 
      labels: { 
        formatter: function () { return formatCurrency((this as any).value); }, 
        style: { color: "#858796" } 
      } 
    },
    tooltip: { 
      shared: true, 
      useHTML: true, 
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>', 
      pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td><td style="padding:0"><b>{point.y:,.2f}</b></td></tr>', 
      footerFormat: '</table>', 
      valuePrefix: "$",
      animation: true,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderRadius: 8,
      shadow: true
    },
    plotOptions: { 
      column: { pointPadding: 0.2, borderWidth: 0, borderRadius: 5, grouping: true },
      series: {
        animation: {
          duration: 1000
        }
      }
    },
    credits: { enabled: false },
    series: [
      { name: "Total Budgeted", data: data.datasets[0].data, color: "#4e73df", type: "column" },
      { name: "Total Spent", data: data.datasets[1].data, color: "#e74a3b", type: "column" },
    ],
  };
};

// Format category data for Highcharts pie chart
export const formatCategoryDataForHighcharts = (data: CategoryData | null): any | null => {
  if (!data) return null;
  const pieData = data.labels.map((label, index) => ({
    name: label,
    y: data.datasets[0].data[index],
    sliced: index === 0,
    selected: index === 0,
  }));
  return {
    chart: { 
      type: "pie", 
      backgroundColor: "transparent", 
      style: { fontFamily: 'Nunito, sans-serif' }, 
      height: 350,
      animation: {
        duration: 800,
        easing: 'easeOutBounce'
      }
    },
    title: { text: null },
    tooltip: { 
      pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>${point.y:,.2f}',
      animation: true,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderRadius: 8,
      shadow: true
    },
    plotOptions: { 
      pie: { 
        allowPointSelect: true, 
        cursor: "pointer", 
        dataLabels: { 
          enabled: true, 
          format: "<b>{point.name}</b>: {point.percentage:.1f}%", 
          style: { fontWeight: 'normal' }, 
          connectorWidth: 0, 
          distance: 30 
        }, 
        showInLegend: false, 
        size: '85%',
        animation: {
          duration: 1000
        }
      } 
    },
    credits: { enabled: false },
    responsive: {
      rules: [{
        condition: {
          maxWidth: 500
        },
        chartOptions: {
          plotOptions: {
            pie: {
              dataLabels: {
                enabled: false
              },
              showInLegend: true
            }
          }
        }
      }]
    },
    series: [{ 
      name: "Spending", 
      colorByPoint: true, 
      data: pieData,
      animation: {
        duration: 800
      }
    }],
  };
};

// Prepare family goal performance chart data (progress % for each goal)
export const prepareSharedGoalPerformanceData = (goals: Goal[] = []): any => {
  if (!goals || goals.length === 0) return null;
  
  // Sort goals by percentage completion, highest first
  const sortedGoals = [...goals].sort((a, b) => b.percentage - a.percentage);
  
  // Take only top 10 goals to avoid overcrowding
  const topGoals = sortedGoals.slice(0, 10);
  
  const goalNames = topGoals.map(goal => goal.goal_name);
  const goalPercentages = topGoals.map(goal => goal.percentage);
  
  return {
    chart: {
      type: "bar",
      backgroundColor: "transparent",
      style: { fontFamily: 'Nunito, sans-serif' },
      height: 350,
      animation: {
        duration: 800,
        easing: 'easeOutBounce'
      }
    },
    title: { text: null },
    xAxis: { 
      categories: goalNames,
      title: { text: null },
      gridLineWidth: 0,
      labels: { style: { color: "#858796" } }
    },
    yAxis: {
      min: 0,
      max: 100,
      title: { text: "Completion (%)" },
      gridLineColor: "#eaecf4",
      gridLineDashStyle: "dash",
      labels: { format: "{value}%", style: { color: "#858796" } }
    },
    legend: { enabled: false },
    tooltip: {
      formatter: function(this: Highcharts.TooltipFormatterContextObject): string {
        const point = this.point as any;
        const idx = goalNames.indexOf(point.category);
        const goalData = topGoals[idx];
        
        return `<b>${point.category}</b><br>` +
          `Progress: <b>${point.y.toFixed(1)}%</b><br>` +
          `Current: <b>${formatCurrency(goalData.current_amount)}</b><br>` +
          `Target: <b>${formatCurrency(goalData.target_amount)}</b><br>` +
          `Remaining: <b>${formatCurrency(goalData.remaining)}</b>`;
      },
      useHTML: true,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderRadius: 8,
      shadow: true
    },
    plotOptions: {
      bar: {
        dataLabels: {
          enabled: true,
          format: "{y}%",
        },
        colorByPoint: true
      },
      series: {
        animation: {
          duration: 1000
        }
      }
    },
    credits: { enabled: false },
    series: [{
      name: "Goal Progress",
      data: goalPercentages.map((value, i) => ({
        y: value,
        color: value >= 75 ? "#1cc88a" : // Green for high progress
              value >= 50 ? "#4e73df" : // Blue for medium progress
              value >= 25 ? "#f6c23e" : // Yellow for low progress
              "#e74a3b"  // Red for very low progress
      }))
    }]
  };
};

// Prepare family goal breakdown chart data (by status)
export const prepareSharedGoalBreakdownData = (goals: Goal[] = []): any => {
  if (!goals || goals.length === 0) return null;
  
  // Count goals by status
  const statusCounts: {[key: string]: number} = {
    "not_started": 0,
    "in_progress": 0,
    "completed": 0,
    "cancelled": 0
  };
  
  goals.forEach(goal => {
    if (statusCounts[goal.status] !== undefined) {
      statusCounts[goal.status]++;
    }
  });
  
  // Prepare data for pie chart
  const statusLabels = {
    "not_started": "Not Started",
    "in_progress": "In Progress",
    "completed": "Completed",
    "cancelled": "Cancelled"
  };
  
  const chartData = Object.keys(statusCounts).map(status => ({
    name: statusLabels[status as keyof typeof statusLabels],
    y: statusCounts[status],
    color: status === "completed" ? "#1cc88a" :
           status === "in_progress" ? "#4e73df" :
           status === "not_started" ? "#f6c23e" :
           "#e74a3b"
  }));
  
  // Filter out statuses with 0 count
  const filteredData = chartData.filter(item => item.y > 0);
  
  if (filteredData.length === 0) return null;
  
  return {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      style: { fontFamily: 'Nunito, sans-serif' },
      height: 350,
      animation: {
        duration: 800,
        easing: 'easeOutBounce'
      }
    },
    title: { text: null },
    tooltip: {
      pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>Count: {point.y}',
      animation: true,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderRadius: 8,
      shadow: true
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.y}",
          style: { fontWeight: 'normal' },
          connectorWidth: 0,
          distance: 30
        },
        showInLegend: false,
        size: '85%',
        animation: {
          duration: 1000
        }
      }
    },
    credits: { enabled: false },
    series: [{
      name: "Goal Status",
      colorByPoint: true,
      data: filteredData,
      animation: {
        duration: 800
      }
    }]
  };
};

// Prepare contribution chart data for bar chart
export const prepareContributionChartData = (contributions: any[]): any => {
  if (!contributions || contributions.length === 0) return null;
  
  // Group contributions by member
  const memberContributions = new Map<string, number>();
  contributions.forEach(c => {
    const memberName = c.user?.user_metadata?.username || c.user?.user_metadata?.full_name || "Unknown";
    const current = memberContributions.get(memberName) || 0;
    memberContributions.set(memberName, current + c.amount);
  });
  
  const members = Array.from(memberContributions.keys());
  const amounts = Array.from(memberContributions.values());
  
  return {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      style: { fontFamily: 'Nunito, sans-serif' },
      height: 300
    },
    title: { text: null },
    xAxis: {
      categories: members,
      crosshair: true,
      labels: { style: { color: "#858796" } }
    },
    yAxis: {
      min: 0,
      title: { text: "Contribution Amount ($)" },
      labels: {
        formatter: function() { return formatCurrency((this as any).value); },
        style: { color: "#858796" }
      }
    },
    tooltip: {
      valuePrefix: "$",
      valueSuffix: " contributed"
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0,
        borderRadius: 5
      }
    },
    credits: { enabled: false },
    series: [{
      name: "Contributions",
      data: amounts,
      color: "#4e73df"
    }]
  };
};

// Prepare contribution data for pie chart
export const prepareContributionPieChartData = (contributions: any[]): any => {
  if (!contributions || contributions.length === 0) return null;
  
  // Group contributions by member
  const memberContributions = new Map<string, number>();
  contributions.forEach(c => {
    const memberName = c.user?.user_metadata?.username || c.user?.user_metadata?.full_name || "Unknown";
    const current = memberContributions.get(memberName) || 0;
    memberContributions.set(memberName, current + c.amount);
  });
  
  const pieData = Array.from(memberContributions.entries()).map(([name, amount], index) => ({
    name,
    y: amount,
    sliced: index === 0,
    selected: index === 0
  }));
  
  return {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      style: { fontFamily: 'Nunito, sans-serif' },
      height: 300
    },
    title: { text: null },
    tooltip: {
      pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>${point.y:,.2f}'
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.percentage:.1f}%"
        },
        showInLegend: false
      }
    },
    credits: { enabled: false },
    series: [{
      name: "Contribution Share",
      colorByPoint: true,
      data: pieData
    }]
  };
};
