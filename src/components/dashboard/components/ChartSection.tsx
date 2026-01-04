import React, { FC, memo, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../../utils/highchartsInit";
import { HighchartsConfig, PieChartConfig, DateFilterType, Transaction, Category } from "../types";
import { formatCurrency } from "../../../utils/helpers";

interface ChartSectionProps {
  dateFilter: DateFilterType;
  customStartDate: string;
  customEndDate: string;
  activeTip: string | null;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  transactions: Transaction[];
  expenseCategories: Category[];
}

/**
 * Generate bar chart config directly from transactions
 */
const generateBarChartConfig = (transactions: Transaction[], isMobile: boolean = false): HighchartsConfig | null => {
  if (!transactions || transactions.length === 0) return null;

  const monthsMap = new Map<string, { income: number; expenses: number }>();
  
  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth()).padStart(2, '0')}`;
    
    if (!monthsMap.has(monthKey)) {
      monthsMap.set(monthKey, { income: 0, expenses: 0 });
    }
    
    const monthData = monthsMap.get(monthKey)!;
    const amount = parseFloat(tx.amount?.toString() || '0') || 0;
    
    if (tx.type === 'income') {
      monthData.income += amount;
    } else if (tx.type === 'expense') {
      monthData.expenses += amount;
    }
  });

  const sortedMonths = Array.from(monthsMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(isMobile ? -6 : -12);

  if (sortedMonths.length === 0) return null;

  const labels: string[] = [];
  const incomeData: number[] = [];
  const expenseData: number[] = [];

  sortedMonths.forEach(([monthKey, data]) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month);
    labels.push(date.toLocaleDateString('en-US', { month: 'short', year: isMobile ? undefined : '2-digit' }));
    incomeData.push(data.income);
    expenseData.push(data.expenses);
  });

  return {
    chart: {
      type: "column",
      style: { fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
      backgroundColor: "transparent",
      animation: { duration: 1000 },
      height: isMobile ? 200 : 350,
      spacing: isMobile ? [5, 5, 5, 5] : [10, 10, 15, 10],
    },
    title: { text: null },
    xAxis: {
      categories: labels,
      crosshair: true,
      labels: { 
        style: { color: "#858796", fontSize: isMobile ? '9px' : '11px' },
        rotation: isMobile ? -45 : 0,
      },
    },
    yAxis: {
      min: 0,
      title: { text: null },
      gridLineColor: "#eaecf4",
      gridLineDashStyle: "dash",
      labels: {
        formatter: function(this: any) { 
          if (isMobile) {
            return this.value >= 1000 ? `₱${(this.value / 1000).toFixed(0)}k` : `₱${this.value}`;
          }
          return formatCurrency(this.value); 
        },
        style: { color: "#858796", fontSize: isMobile ? '9px' : '11px' },
      },
    },
    tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
      pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td><td style="padding:0"><b>₱{point.y:,.0f}</b></td></tr>',
      footerFormat: '</table>',
      shared: true,
      useHTML: true,
      style: { fontSize: isMobile ? "10px" : "12px", fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
      valuePrefix: "₱",
    },
    plotOptions: {
      column: { pointPadding: isMobile ? 0.1 : 0.2, borderWidth: 0, borderRadius: 3 },
      series: { animation: { duration: 1000 } },
    },
    legend: {
      enabled: !isMobile,
    },
    series: [
      { name: "Income", data: incomeData, color: "#1cc88a", type: "column" },
      { name: "Expenses", data: expenseData, color: "#e74a3b", type: "column" },
    ],
    credits: { enabled: false },
  };
};

/**
 * Generate pie chart config directly from transactions
 */
const generatePieChartConfig = (transactions: Transaction[], categories: Category[], isMobile: boolean = false): PieChartConfig | null => {
  const expenseTransactions = transactions?.filter(tx => tx.type === 'expense') || [];
  if (expenseTransactions.length === 0) return null;

  const categoryMap = new Map<string, number>();
  
  expenseTransactions.forEach(tx => {
    let categoryName = 'Uncategorized';
    const rawTx = tx as Transaction & { expense_category_id?: string };
    const categoryId = tx.category_id || rawTx.expense_category_id;
    
    if (categoryId && categories?.length > 0) {
      const category = categories.find(c => c.id === categoryId);
      if (category) categoryName = category.category_name;
    }
    
    const current = categoryMap.get(categoryName) || 0;
    const amount = parseFloat(tx.amount?.toString() || '0') || 0;
    categoryMap.set(categoryName, current + amount);
  });

  let pieData = Array.from(categoryMap.entries())
    .filter(([_, value]) => value > 0)
    .map(([name, y]) => ({ name, y }))
    .sort((a, b) => b.y - a.y);

  // On mobile, limit to top 5 categories and group rest as "Other"
  if (isMobile && pieData.length > 5) {
    const top5 = pieData.slice(0, 5);
    const otherTotal = pieData.slice(5).reduce((sum, item) => sum + item.y, 0);
    if (otherTotal > 0) {
      top5.push({ name: 'Other', y: otherTotal });
    }
    pieData = top5;
  }

  if (pieData.length === 0) return null;

  return {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      style: { fontFamily: 'Nunito, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
      height: isMobile ? 180 : 350,
    },
    title: { text: null },
    tooltip: { 
      pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br/>₱{point.y:,.0f}', 
      valuePrefix: "₱",
      style: { fontSize: isMobile ? '10px' : '12px' },
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: !isMobile,
          format: "<b>{point.name}</b>: {point.percentage:.1f}%",
          style: { fontWeight: "normal", fontSize: '10px' },
          connectorWidth: 0,
          distance: 15,
        },
        showInLegend: isMobile,
        size: isMobile ? '90%' : '85%',
        innerSize: isMobile ? '40%' : '0%',
      },
    },
    legend: { 
      enabled: isMobile,
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: { fontSize: '9px' },
      symbolRadius: 2,
      itemMarginTop: 2,
    },
    series: [{ name: "Expenses", colorByPoint: true, data: pieData }],
    credits: { enabled: false },
  };
};


const ChartSection: FC<ChartSectionProps> = memo(({
  dateFilter,
  customStartDate,
  customEndDate,
  activeTip,
  onToggleTip,
  transactions,
  expenseCategories,
}) => {
  const [mobileActiveChart, setMobileActiveChart] = useState<'bar' | 'pie'>('bar');

  // Generate charts for desktop
  const monthlyData = useMemo(() => {
    return generateBarChartConfig(transactions, false);
  }, [transactions]);

  const categoryData = useMemo(() => {
    return generatePieChartConfig(transactions, expenseCategories, false);
  }, [transactions, expenseCategories]);

  // Generate charts for mobile (optimized)
  const mobileMonthlyData = useMemo(() => {
    return generateBarChartConfig(transactions, true);
  }, [transactions]);

  const mobileCategoryData = useMemo(() => {
    return generatePieChartConfig(transactions, expenseCategories, true);
  }, [transactions, expenseCategories]);

  const getFilteredChartTitle = useMemo((): string => {
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
  }, [dateFilter, customStartDate, customEndDate]);

  const hasExpenseTransactions = transactions?.some(tx => tx.type === 'expense') || false;

  return (
    <>
      {/* Mobile Charts - Tabbed interface */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab header */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setMobileActiveChart('bar')}
              className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors ${
                mobileActiveChart === 'bar'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-bar mr-1.5 text-[10px]"></i>
              Overview
            </button>
            <button
              onClick={() => setMobileActiveChart('pie')}
              className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors ${
                mobileActiveChart === 'pie'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-pie mr-1.5 text-[10px]"></i>
              Categories
            </button>
          </div>

          {/* Chart content */}
          <div className="p-3">
            {mobileActiveChart === 'bar' ? (
              mobileMonthlyData ? (
                <div className="animate__animated animate__fadeIn">
                  {/* Mini legend for mobile */}
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <span className="flex items-center gap-1 text-[10px] text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-[#1cc88a]"></span>
                      Income
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-[#e74a3b]"></span>
                      Expenses
                    </span>
                  </div>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={mobileMonthlyData}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-chart-bar text-gray-400 text-lg"></i>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">No transaction data yet</p>
                  <Link 
                    to="/transactions/add" 
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[11px] font-medium rounded-lg"
                  >
                    <i className="fas fa-plus text-[9px]"></i>
                    Add Transaction
                  </Link>
                </div>
              )
            ) : (
              mobileCategoryData && hasExpenseTransactions ? (
                <div className="animate__animated animate__fadeIn">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={mobileCategoryData}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-chart-pie text-gray-400 text-lg"></i>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">No expense data to categorize</p>
                  <Link 
                    to="/transactions/add" 
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-[11px] font-medium rounded-lg"
                  >
                    <i className="fas fa-plus text-[9px]"></i>
                    Add Expense
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Desktop Charts - Original side-by-side layout */}
      <div className="desktop-charts-section">
        {/* Monthly Spending/Income Chart */}
        <div className="col-xl-8 col-lg-7 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 flex flex-row items-center justify-between">
              <h6 className="m-0 font-bold text-primary flex items-center text-sm">
                {getFilteredChartTitle}
                <div className="ml-2 relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => onToggleTip('monthlyChart', e)}
                  ></i>
                  {activeTip === 'monthlyChart' && (
                    <div className="tip-box">
                      <div className="tip-title">Monthly Overview</div>
                      <div className="tip-description">
                        Comparison of your income vs expenses over time. This helps you visualize spending patterns and identify months where you saved or overspent.
                      </div>
                    </div>
                  )}
                </div>
              </h6>
            </div>
            <div className="card-body p-3">
              {monthlyData ? (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={monthlyData}
                />
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="fas fa-chart-bar text-3xl text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-700 mb-1.5 text-lg">No Data</h5>
                  <p className="text-gray-500 mb-4 text-xs">
                    There's no transaction data to display for the selected period. Add some transactions to see your financial overview.
                  </p>
                  <Link 
                    to="/transactions/add" 
                    className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
                  >
                    <i className="fas fa-plus text-xs mr-1"></i>
                    Add Transaction
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="col-xl-4 col-lg-5 mb-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3 flex flex-row items-center justify-between">
              <h6 className="m-0 font-bold text-primary flex items-center text-sm">
                Expense Categories
                <div className="ml-2 relative">
                  <i 
                    className="fas fa-info-circle text-gray-400 cursor-pointer" 
                    onClick={(e) => onToggleTip('categoryChart', e)}
                  ></i>
                  {activeTip === 'categoryChart' && (
                    <div className="tip-box">
                      <div className="tip-title">Expense Breakdown</div>
                      <div className="tip-description">
                        Shows how your expenses are distributed across different categories. This helps identify your biggest spending areas.
                      </div>
                    </div>
                  )}
                </div>
              </h6>
            </div>
            <div className="card-body p-3">
              {categoryData && hasExpenseTransactions ? (
                <HighchartsReact
                  highcharts={Highcharts}
                  options={categoryData}
                />
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="fas fa-chart-pie text-3xl text-gray-300"></i>
                  </div>
                  <h5 className="text-gray-700 mb-1.5 text-lg">No Expenses</h5>
                  <p className="text-gray-500 mb-4 text-xs">
                    There are no expense transactions to categorize for the selected period.
                  </p>
                  <Link 
                    to="/transactions/add" 
                    className="inline-block w-auto px-3 py-2 bg-[#4e73df] hover:bg-[#2e59d9] text-white text-sm font-normal rounded shadow-sm transition-colors"
                  >
                    <i className="fas fa-plus text-xs mr-1"></i>
                    Add Expense
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .desktop-charts-section { display: none; }
        @media (min-width: 768px) {
          .desktop-charts-section { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; }
        }
      `}</style>
    </>
  );
});

ChartSection.displayName = 'ChartSection';

export default ChartSection;
