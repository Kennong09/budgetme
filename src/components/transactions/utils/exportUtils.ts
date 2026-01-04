import { formatCurrency } from '../../../utils/helpers';
// @ts-ignore - papaparse types issue
import * as Papa from 'papaparse';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, HeadingLevel } from 'docx';

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

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'contribution';
  category?: string;
  account_name?: string;
  notes?: string;
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

// Helper function to get type badge color
const getTypeColor = (type: string): { color: string; bg: string } => {
  switch (type) {
    case 'income':
      return { color: '#10B981', bg: '#F0FDF4' };
    case 'expense':
      return { color: '#EF4444', bg: '#FEF2F2' };
    case 'transfer':
      return { color: '#3B82F6', bg: '#EFF6FF' };
    case 'contribution':
      return { color: '#8B5CF6', bg: '#F5F3FF' };
    default:
      return { color: '#64748B', bg: '#F8FAFF' };
  }
};

// Export transactions to PDF
export const exportTransactionsToPDF = async (
  transactions: Transaction[],
  filterInfo?: string
): Promise<void> => {
  try {
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    // Calculate summary
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalTransfers = transactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalContributions = transactions
      .filter(t => t.type === 'contribution')
      .reduce((sum, t) => sum + t.amount, 0);

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
                  text: 'Transaction History',
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
          text: 'Transaction Summary',
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
                      color: '#F0FDF4'
                    }
                  ]
                },
                {
                  text: 'Total Income',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: formatCurrency(totalIncome),
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
                      color: '#FEF2F2'
                    }
                  ]
                },
                {
                  text: 'Total Expenses',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: formatCurrency(totalExpenses),
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
                      color: '#EFF6FF'
                    }
                  ]
                },
                {
                  text: 'Transfers',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: formatCurrency(totalTransfers),
                  fontSize: 14,
                  bold: true,
                  color: '#3B82F6',
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
                      color: '#F5F3FF'
                    }
                  ]
                },
                {
                  text: 'Contributions',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: formatCurrency(totalContributions),
                  fontSize: 14,
                  bold: true,
                  color: '#8B5CF6',
                  margin: [10, 0, 0, 0]
                }
              ]
            }
          ],
          columnGap: 15,
          margin: [0, 10, 0, 25]
        },
        // Transactions Table
        {
          text: 'Transaction Details',
          style: 'sectionHeader'
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: [
              // Header row
              [
                { text: 'Date', style: 'tableHeader', alignment: 'center' },
                { text: 'Description', style: 'tableHeader', alignment: 'center' },
                { text: 'Type', style: 'tableHeader', alignment: 'center' },
                { text: 'Category', style: 'tableHeader', alignment: 'center' },
                { text: 'Amount', style: 'tableHeader', alignment: 'center' }
              ],
              // Data rows
              ...transactions.map((transaction, index) => {
                const typeColors = getTypeColor(transaction.type);
                return [
                  { 
                    text: formatDate(transaction.date), 
                    style: 'tableRow',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: transaction.description || '-', 
                    style: 'tableRow',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
                    fontSize: 9,
                    color: typeColors.color,
                    bold: true,
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF',
                    alignment: 'center'
                  },
                  { 
                    text: transaction.category || '-', 
                    style: 'tableRow',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: formatCurrency(transaction.amount),
                    style: 'tableRow',
                    alignment: 'right',
                    bold: true,
                    color: transaction.type === 'income' ? '#10B981' : '#1F2937',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
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
    pdfDocGenerator.download(`budgetme-transactions-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Export transactions to CSV
export const exportTransactionsToCSV = (
  transactions: Transaction[],
  filterInfo?: string
): void => {
  try {
    // Prepare data for CSV
    const data = transactions.map(t => ({
      Date: formatDate(t.date),
      Description: t.description || '-',
      Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
      Category: t.category || '-',
      Account: t.account_name || '-',
      Amount: t.amount.toFixed(2),
      Notes: t.notes || '-'
    }));

    // Add metadata header
    const metadata = [
      { '': 'BudgetMe Transaction History' },
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
    link.setAttribute('download', `budgetme-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV report');
  }
};

// Export transactions to DOCX
export const exportTransactionsToDOCX = async (
  transactions: Transaction[],
  filterInfo?: string
): Promise<void> => {
  try {
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    // Calculate summary
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalTransfers = transactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalContributions = transactions
      .filter(t => t.type === 'contribution')
      .reduce((sum, t) => sum + t.amount, 0);

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
            text: "Transaction History",
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
            text: "Transaction Summary",
            bold: true,
            size: 28,
            color: "4F46E5"
          })
        ],
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💰 Total Income: ", bold: true, size: 22, color: "10B981" }),
          new TextRun({ text: formatCurrency(totalIncome), size: 22, color: "10B981" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💸 Total Expenses: ", bold: true, size: 22, color: "EF4444" }),
          new TextRun({ text: formatCurrency(totalExpenses), size: 22, color: "EF4444" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "🔄 Transfers: ", bold: true, size: 22, color: "3B82F6" }),
          new TextRun({ text: formatCurrency(totalTransfers), size: 22, color: "3B82F6" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "🎯 Contributions: ", bold: true, size: 22, color: "8B5CF6" }),
          new TextRun({ text: formatCurrency(totalContributions), size: 22, color: "8B5CF6" })
        ],
        spacing: { after: 300 }
      })
    ];

    // Table section header
    const tableSectionHeader = [
      new Paragraph({
        children: [
          new TextRun({
            text: "Transaction Details",
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
              children: [new TextRun({ text: "Date", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Description", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Type", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
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
          })
        ]
      })
    ];

    // Data rows
    transactions.forEach((transaction, index) => {
      const rowColor = index % 2 === 0 ? "F8FAFF" : "FFFFFF";
      const typeColors = getTypeColor(transaction.type);
      
      tableRows.push(new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph(formatDate(transaction.date))],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(transaction.description || '-')],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
                color: typeColors.color.replace('#', ''),
                bold: true
              })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(transaction.category || '-')],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: formatCurrency(transaction.amount),
                bold: true,
                color: transaction.type === 'income' ? '10B981' : '1F2937'
              })],
              alignment: AlignmentType.RIGHT
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
    link.setAttribute('download', `budgetme-transactions-${new Date().toISOString().split('T')[0]}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Failed to generate DOCX report');
  }
};
