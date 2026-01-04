import { formatCurrency, formatPercentage } from '../../../utils/helpers';
// @ts-ignore - papaparse types issue
import * as Papa from 'papaparse';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, HeadingLevel, ImageRun } from 'docx';
import html2canvas from 'html2canvas';
import {
  ReportType,
  TimeframeType
} from '../components/ReportControls';
import {
  TrendData,
  BudgetRelationship
} from '../hooks';

// Dynamic import for pdfMake to handle Vite/ESM compatibility
const loadPdfMake = async (): Promise<any> => {
  const pdfMakeModule: any = await import('pdfmake/build/pdfmake');
  const pdfFontsModule: any = await import('pdfmake/build/vfs_fonts');
  
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const pdfFonts = pdfFontsModule.default || pdfFontsModule;
  
  // Set fonts without reassigning import
  if (pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
  } else {
    pdfMake.vfs = pdfFonts;
  }
  
  return pdfMake;
};

// Helper function to get report title
const getReportTitle = (reportType: ReportType, timeframe: TimeframeType): string => {
  const typeTitle = reportType === "spending" 
    ? "Spending by Category" 
    : reportType === "income-expense" 
      ? "Income vs Expenses" 
      : reportType === "trends"
        ? "Financial Trends"
        : reportType === "goals"
          ? "Goal Allocations"
          : reportType === "savings"
            ? "Savings Rate"
            : "Financial Projections";

  const timeframeTitle = timeframe === "month" 
    ? "Monthly" 
    : timeframe === "quarter" 
      ? "Quarterly" 
      : "Yearly";

  return `${typeTitle} (${timeframeTitle})`;
};

// Helper function to convert base64 string to Uint8Array (browser-compatible)
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper function to validate data URL
const isValidDataUrl = (dataUrl: string | null): boolean => {
  if (!dataUrl) return false;
  // Check if it's a proper data URL with actual content
  const pattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+=*$/;
  return pattern.test(dataUrl) && dataUrl.length > 50; // Must have meaningful content
};

// Helper function to capture chart as image
const captureChartImage = async (): Promise<string | null> => {
  try {
    // Find the chart container - Highcharts renders in a div with class 'highcharts-container'
    const chartContainer = document.querySelector('.highcharts-container');
    if (!chartContainer) {
      console.warn('Chart container not found');
      return null;
    }

    // Get the parent element that contains the full chart
    const chartElement = chartContainer.parentElement;
    if (!chartElement) {
      console.warn('Chart element not found');
      return null;
    }

    // Capture the chart as canvas
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true
    });

    // Convert canvas to base64 image
    const dataUrl = canvas.toDataURL('image/png');
    
    // Validate the data URL before returning
    if (!isValidDataUrl(dataUrl)) {
      console.warn('Generated data URL is invalid or empty');
      return null;
    }
    
    return dataUrl;
  } catch (error) {
    console.error('Error capturing chart:', error);
    return null;
  }
};

