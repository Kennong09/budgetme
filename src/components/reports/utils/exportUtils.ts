import { formatCurrency, formatPercentage } from '../../../utils/helpers';
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable doesn't have type definitions
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import {
  ReportType,
  TimeframeType
} from '../components/ReportControls';
import {
  TrendData,
  BudgetRelationship
} from '../hooks';

// Export to PDF
export const exportToPDF = async (
  reportType: ReportType,
  timeframe: TimeframeType,
  format: 'chart' | 'table',
  categoryData?: any,
  monthlyData?: any,
  trendsData?: TrendData[],
  goalRelationship?: BudgetRelationship,
  monthlyFinancials?: any,
  chartRef?: any
): Promise<void> => {
  try {
    const reportTitle = `${
      reportType === "spending" 
        ? "Spending by Category" 
        : reportType === "income-expense" 
          ? "Income vs Expenses" 
          : reportType === "trends"
            ? "Financial Trends"
            : reportType === "goals"
              ? "Goal Allocations"
              : reportType === "savings"
                ? "Savings Rate"
                : "Financial Projections"
    } - ${timeframe === "month" ? "Monthly" : timeframe === "quarter" ? "Quarterly" : "Yearly"}`;
    
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text(reportTitle, 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30);
    
    if (format === "chart" && chartRef && chartRef.current && chartRef.current.chart) {
      const chartContainer = document.querySelector('.highcharts-container');
      
      if (chartContainer) {
        const canvas = await html2canvas(chartContainer as HTMLElement);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 14, 40, 270, 150);
      }
    } else if (format === "table") {
      let tableData: any[] = [];
      let headers: string[] = [];
      
      switch (reportType) {
        case "spending":
          if (categoryData) {
            headers = ["Category", "Amount", "Percentage"];
            if (Array.isArray(categoryData)) {
              const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
              tableData = categoryData.map(item => [
                item.name,
                formatCurrency(item.value),
                formatPercentage((item.value / total) * 100)
              ]);
            }
          }
          break;
          
        case "income-expense":
        case "savings":
        case "predictions":
          if (monthlyData) {
            headers = ["Month", "Income", "Expenses", "Savings", "Savings Rate"];
            if (Array.isArray(monthlyData)) {
              tableData = monthlyData.map(item => {
                if (item.income !== undefined && item.expenses !== undefined) {
                  const savings = item.income - item.expenses;
                  const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;
                  return [
                    item.name,
                    formatCurrency(item.income),
                    formatCurrency(item.expenses),
                    formatCurrency(savings),
                    formatPercentage(savingsRate)
                  ];
                } else if (item.rate !== undefined) {
                  return [
                    item.name,
                    '-',
                    '-',
                    '-',
                    formatPercentage(item.rate)
                  ];
                }
                return [];
              });
            }
          }
          break;
          
        case "trends":
          if (trendsData) {
            headers = ["Category", "Previous Amount", "Current Amount", "Change", "Change %"];
            tableData = trendsData.map(trend => [
              trend.category,
              formatCurrency(trend.previousAmount),
              formatCurrency(trend.currentAmount),
              formatCurrency(trend.currentAmount - trend.previousAmount),
              `${trend.change >= 0 ? "+" : ""}${trend.change.toFixed(2)}%`
            ]);
          }
          break;
          
        case "goals":
          if (goalRelationship) {
            headers = ["Metric", "Value"];
            tableData = [
              ["Total Budget Allocated", formatCurrency(goalRelationship.totalBudgetAllocated)],
              ["Total Spent on Goals", formatCurrency(goalRelationship.totalSpentOnGoals)],
              ["Percentage Budget to Goals", formatPercentage(goalRelationship.percentageBudgetToGoals)],
              ["Goal Transactions Count", goalRelationship.goalTransactionsCount.toString()]
            ];
          }
          break;
      }
      
      if (tableData.length > 0) {
        (doc as any).autoTable({
          head: [headers],
          body: tableData,
          startY: 40,
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 },
          headStyles: { fillColor: [78, 115, 223], textColor: 255, fontStyle: 'bold' }
        });
      }
    }
    
    if (monthlyFinancials) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Monthly Summary:', 14, 200);
      
      doc.setFontSize(11);
      doc.text(`Income: ${formatCurrency(monthlyFinancials.income)}`, 14, 210);
      doc.text(`Expenses: ${formatCurrency(monthlyFinancials.expenses)}`, 14, 220);
      doc.text(`Savings: ${formatCurrency(monthlyFinancials.savings)}`, 14, 230);
      doc.text(`Savings Rate: ${formatPercentage(monthlyFinancials.savingsRate)}`, 14, 240);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Generated by BudgetMe App', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    
    doc.save(`financial-report-${reportType}-${timeframe}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Export to CSV
export const exportToCSV = (
  reportType: ReportType,
  timeframe: TimeframeType,
  categoryData?: any,
  monthlyData?: any,
  trendsData?: TrendData[],
  goalRelationship?: BudgetRelationship
): void => {
  try {
    let data: any[] = [];
    let fileName = `financial-report-${reportType}-${timeframe}.csv`;
    
    switch (reportType) {
      case "spending":
        if (categoryData && Array.isArray(categoryData)) {
          const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
          data = categoryData.map(item => ({
            Category: item.name,
            Amount: item.value,
            Percentage: (item.value / total) * 100
          }));
        }
        break;
        
      case "income-expense":
      case "savings":
      case "predictions":
        if (monthlyData && Array.isArray(monthlyData)) {
          data = monthlyData.map(item => {
            if (item.income !== undefined && item.expenses !== undefined) {
              return {
                Month: item.name,
                Income: item.income,
                Expenses: item.expenses,
                Savings: item.income - item.expenses,
                SavingsRate: item.income > 0 ? ((item.income - item.expenses) / item.income) * 100 : 0
              };
            } else if (item.rate !== undefined) {
              return {
                Month: item.name,
                SavingsRate: item.rate
              };
            }
            return {};
          });
        }
        break;
        
      case "trends":
        if (trendsData) {
          data = trendsData.map(trend => ({
            Category: trend.category,
            PreviousAmount: trend.previousAmount,
            CurrentAmount: trend.currentAmount,
            Change: trend.currentAmount - trend.previousAmount,
            ChangePercent: trend.change
          }));
        }
        break;
        
      case "goals":
        if (goalRelationship) {
          data = [
            { Metric: "TotalBudgetAllocated", Value: goalRelationship.totalBudgetAllocated },
            { Metric: "TotalSpentOnGoals", Value: goalRelationship.totalSpentOnGoals },
            { Metric: "PercentageBudgetToGoals", Value: goalRelationship.percentageBudgetToGoals },
            { Metric: "GoalTransactionsCount", Value: goalRelationship.goalTransactionsCount }
          ];
        }
        break;
    }
    
    if (data.length === 0) {
      throw new Error('No data available to export');
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV report');
  }
};

// Export to Excel
export const exportToExcel = (
  reportType: ReportType,
  timeframe: TimeframeType,
  categoryData?: any,
  monthlyData?: any,
  trendsData?: TrendData[],
  goalRelationship?: BudgetRelationship,
  monthlyFinancials?: any
): void => {
  try {
    let data: any[] = [];
    let fileName = `financial-report-${reportType}-${timeframe}.xlsx`;
    
    switch (reportType) {
      case "spending":
        if (categoryData && Array.isArray(categoryData)) {
          const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
          data = categoryData.map(item => ({
            Category: item.name,
            Amount: item.value,
            Percentage: (item.value / total) * 100
          }));
        }
        break;
        
      case "income-expense":
      case "savings":
      case "predictions":
        if (monthlyData && Array.isArray(monthlyData)) {
          data = monthlyData.map(item => {
            if (item.income !== undefined && item.expenses !== undefined) {
              return {
                Month: item.name,
                Income: item.income,
                Expenses: item.expenses,
                Savings: item.income - item.expenses,
                "Savings Rate (%)": item.income > 0 ? ((item.income - item.expenses) / item.income) * 100 : 0
              };
            } else if (item.rate !== undefined) {
              return {
                Month: item.name,
                "Savings Rate (%)": item.rate
              };
            }
            return {};
          });
        }
        break;
        
      case "trends":
        if (trendsData) {
          data = trendsData.map(trend => ({
            Category: trend.category,
            "Previous Amount": trend.previousAmount,
            "Current Amount": trend.currentAmount,
            "Change": trend.currentAmount - trend.previousAmount,
            "Change (%)": trend.change
          }));
        }
        break;
        
      case "goals":
        if (goalRelationship) {
          data = [
            { Metric: "Total Budget Allocated", Value: goalRelationship.totalBudgetAllocated },
            { Metric: "Total Spent on Goals", Value: goalRelationship.totalSpentOnGoals },
            { Metric: "Percentage Budget to Goals (%)", Value: goalRelationship.percentageBudgetToGoals },
            { Metric: "Goal Transactions Count", Value: goalRelationship.goalTransactionsCount }
          ];
        }
        break;
    }
    
    if (data.length === 0) {
      throw new Error('No data available to export');
    }
    
    const reportTitle = `${
      reportType === "spending" 
        ? "Spending by Category" 
        : reportType === "income-expense" 
          ? "Income vs Expenses" 
          : reportType === "trends"
            ? "Financial Trends"
            : "Goal Allocations"
    } - ${timeframe === "month" ? "Monthly" : timeframe === "quarter" ? "Quarterly" : "Yearly"}`;
    
    const metadata = [
      { Report: reportTitle },
      { Generated: new Date().toLocaleString() },
      { },
      { "Monthly Summary": "" },
      ...(monthlyFinancials ? [
        { "Income": monthlyFinancials.income },
        { "Expenses": monthlyFinancials.expenses },
        { "Savings": monthlyFinancials.savings },
        { "Savings Rate (%)": monthlyFinancials.savingsRate }
      ] : []),
      { },
      { }
    ];
    
    const metadataWS = XLSX.utils.json_to_sheet(metadata);
    const dataWS = XLSX.utils.json_to_sheet(data);
    
    const workbook = { 
      Sheets: { 
        'Report Info': metadataWS,
        'Data': dataWS 
      }, 
      SheetNames: ['Report Info', 'Data'] 
    };
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw new Error('Failed to generate Excel report');
  }
};