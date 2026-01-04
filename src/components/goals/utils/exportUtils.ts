import { formatCurrency, formatDate, formatPercentage, getRemainingDays } from '../../../utils/helpers';
// @ts-ignore - papaparse types issue
import * as Papa from 'papaparse';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType } from 'docx';
import { Goal } from '../types';

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

// Helper function to get priority color
const getPriorityColor = (priority: string): { color: string; bg: string } => {
  switch (priority) {
    case 'high':
      return { color: '#EF4444', bg: '#FEF2F2' };
    case 'medium':
      return { color: '#F59E0B', bg: '#FFFBEB' };
    case 'low':
      return { color: '#3B82F6', bg: '#EFF6FF' };
    default:
      return { color: '#64748B', bg: '#F8FAFF' };
  }
};

// Helper function to get status color
const getStatusColor = (status: string): { color: string; bg: string } => {
  switch (status) {
    case 'completed':
      return { color: '#10B981', bg: '#F0FDF4' };
    case 'in_progress':
      return { color: '#3B82F6', bg: '#EFF6FF' };
    case 'not_started':
      return { color: '#64748B', bg: '#F8FAFF' };
    case 'cancelled':
      return { color: '#EF4444', bg: '#FEF2F2' };
    default:
      return { color: '#64748B', bg: '#F8FAFF' };
  }
};