// Export to PDF using pdfmake
export const exportToPDF = async (
  reportType: ReportType,
  timeframe: TimeframeType,
  format: 'chart' | 'table',
  categoryData?: any,
  monthlyData?: any,
  trendsData?: TrendData[],
  goalRelationship?: BudgetRelationship,
  monthlyFinancials?: any,
  chartRef?: any,
  aiInsights?: any[]
): Promise<void> => {
  try {
    const reportTitle = getReportTitle(reportType, timeframe);
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    let tableBody: any[] = [];
      let headers: string[] = [];
      
    // Prepare data based on report type
      switch (reportType) {
        case "spending":
        if (categoryData && Array.isArray(categoryData)) {
            headers = ["Category", "Amount", "Percentage"];
              const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
          tableBody = categoryData.map(item => [
                item.name,
                formatCurrency(item.value),
                formatPercentage((item.value / total) * 100)
              ]);
          tableBody.push([
            { text: 'Total', bold: true },
            { text: formatCurrency(total), bold: true },
            { text: '100.00%', bold: true }
          ]);
          }
          break;
          
        case "income-expense":
        case "savings":
        case "predictions":
        if (monthlyData && Array.isArray(monthlyData)) {
            headers = ["Month", "Income", "Expenses", "Savings", "Savings Rate"];
          tableBody = monthlyData.map(item => {
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
          break;
          
        case "trends":
        if (trendsData && trendsData.length > 0) {
          headers = ["Category", "Previous", "Current", "Change", "Change %"];
          tableBody = trendsData.map(trend => [
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
          tableBody = [
              ["Total Budget Allocated", formatCurrency(goalRelationship.totalBudgetAllocated)],
              ["Total Spent on Goals", formatCurrency(goalRelationship.totalSpentOnGoals)],
              ["Percentage Budget to Goals", formatPercentage(goalRelationship.percentageBudgetToGoals)],
              ["Goal Transactions Count", goalRelationship.goalTransactionsCount.toString()]
            ];
          }
          break;
      }
      
    // Capture chart image if format is 'chart'
    let chartImage: string | null = null;
    if (format === 'chart') {
      chartImage = await captureChartImage();
    }

    // Build PDF document definition with BudgetMe branding
    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [40, 80, 40, 60],
      content: [
        // Header with gradient-style background (simulated with colored box)
        {
          canvas: [
            {
              type: 'rect',
              x: -40,
              y: -80,
              w: 882, // Full width for landscape A4
              h: 120,
              linearGradient: ['#4F46E5', '#8B5CF6'],
              color: '#4F46E5'
            }
          ]
        },
        // Logo and Title Section
        {
          columns: [
            {
              width: '*',
              stack: [
                {
                  text: 'BudgetMe',
                  style: 'logo',
                  margin: [0, -100, 0, 5]
                },
                {
                  text: 'Financial Intelligence Platform',
                  style: 'logoTagline',
                  margin: [0, 0, 0, 0]
                }
              ]
            },
            {
              width: 'auto',
              stack: [
                {
                  text: reportTitle,
                  style: 'reportTitle',
                  alignment: 'right',
                  margin: [0, -100, 0, 5]
                },
                {
                  text: `Generated: ${formattedDate}`,
                  style: 'dateText',
                  alignment: 'right',
                  margin: [0, 0, 0, 0]
                }
              ]
            }
          ],
          margin: [0, 0, 0, 30]
        }
      ],
      styles: {
        logo: {
          fontSize: 28,
          bold: true,
          color: '#FFFFFF'
        },
        logoTagline: {
          fontSize: 10,
          color: '#E0E7FF',
          italics: true
        },
        reportTitle: {
          fontSize: 18,
          bold: true,
          color: '#FFFFFF'
        },
        dateText: {
          fontSize: 9,
          color: '#E0E7FF'
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          color: '#4F46E5',
          margin: [0, 20, 0, 12]
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: '#FFFFFF',
          fillColor: '#4F46E5'
        },
        tableRow: {
          fontSize: 10,
          color: '#1F2937'
        },
        summaryLabel: {
          fontSize: 11,
          bold: true,
          color: '#64748B'
        },
        summaryValue: {
          fontSize: 11,
          color: '#1F2937'
        },
        insightTitle: {
          fontSize: 12,
          bold: true,
          margin: [0, 0, 0, 5]
        },
        insightDescription: {
          fontSize: 10,
          color: '#475569',
          lineHeight: 1.4
        },
        footerText: {
          fontSize: 9,
          color: '#94A3B8',
          italics: true
        }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    // Add chart image if available and valid
    if (chartImage && isValidDataUrl(chartImage)) {
      docDefinition.content.push(
        {
          text: 'Visual Overview',
          style: 'sectionHeader'
        },
        {
          image: chartImage,
          width: 700,
          alignment: 'center',
          margin: [0, 10, 0, 25]
        }
      );
    }

    // Add main data table
    if (tableBody.length > 0 && headers.length > 0) {
      docDefinition.content.push(
        {
          text: 'Detailed Breakdown',
          style: 'sectionHeader'
        },
        {
          table: {
            headerRows: 1,
            widths: Array(headers.length).fill('*'),
            body: [
              headers.map(h => ({ text: h, style: 'tableHeader', alignment: 'center' })),
              ...tableBody.map((row: any[]) => row.map(cell => ({ 
                text: cell, 
                style: 'tableRow',
                alignment: typeof cell === 'string' && cell.includes('₱') ? 'right' : 'left'
              })))
            ]
          },
          layout: {
            fillColor: function (rowIndex: number) {
              return rowIndex === 0 ? '#4F46E5' : (rowIndex % 2 === 0 ? '#F8FAFF' : '#FFFFFF');
            },
            hLineWidth: function (i: number, node: any) {
              return (i === 0 || i === node.table.body.length) ? 2 : 0.5;
            },
            vLineWidth: function () {
              return 0.5;
            },
            hLineColor: function (i: number, node: any) {
              return (i === 0 || i === node.table.body.length) ? '#4F46E5' : '#E2E8F0';
            },
            vLineColor: function () {
              return '#E2E8F0';
            },
            paddingLeft: function() { return 10; },
            paddingRight: function() { return 10; },
            paddingTop: function() { return 8; },
            paddingBottom: function() { return 8; }
          },
          margin: [0, 0, 0, 20]
        }
      );
    }

    // Add monthly summary if available
    if (monthlyFinancials && (monthlyFinancials.income > 0 || monthlyFinancials.expenses > 0)) {
      const savingsColor = monthlyFinancials.savings >= 0 ? '#10B981' : '#EF4444';
      
      docDefinition.content.push(
        {
          text: 'Monthly Financial Summary',
          style: 'sectionHeader'
        },
        {
          columns: [
            {
              width: '25%',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 150,
                      h: 80,
                      r: 8,
                      color: '#F0FDF4'
                    }
                  ]
                },
                {
                  text: 'Income',
                  style: 'summaryLabel',
                  margin: [10, -70, 0, 5]
                },
                {
                  text: formatCurrency(monthlyFinancials.income),
                  fontSize: 16,
                  bold: true,
                  color: '#10B981',
                  margin: [10, 0, 0, 0]
                }
              ]
            },
            {
              width: '25%',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 150,
                      h: 80,
                      r: 8,
                      color: '#FEF2F2'
                    }
                  ]
                },
                {
                  text: 'Expenses',
                  style: 'summaryLabel',
                  margin: [10, -70, 0, 5]
                },
                {
                  text: formatCurrency(monthlyFinancials.expenses),
                  fontSize: 16,
                  bold: true,
                  color: '#EF4444',
                  margin: [10, 0, 0, 0]
                }
              ]
            },
            {
              width: '25%',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 150,
                      h: 80,
                      r: 8,
                      color: savingsColor === '#10B981' ? '#F0FDF4' : '#FEF2F2'
                    }
                  ]
                },
                {
                  text: 'Savings',
                  style: 'summaryLabel',
                  margin: [10, -70, 0, 5]
                },
                {
                  text: formatCurrency(monthlyFinancials.savings),
                  fontSize: 16,
                  bold: true,
                  color: savingsColor,
                  margin: [10, 0, 0, 0]
                }
              ]
            },
            {
              width: '25%',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 150,
                      h: 80,
                      r: 8,
                      color: '#EEF2FF'
                    }
                  ]
                },
                {
                  text: 'Savings Rate',
                  style: 'summaryLabel',
                  margin: [10, -70, 0, 5]
                },
                {
                  text: formatPercentage(monthlyFinancials.savingsRate),
                  fontSize: 16,
                  bold: true,
                  color: '#4F46E5',
                  margin: [10, 0, 0, 0]
                }
              ]
            }
          ],
          columnGap: 15,
          margin: [0, 10, 0, 25]
        }
      );
    }

    // Add AI Insights if available
    if (aiInsights && aiInsights.length > 0) {
      docDefinition.content.push(
        {
          text: 'AI Financial Insights',
          style: 'sectionHeader',
          pageBreak: aiInsights.length > 3 ? 'before' : undefined
        },
        {
          text: 'Personalized recommendations powered by artificial intelligence',
          fontSize: 10,
          color: '#64748B',
          italics: true,
          margin: [0, 0, 0, 15]
        }
      );

      aiInsights.forEach((insight, index) => {
        const typeConfig = {
          success: { color: '#10B981', bg: '#F0FDF4', icon: '✓' },
          warning: { color: '#F59E0B', bg: '#FFFBEB', icon: '⚠' },
          info: { color: '#3B82F6', bg: '#EFF6FF', icon: 'ℹ' },
          tip: { color: '#8B5CF6', bg: '#F5F3FF', icon: '💡' }
        };
        
        const config = typeConfig[insight.type as keyof typeof typeConfig] || typeConfig.info;
        
        docDefinition.content.push({
          columns: [
            {
              width: 40,
              stack: [
                {
                  canvas: [
                    {
                      type: 'ellipse',
                      x: 20,
                      y: 20,
                      r1: 18,
                      r2: 18,
                      color: config.color
                    }
                  ]
                },
                {
                  text: config.icon,
                  fontSize: 16,
                  color: '#FFFFFF',
                  alignment: 'center',
                  margin: [0, -28, 0, 0]
                }
              ]
            },
            {
              width: '*',
              stack: [
                {
                  text: insight.title,
                  style: 'insightTitle',
                  color: config.color
                },
                {
                  text: insight.description,
                  style: 'insightDescription'
                }
              ]
            }
          ],
          columnGap: 15,
          margin: [0, 0, 0, 15]
        });
      });
    }

    // Add footer with branding
    docDefinition.footer = function(currentPage: number, pageCount: number) {
      return {
        columns: [
          {
            width: '*',
            text: '© 2025 BudgetMe - Financial Intelligence Platform',
            style: 'footerText',
            margin: [40, 20, 0, 0]
          },
          {
            width: 'auto',
            text: `Page ${currentPage} of ${pageCount}`,
            style: 'footerText',
            alignment: 'right',
            margin: [0, 20, 40, 0]
          }
        ]
      };
    };

    // Generate and download PDF
    const pdfMake = await loadPdfMake();
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.download(`budgetme-${reportType}-report-${timeframe}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Export to CSV using PapaParse
export const exportToCSV = (
  reportType: ReportType,
  timeframe: TimeframeType,
  categoryData?: any,
  monthlyData?: any,
  trendsData?: TrendData[],
  goalRelationship?: BudgetRelationship,
  aiInsights?: any[]
): void => {
  try {
    const reportTitle = getReportTitle(reportType, timeframe);
    let data: any[] = [];
    
    switch (reportType) {
      case "spending":
        if (categoryData && Array.isArray(categoryData)) {
          const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
          data = categoryData.map(item => ({
            Category: item.name,
            Amount: item.value.toFixed(2),
            Percentage: ((item.value / total) * 100).toFixed(2)
          }));
          // Add total row
          data.push({
            Category: 'TOTAL',
            Amount: total.toFixed(2),
            Percentage: '100.00'
          });
        }
        break;
        
      case "income-expense":
      case "savings":
      case "predictions":
        if (monthlyData && Array.isArray(monthlyData)) {
          data = monthlyData.map(item => {
            if (item.income !== undefined && item.expenses !== undefined) {
              const savings = item.income - item.expenses;
              const savingsRate = item.income > 0 ? ((savings / item.income) * 100).toFixed(2) : '0.00';
              return {
                Month: item.name,
                Income: item.income.toFixed(2),
                Expenses: item.expenses.toFixed(2),
                Savings: savings.toFixed(2),
                'Savings Rate (%)': savingsRate
              };
            } else if (item.rate !== undefined) {
              return {
                Month: item.name,
                'Savings Rate (%)': item.rate.toFixed(2)
              };
            }
            return {};
          });
        }
        break;
        
      case "trends":
        if (trendsData && trendsData.length > 0) {
          data = trendsData.map(trend => ({
            Category: trend.category,
            'Previous Amount': trend.previousAmount.toFixed(2),
            'Current Amount': trend.currentAmount.toFixed(2),
            'Change': (trend.currentAmount - trend.previousAmount).toFixed(2),
            'Change (%)': trend.change.toFixed(2)
          }));
        }
        break;
        
      case "goals":
        if (goalRelationship) {
          data = [
            { Metric: "Total Budget Allocated", Value: goalRelationship.totalBudgetAllocated.toFixed(2) },
            { Metric: "Total Spent on Goals", Value: goalRelationship.totalSpentOnGoals.toFixed(2) },
            { Metric: "Percentage Budget to Goals", Value: goalRelationship.percentageBudgetToGoals.toFixed(2) },
            { Metric: "Goal Transactions Count", Value: goalRelationship.goalTransactionsCount.toString() }
          ];
        }
        break;
    }
    
    if (data.length === 0) {
      throw new Error('No data available to export');
    }
    
    // Add metadata header
    const metadata = [
      { '': `BudgetMe Financial Report - ${reportTitle}` },
      { '': `Generated: ${new Date().toLocaleString()}` },
      { '': '' } // Empty row for spacing
    ];

    // Convert to CSV with PapaParse
    const csvContent = Papa.unparse(data, {
      quotes: true,
      header: true
    });

    // Add AI Insights section if available
    let insightsCSV = '';
    if (aiInsights && aiInsights.length > 0) {
      const insightsData = aiInsights.map(insight => ({
        'Type': insight.type,
        'Title': insight.title,
        'Description': insight.description
      }));
      
      const insightsHeader = [
        { '': '' },
        { '': 'AI FINANCIAL INSIGHTS' },
        { '': '' }
      ];
      
      insightsCSV = '\n\n' + Papa.unparse(insightsHeader, { header: false }) + '\n' + 
                    Papa.unparse(insightsData, { quotes: true, header: true });
    }

    // Add metadata at the beginning
    const metadataCSV = Papa.unparse(metadata, { header: false });
    const finalCSV = `${metadataCSV}\n\n${csvContent}${insightsCSV}`;
    
    // Create blob and download
    const blob = new Blob([finalCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `budgetme-${reportType}-report-${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV report');
  }
};

