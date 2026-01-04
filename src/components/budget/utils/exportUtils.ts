import { formatCurrency, formatPercentage } from '../../../utils/helpers';
// @ts-ignore - papaparse types issue
import * as Papa from 'papaparse';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType } from 'docx';

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

interface Budget {
  id: string;
  category_name?: string;
  budget_name: string;
  amount: number;
  spent: number;
  remaining?: number;
  percentage?: number;
  percentage_used?: number;
  period: string;
  start_date: string;
  end_date: string;
  status?: string;
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Helper function to get status color
const getStatusColor = (percentage: number): { color: string; bg: string; status: string } => {
  if (percentage >= 100) {
    return { color: '#EF4444', bg: '#FEF2F2', status: 'Over Budget' };
  } else if (percentage >= 80) {
    return { color: '#F59E0B', bg: '#FFFBEB', status: 'Warning' };
  } else {
    return { color: '#10B981', bg: '#F0FDF4', status: 'On Track' };
  }
};

// Export budgets to PDF
export const exportBudgetsToPDF = async (
  budgets: Budget[],
  filterInfo?: string
): Promise<void> => {
  try {
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    // Calculate summary
    const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = budgets.reduce((sum, b) => sum + (b.remaining ?? 0), 0);
    const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    // Build PDF document definition with BudgetMe branding
    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [40, 80, 40, 60],
      content: [
        // Header with gradient-style background
        {
          canvas: [
            {
              type: 'rect',
              x: -40,
              y: -80,
              w: 882,
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
                  text: 'Budget Overview',
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
        },
        // Filter info if provided
        ...(filterInfo ? [{
          text: filterInfo,
          fontSize: 10,
          color: '#64748B',
          italics: true,
          margin: [0, 0, 0, 20]
        }] : []),
        // Summary Cards
        {
          text: 'Budget Summary',
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
                      h: 70,
                      r: 8,
                      color: '#EEF2FF'
                    }
                  ]
                },
                {
                  text: 'Total Budgeted',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: formatCurrency(totalBudgeted),
                  fontSize: 14,
                  bold: true,
                  color: '#4F46E5',
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
                      h: 70,
                      r: 8,
                      color: '#FEF2F2'
                    }
                  ]
                },
                {
                  text: 'Total Spent',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: formatCurrency(totalSpent),
                  fontSize: 14,
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
                      h: 70,
                      r: 8,
                      color: '#F0FDF4'
                    }
                  ]
                },
                {
                  text: 'Remaining',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: formatCurrency(totalRemaining),
                  fontSize: 14,
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
                      h: 70,
                      r: 8,
                      color: overallPercentage >= 100 ? '#FEF2F2' : overallPercentage >= 80 ? '#FFFBEB' : '#F0FDF4'
                    }
                  ]
                },
                {
                  text: 'Overall Usage',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: formatPercentage(overallPercentage),
                  fontSize: 14,
                  bold: true,
                  color: overallPercentage >= 100 ? '#EF4444' : overallPercentage >= 80 ? '#F59E0B' : '#10B981',
                  margin: [10, 0, 0, 0]
                }
              ]
            }
          ],
          columnGap: 15,
          margin: [0, 10, 0, 25]
        },
        // Budgets Table
        {
          text: 'Budget Details',
          style: 'sectionHeader'
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              // Header row
              [
                { text: 'Category', style: 'tableHeader', alignment: 'center' },
                { text: 'Budgeted', style: 'tableHeader', alignment: 'center' },
                { text: 'Spent', style: 'tableHeader', alignment: 'center' },
                { text: 'Remaining', style: 'tableHeader', alignment: 'center' },
                { text: 'Usage %', style: 'tableHeader', alignment: 'center' },
                { text: 'Status', style: 'tableHeader', alignment: 'center' }
              ],
              // Data rows
              ...budgets.map((budget, index) => {
                const percentage = budget.percentage ?? 0;
                const remaining = budget.remaining ?? 0;
                const statusConfig = getStatusColor(percentage);
                return [
                  { 
                    text: budget.category_name, 
                    style: 'tableRow',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: formatCurrency(budget.amount),
                    style: 'tableRow',
                    alignment: 'right',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: formatCurrency(budget.spent),
                    style: 'tableRow',
                    alignment: 'right',
                    bold: true,
                    color: '#EF4444',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: formatCurrency(remaining),
                    style: 'tableRow',
                    alignment: 'right',
                    bold: true,
                    color: remaining >= 0 ? '#10B981' : '#EF4444',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: formatPercentage(percentage),
                    style: 'tableRow',
                    alignment: 'center',
                    bold: true,
                    color: statusConfig.color,
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: statusConfig.status,
                    fontSize: 9,
                    color: statusConfig.color,
                    bold: true,
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF',
                    alignment: 'center'
                  }
                ];
              })
            ]
          },
          layout: {
            fillColor: function (rowIndex: number) {
              return rowIndex === 0 ? '#4F46E5' : null;
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
            paddingLeft: function() { return 8; },
            paddingRight: function() { return 8; },
            paddingTop: function() { return 6; },
            paddingBottom: function() { return 6; }
          },
          margin: [0, 0, 0, 20]
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
          fontSize: 10,
          color: '#FFFFFF',
          fillColor: '#4F46E5'
        },
        tableRow: {
          fontSize: 9,
          color: '#1F2937'
        },
        summaryLabel: {
          fontSize: 10,
          bold: true,
          color: '#64748B'
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
    pdfDocGenerator.download(`budgetme-budgets-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Export budgets to CSV
export const exportBudgetsToCSV = (
  budgets: Budget[],
  filterInfo?: string
): void => {
  try {
    // Prepare data for CSV
    const data = budgets.map(b => {
      const percentage = b.percentage ?? 0;
      const remaining = b.remaining ?? 0;
      const statusConfig = getStatusColor(percentage);
      return {
        Category: b.category_name ?? 'Unknown',
        Budgeted: b.amount.toFixed(2),
        Spent: b.spent.toFixed(2),
        Remaining: remaining.toFixed(2),
        'Usage %': percentage.toFixed(2),
        Status: statusConfig.status,
        Period: b.period,
        'Start Date': formatDate(b.start_date),
        'End Date': formatDate(b.end_date)
      };
    });

    // Add metadata header
    const metadata = [
      { '': 'BudgetMe Budget Overview' },
      { '': `Generated: ${new Date().toLocaleString()}` },
      ...(filterInfo ? [{ '': filterInfo }] : []),
      { '': '' }
    ];

    // Convert to CSV with PapaParse
    const csvContent = Papa.unparse(data, {
      quotes: true,
      header: true
    });

    // Add metadata at the beginning
    const metadataCSV = Papa.unparse(metadata, { header: false });
    const finalCSV = `${metadataCSV}\n\n${csvContent}`;
    
    // Create blob and download
    const blob = new Blob([finalCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `budgetme-budgets-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV report');
  }
};