// Helper function to format status name
const formatStatusName = (status: string): string => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Export goals to PDF
export const exportGoalsToPDF = async (
  goals: Goal[],
  filterInfo?: string
): Promise<void> => {
  try {
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    // Calculate summary
    const totalTargetAmount = goals.reduce((sum, g) => sum + g.target_amount, 0);
    const totalCurrentAmount = goals.reduce((sum, g) => sum + g.current_amount, 0);
    const totalRemaining = totalTargetAmount - totalCurrentAmount;
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
    
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const inProgressGoals = goals.filter(g => g.status === 'in_progress').length;
    const notStartedGoals = goals.filter(g => g.status === 'not_started').length;

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
                  text: 'Financial Goals Report',
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
          text: 'Goals Summary',
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
                  text: 'Total Goals',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: goals.length.toString(),
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
                      color: '#F0FDF4'
                    }
                  ]
                },
                {
                  text: 'Completed',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: completedGoals.toString(),
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
                      color: '#EFF6FF'
                    }
                  ]
                },
                {
                  text: 'In Progress',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: inProgressGoals.toString(),
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
                      color: '#F8FAFF'
                    }
                  ]
                },
                {
                  text: 'Not Started',
                  style: 'summaryLabel',
                  margin: [10, -60, 0, 5]
                },
                {
                  text: notStartedGoals.toString(),
                  fontSize: 14,
                  bold: true,
                  color: '#64748B',
                  margin: [10, 0, 0, 0]
                }
              ]
            }
          ],
          columnGap: 15,
          margin: [0, 10, 0, 25]
        },
        // Financial Summary
        {
          text: 'Financial Overview',
          style: 'sectionHeader'
        },
        {
          columns: [
            {
              width: '33%',
              stack: [
                {
                  text: 'Target Amount',
                  style: 'summaryLabel',
                  margin: [0, 0, 0, 5]
                },
                {
                  text: formatCurrency(totalTargetAmount),
                  fontSize: 14,
                  bold: true,
                  color: '#1F2937'
                }
              ]
            },
            {
              width: '33%',
              stack: [
                {
                  text: 'Current Amount',
                  style: 'summaryLabel',
                  margin: [0, 0, 0, 5]
                },
                {
                  text: formatCurrency(totalCurrentAmount),
                  fontSize: 14,
                  bold: true,
                  color: '#10B981'
                }
              ]
            },
            {
              width: '34%',
              stack: [
                {
                  text: 'Overall Progress',
                  style: 'summaryLabel',
                  margin: [0, 0, 0, 5]
                },
                {
                  text: formatPercentage(overallProgress),
                  fontSize: 14,
                  bold: true,
                  color: '#4F46E5'
                }
              ]
            }
          ],
          columnGap: 15,
          margin: [0, 10, 0, 25]
        },
        // Goals Table
        {
          text: 'Goal Details',
          style: 'sectionHeader'
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              // Header row
              [
                { text: 'Goal Name', style: 'tableHeader', alignment: 'center' },
                { text: 'Target Date', style: 'tableHeader', alignment: 'center' },
                { text: 'Priority', style: 'tableHeader', alignment: 'center' },
                { text: 'Status', style: 'tableHeader', alignment: 'center' },
                { text: 'Progress', style: 'tableHeader', alignment: 'center' },
                { text: 'Amount', style: 'tableHeader', alignment: 'center' }
              ],
              // Data rows
              ...goals.map((goal, index) => {
                const priorityColors = getPriorityColor(goal.priority);
                const statusColors = getStatusColor(goal.status);
                const progressPercentage = goal.percentage ?? 
                  (goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0);
                
                return [
                  { 
                    text: goal.goal_name, 
                    style: 'tableRow',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: formatDate(goal.target_date), 
                    style: 'tableRow',
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1),
                    fontSize: 9,
                    color: priorityColors.color,
                    bold: true,
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF',
                    alignment: 'center'
                  },
                  { 
                    text: formatStatusName(goal.status),
                    fontSize: 9,
                    color: statusColors.color,
                    bold: true,
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF',
                    alignment: 'center'
                  },
                  { 
                    text: formatPercentage(progressPercentage),
                    style: 'tableRow',
                    alignment: 'right',
                    bold: true,
                    fillColor: index % 2 === 0 ? '#F8FAFF' : '#FFFFFF'
                  },
                  { 
                    text: `${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount)}`,
                    style: 'tableRow',
                    alignment: 'right',
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
    pdfDocGenerator.download(`budgetme-goals-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Export goals to CSV
export const exportGoalsToCSV = (
  goals: Goal[],
  filterInfo?: string
): void => {
  try {
    // Prepare data for CSV
    const data = goals.map(g => {
      const progressPercentage = g.percentage ?? 
        (g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0);
      
      return {
        'Goal Name': g.goal_name,
        'Target Date': formatDate(g.target_date),
        'Days Remaining': getRemainingDays(g.target_date),
        'Priority': g.priority.charAt(0).toUpperCase() + g.priority.slice(1),
        'Status': formatStatusName(g.status),
        'Progress (%)': progressPercentage.toFixed(2),
        'Current Amount': g.current_amount.toFixed(2),
        'Target Amount': g.target_amount.toFixed(2),
        'Remaining': g.remaining.toFixed(2),
        'Type': g.is_family_goal ? 'Family' : 'Personal',
        'Notes': g.notes || '-'
      };
    });

    // Add metadata header
    const metadata = [
      { '': 'BudgetMe Financial Goals Report' },
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
    link.setAttribute('download', `budgetme-goals-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV report');
  }
};

// Export goals to DOCX
export const exportGoalsToDOCX = async (
  goals: Goal[],
  filterInfo?: string
): Promise<void> => {
  try {
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    // Calculate summary
    const totalTargetAmount = goals.reduce((sum, g) => sum + g.target_amount, 0);
    const totalCurrentAmount = goals.reduce((sum, g) => sum + g.current_amount, 0);
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
    
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const inProgressGoals = goals.filter(g => g.status === 'in_progress').length;
    const notStartedGoals = goals.filter(g => g.status === 'not_started').length;

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
            text: "Financial Goals Report",
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
            text: "Goals Summary",
            bold: true,
            size: 28,
            color: "4F46E5"
          })
        ],
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "📊 Total Goals: ", bold: true, size: 22, color: "4F46E5" }),
          new TextRun({ text: goals.length.toString(), size: 22, color: "4F46E5" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "✅ Completed: ", bold: true, size: 22, color: "10B981" }),
          new TextRun({ text: completedGoals.toString(), size: 22, color: "10B981" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "🔄 In Progress: ", bold: true, size: 22, color: "3B82F6" }),
          new TextRun({ text: inProgressGoals.toString(), size: 22, color: "3B82F6" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "⏸️ Not Started: ", bold: true, size: 22, color: "64748B" }),
          new TextRun({ text: notStartedGoals.toString(), size: 22, color: "64748B" })
        ],
        spacing: { after: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Financial Overview",
            bold: true,
            size: 28,
            color: "4F46E5"
          })
        ],
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "🎯 Target Amount: ", bold: true, size: 22 }),
          new TextRun({ text: formatCurrency(totalTargetAmount), size: 22, color: "1F2937" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "💰 Current Amount: ", bold: true, size: 22 }),
          new TextRun({ text: formatCurrency(totalCurrentAmount), size: 22, color: "10B981" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "📈 Overall Progress: ", bold: true, size: 22 }),
          new TextRun({ text: formatPercentage(overallProgress), size: 22, color: "4F46E5" })
        ],
        spacing: { after: 300 }
      })
    ];

    // Table section header
    const tableSectionHeader = [
      new Paragraph({
        children: [
          new TextRun({
            text: "Goal Details",
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
              children: [new TextRun({ text: "Goal Name", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Target Date", bold: true, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: "4F46E5" }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Priority", bold: true, color: "FFFFFF" })],
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
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Progress", bold: true, color: "FFFFFF" })],
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
    goals.forEach((goal, index) => {
      const rowColor = index % 2 === 0 ? "F8FAFF" : "FFFFFF";
      const priorityColors = getPriorityColor(goal.priority);
      const statusColors = getStatusColor(goal.status);
      const progressPercentage = goal.percentage ?? 
        (goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0);
      
      tableRows.push(new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph(goal.goal_name)],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph(formatDate(goal.target_date))],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1),
                color: priorityColors.color.replace('#', ''),
                bold: true
              })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: formatStatusName(goal.status),
                color: statusColors.color.replace('#', ''),
                bold: true
              })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: formatPercentage(progressPercentage),
                bold: true
              })],
              alignment: AlignmentType.RIGHT
            })],
            shading: { fill: rowColor }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: `${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount)}`
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
    link.setAttribute('download', `budgetme-goals-${new Date().toISOString().split('T')[0]}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Failed to generate DOCX report');
  }
};