// Export to DOCX using docx library
export const exportToDOCX = async (
  reportType: ReportType,
  timeframe: TimeframeType,
  categoryData?: any,
  monthlyData?: any,
  trendsData?: TrendData[],
  goalRelationship?: BudgetRelationship,
  monthlyFinancials?: any,
  aiInsights?: any[]
): Promise<void> => {
  try {
    const reportTitle = getReportTitle(reportType, timeframe);
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    // Capture chart image
    const chartImageBase64 = await captureChartImage();

    const sections: any[] = [];

    // Header paragraphs with branding
    const headerParagraphs = [
      new Paragraph({
        children: [
          new TextRun({
            text: "BudgetMe",
            bold: true,
            size: 48,
            color: "4F46E5"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Financial Intelligence Platform",
            size: 18,
            color: "8B5CF6",
            italics: true
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: reportTitle,
            bold: true,
            size: 32,
            color: "1F2937"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${formattedDate}`,
            size: 18,
            color: "64748B",
            italics: true
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        border: {
          bottom: {
            color: "4F46E5",
            space: 1,
            style: "single" as any,
            size: 6
          }
        }
      })
    ];

    // Add chart image if available and valid
    const chartParagraphs: Paragraph[] = [];
    if (chartImageBase64 && isValidDataUrl(chartImageBase64)) {
      try {
        // Remove the data:image/png;base64, prefix
        const base64Data = chartImageBase64.split(',')[1];
        
        if (base64Data && base64Data.length > 0) {
          // Use browser-compatible base64 to Uint8Array conversion
          const imageData = base64ToUint8Array(base64Data);
          
          chartParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Visual Overview",
                  bold: true,
                  size: 28,
                  color: "4F46E5"
                })
              ],
              spacing: { before: 300, after: 200 }
            }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageData,
                  transformation: {
                    width: 600,
                    height: 400
                  },
                  type: 'png'
                } as any)
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 400 }
            })
          );
        }
      } catch (error) {
        console.error('Error adding chart image to DOCX:', error);
      }
    }

    let tableRows: TableRow[] = [];
    const tableSectionHeader: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: "Detailed Breakdown",
            bold: true,
            size: 28,
            color: "4F46E5"
          })
        ],
        spacing: { before: 300, after: 200 }
      })
    ];

    // Prepare table data based on report type
    switch (reportType) {
      case "spending":
        if (categoryData && Array.isArray(categoryData)) {
          const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
          
          // Header row with brand colors
          tableRows.push(new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: "Category", bold: true, color: "FFFFFF" })],
                  alignment: AlignmentType.CENTER
                })],
                shading: { fill: "4F46E5" }
              }),
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: "Amount", bold: true, color: "FFFFFF" })],
                  alignment: AlignmentType.CENTER
                })],
                shading: { fill: "4F46E5" }
              }),
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: "Percentage", bold: true, color: "FFFFFF" })],
                  alignment: AlignmentType.CENTER
                })],
                shading: { fill: "4F46E5" }
              })
            ]
          }));

          // Data rows with alternating colors
          categoryData.forEach((item, index) => {
            const rowColor = index % 2 === 0 ? "F8FAFF" : "FFFFFF";
            tableRows.push(new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph(item.name)],
                  shading: { fill: rowColor }
                }),
                new TableCell({ 
                  children: [new Paragraph({ 
                    children: [new TextRun(formatCurrency(item.value))],
                    alignment: AlignmentType.RIGHT
                  })],
                  shading: { fill: rowColor }
                }),
                new TableCell({ 
                  children: [new Paragraph({ 
                    children: [new TextRun(formatPercentage((item.value / total) * 100))],
                    alignment: AlignmentType.RIGHT
                  })],
                  shading: { fill: rowColor }
                })
              ]
            }));
          });

          // Total row
          tableRows.push(new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(total), bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "100.00%", bold: true })] })] })
            ]
          }));
        }
        break;
        
      case "income-expense":
      case "savings":
      case "predictions":
        if (monthlyData && Array.isArray(monthlyData)) {
          // Header row
          tableRows.push(new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Month", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Income", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Expenses", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Savings", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Savings Rate", bold: true })] })], shading: { fill: "4e73df" } })
            ]
          }));

          // Data rows
          monthlyData.forEach(item => {
            if (item.income !== undefined && item.expenses !== undefined) {
              const savings = item.income - item.expenses;
              const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;
              tableRows.push(new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(item.name)] }),
                  new TableCell({ children: [new Paragraph(formatCurrency(item.income))] }),
                  new TableCell({ children: [new Paragraph(formatCurrency(item.expenses))] }),
                  new TableCell({ children: [new Paragraph(formatCurrency(savings))] }),
                  new TableCell({ children: [new Paragraph(formatPercentage(savingsRate))] })
                ]
              }));
            }
          });
        }
        break;
        
      case "trends":
        if (trendsData && trendsData.length > 0) {
          // Header row
          tableRows.push(new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Category", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Previous", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Current", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Change", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Change %", bold: true })] })], shading: { fill: "4e73df" } })
            ]
          }));

          // Data rows
          trendsData.forEach(trend => {
            tableRows.push(new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(trend.category)] }),
                new TableCell({ children: [new Paragraph(formatCurrency(trend.previousAmount))] }),
                new TableCell({ children: [new Paragraph(formatCurrency(trend.currentAmount))] }),
                new TableCell({ children: [new Paragraph(formatCurrency(trend.currentAmount - trend.previousAmount))] }),
                new TableCell({ children: [new Paragraph(`${trend.change >= 0 ? "+" : ""}${trend.change.toFixed(2)}%`)] })
              ]
            }));
          });
        }
        break;
        
      case "goals":
        if (goalRelationship) {
          // Header row
          tableRows.push(new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true })] })], shading: { fill: "4e73df" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Value", bold: true })] })], shading: { fill: "4e73df" } })
            ]
          }));

          // Data rows
          const goalData = [
            ["Total Budget Allocated", formatCurrency(goalRelationship.totalBudgetAllocated)],
            ["Total Spent on Goals", formatCurrency(goalRelationship.totalSpentOnGoals)],
            ["Percentage Budget to Goals", formatPercentage(goalRelationship.percentageBudgetToGoals)],
            ["Goal Transactions Count", goalRelationship.goalTransactionsCount.toString()]
          ];

          goalData.forEach(([metric, value]) => {
            tableRows.push(new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(metric)] }),
                new TableCell({ children: [new Paragraph(value)] })
              ]
            }));
          });
        }
        break;
    }
    
    // Create main table
    const mainTable = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    });

    // Add monthly summary if available
    const summaryParagraphs: Paragraph[] = [];
    if (monthlyFinancials && (monthlyFinancials.income > 0 || monthlyFinancials.expenses > 0)) {
      summaryParagraphs.push(
        new Paragraph({
          text: "",
          spacing: { before: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Monthly Financial Summary",
              bold: true,
              size: 28,
              color: "4F46E5"
            })
          ],
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "💰 Income: ", bold: true, size: 24, color: "10B981" }),
            new TextRun({ text: formatCurrency(monthlyFinancials.income), size: 24, color: "10B981" })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "💸 Expenses: ", bold: true, size: 24, color: "EF4444" }),
            new TextRun({ text: formatCurrency(monthlyFinancials.expenses), size: 24, color: "EF4444" })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ 
              text: "💎 Savings: ", 
              bold: true, 
              size: 24, 
              color: monthlyFinancials.savings >= 0 ? "10B981" : "EF4444" 
            }),
            new TextRun({ 
              text: formatCurrency(monthlyFinancials.savings), 
              size: 24, 
              color: monthlyFinancials.savings >= 0 ? "10B981" : "EF4444" 
            })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "📊 Savings Rate: ", bold: true, size: 24, color: "4F46E5" }),
            new TextRun({ text: formatPercentage(monthlyFinancials.savingsRate), size: 24, color: "4F46E5" })
          ],
          spacing: { after: 200 }
        })
      );
    }

    // Add AI Insights if available
    const insightsParagraphs: Paragraph[] = [];
    if (aiInsights && aiInsights.length > 0) {
      insightsParagraphs.push(
        new Paragraph({
          text: "",
          spacing: { before: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "AI Financial Insights",
              bold: true,
              size: 32,
              color: "4F46E5"
            })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ 
              text: "Personalized recommendations powered by artificial intelligence",
              italics: true,
              size: 20,
              color: "64748B"
            })
          ],
          spacing: { after: 300 }
        })
      );

      aiInsights.forEach((insight, index) => {
        const typeConfig = {
          success: { color: "10B981", icon: "✓" },
          warning: { color: "F59E0B", icon: "⚠" },
          info: { color: "3B82F6", icon: "ℹ" },
          tip: { color: "8B5CF6", icon: "💡" }
        };
        
        const config = typeConfig[insight.type as keyof typeof typeConfig] || typeConfig.info;
        
        insightsParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ 
                text: `${config.icon} ${insight.title}`, 
                bold: true,
                size: 24,
                color: config.color
              })
            ],
            spacing: { before: 250, after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: insight.description,
                size: 22,
                color: "475569"
              })
            ],
            spacing: { after: 200 }
          })
        );
      });
    }

    // Create document with branding
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          ...headerParagraphs,
          ...chartParagraphs,
          ...tableSectionHeader,
          mainTable,
          ...summaryParagraphs,
          ...insightsParagraphs,
          // Footer
          new Paragraph({
            text: "",
            spacing: { before: 600 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "© 2025 BudgetMe - Financial Intelligence Platform",
                size: 18,
                color: "94A3B8",
                italics: true
              })
            ],
            alignment: AlignmentType.CENTER,
            border: {
              top: {
                color: "E2E8F0",
                space: 1,
                style: "single" as any,
                size: 6
              }
            },
            spacing: { before: 200 }
          })
        ]
      }]
    });

    // Generate and download DOCX
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `budgetme-${reportType}-report-${timeframe}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Failed to generate DOCX report');
  }
};