// Export budgets to DOCX
export const exportBudgetsToDOCX = async (
  budgets: Budget[],
  filterInfo?: string
): Promise<void> => {
  try {
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    // Calculate summary
    const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = budgets.reduce((sum, b) => sum + (b.remaining ?? 0), 0);
    const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

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
            text: "Budget Overview",
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

    // Filter info if provided
    const filterParagraphs: Paragraph[] = filterInfo ? [
      new Paragraph({
        children: [
          new TextRun({
            text: filterInfo,
            size: 20,
            color: "64748B",
            italics: true
          })
        ],
        spacing: { after: 300 }
      })
    ] : [];

    // Summary section
    const summaryParagraphs = [
      new Paragraph({
        children: [
          new TextRun({
            text: "Budget Summary",
            bold: true,
            size: 28,
            color: "4F46E5"
          })
        ],
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💰 Total Budgeted: ", bold: true, size: 22, color: "4F46E5" }),
          new TextRun({ text: formatCurrency(totalBudgeted), size: 22, color: "4F46E5" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💸 Total Spent: ", bold: true, size: 22, color: "EF4444" }),
          new TextRun({ text: formatCurrency(totalSpent), size: 22, color: "EF4444" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💎 Remaining: ", bold: true, size: 22, color: "10B981" }),
          new TextRun({ text: formatCurrency(totalRemaining), size: 22, color: "10B981" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "📊 Overall Usage: ", bold: true, size: 22, color: "8B5CF6" }),
          new TextRun({ text: formatPercentage(overallPercentage), size: 22, color: "8B5CF6" })
        ],
        spacing: { after: 300 }
      })
    ];

    // Table section header
    const tableSectionHeader = [
      new Paragraph({
        children: [
          new TextRun({
            text: "Budget Details",
            bold: true,
            size: 28,
            color: "4F46E5"
          })
        ],
        spacing: { before: 300, after: 200 }
      })
    ];

    // Create table rows
    const tableRows: TableRow[] = [
      // Header row
      new TableRow({
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
              children: [new TextRun({ text: "Budgeted", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Spent", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Remaining", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Usage %", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          })
        ]
      })
    ];

    // Data rows
    budgets.forEach((budget, index) => {
      const rowColor = index % 2 === 0 ? "F8FAFF" : "FFFFFF";
      const percentage = budget.percentage ?? 0;
      const remaining = budget.remaining ?? 0;
      const categoryName = budget.category_name ?? 'Unknown';
      const statusConfig = getStatusColor(percentage);
      
      tableRows.push(new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph(categoryName)],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun(formatCurrency(budget.amount))],
              alignment: AlignmentType.RIGHT
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: formatCurrency(budget.spent),
                bold: true,
                color: 'EF4444'
              })],
              alignment: AlignmentType.RIGHT
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: formatCurrency(remaining),
                bold: true,
                color: remaining >= 0 ? '10B981' : 'EF4444'
              })],
              alignment: AlignmentType.RIGHT
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: formatPercentage(percentage),
                bold: true,
                color: statusConfig.color.replace('#', '')
              })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: statusConfig.status,
                bold: true,
                color: statusConfig.color.replace('#', '')
              })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          })
        ]
      }));
    });

    // Create main table
    const mainTable = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    });

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          ...headerParagraphs,
          ...filterParagraphs,
          ...summaryParagraphs,
          ...tableSectionHeader,
          mainTable,
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
    link.setAttribute('download', `budgetme-budgets-${new Date().toISOString().split('T')[0]}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Failed to generate DOCX report');
  }
};
