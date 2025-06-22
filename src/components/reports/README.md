# Reports Components Documentation

This documentation provides details about the component in the `src/components/reports` directory of the BudgetMe application. This component delivers comprehensive financial reporting functionality to help users analyze their financial data through various visualizations and data tables.

## Table of Contents

1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [FinancialReports Component](#financialreports-component)
4. [Data Types and Interfaces](#data-types-and-interfaces)
5. [Report Types](#report-types)
6. [Data Visualization](#data-visualization)
7. [Export Options](#export-options)
8. [Integration with Other Features](#integration-with-other-features)

## Overview

The reports component provides users with in-depth financial analysis through interactive charts, tables, and customizable report parameters. It allows users to examine their spending patterns, income and expenses, savings trends, budget performance, and financial goals through a variety of visualization options and timeframes. Reports can be exported in different formats for external use or shared via email.

## Component Structure

```
src/components/reports/
└── FinancialReports.tsx       # Main financial reporting component
```

## FinancialReports Component

**File**: `FinancialReports.tsx`

This component is responsible for generating, displaying, and exporting various types of financial reports based on user data.

### Key Features

- **Multiple Report Types**: Supports various report types including spending, income-expense, savings, trends, goals, and predictions
- **Time Period Selection**: Allows filtering data by month, quarter, or year
- **Chart Customization**: Provides different chart types (pie, bar, line, area, column) based on the data being presented
- **Table View**: Offers table format for detailed data analysis alongside visual charts
- **Financial Summary**: Shows key financial metrics like monthly spending, income, savings, and savings rate
- **Interactive Charts**: Implements Highcharts for interactive, responsive data visualization
- **Export Functions**: Allows downloading reports in PDF, CSV, and Excel formats
- **Email Sharing**: Provides functionality to send reports via email
- **Contextual Help**: Offers tooltips and information popups to explain report elements

### Key Functions

- `getDefaultChartType()`: Determines the best chart type for each report category
- `toggleTip()`: Manages tooltip visibility for information elements
- `fetchData()`: Retrieves user financial data for report generation
- `getCurrentMonthData()`: Calculates current month's financial summary
- `handleDownloadReport()`: Processes report download in various formats
- `handleEmailReport()`: Handles sending reports via email
- `updateChartOptions()`: Updates chart configurations based on user selections

### State Management

The component manages several state variables:
- Report type selection (spending, income-expense, etc.)
- Timeframe selection (month, quarter, year)
- Format selection (chart or table)
- Chart type selection (pie, bar, line, etc.)
- User financial data for reports
- Chart configuration options
- UI states (loading, tooltips)

## Data Types and Interfaces

The reports component uses several key interfaces:

### SpendingDataItem
```typescript
interface SpendingDataItem {
  name: string;
  value: number;
  color: string;
}
```

### IncomeExpenseDataItem
```typescript
interface IncomeExpenseDataItem {
  name: string;
  income: number;
  expenses: number;
}
```

### SavingsDataItem
```typescript
interface SavingsDataItem {
  name: string;
  rate: number;
}
```

### TrendData
```typescript
interface TrendData {
  category: string;
  change: number;
  previousAmount: number;
  currentAmount: number;
}
```

### BudgetRelationship
```typescript
interface BudgetRelationship {
  totalBudgetAllocated: number;
  totalSpentOnGoals: number;
  percentageBudgetToGoals: number;
  goalTransactionsCount: number;
}
```

### Type Definitions
```typescript
type ReportType = "spending" | "income-expense" | "savings" | "trends" | "goals" | "predictions";
type TimeframeType = "month" | "quarter" | "year";
type FormatType = "chart" | "table";
type ChartType = "bar" | "pie" | "line" | "area" | "column";
```

## Report Types

The component supports the following report types:

### Spending Reports
- Visualizes spending by category
- Shows percentage breakdown of expenses
- Identifies top spending categories
- Detects unusual spending patterns

### Income-Expense Reports
- Compares income and expenses over time
- Shows net cash flow trends
- Identifies months with budget surpluses or deficits
- Calculates average income and expenses

### Savings Reports
- Tracks savings rate over time
- Shows progress toward savings goals
- Identifies best and worst months for saving
- Projects future savings based on current patterns

### Trends Reports
- Analyzes changes in spending patterns over time
- Highlights growing or declining expense categories
- Shows seasonal spending patterns
- Identifies opportunities for cost reduction

### Goals Reports
- Tracks progress toward financial goals
- Shows relationship between budgets and goals
- Analyzes goal contribution patterns
- Projects goal completion dates

### Prediction Reports
- Forecasts future financial trends
- Shows projected income and expenses
- Identifies potential financial challenges
- Suggests actions to improve financial health

## Data Visualization

The component uses Highcharts for visualization with several available chart types:

- **Pie Charts**: For showing proportional data like spending by category
- **Bar/Column Charts**: For comparing values across categories or time periods
- **Line Charts**: For showing trends over time
- **Area Charts**: For displaying cumulative values or ranges

Chart features include:
- Interactive tooltips showing detailed information
- Zoom capabilities for examining specific data ranges
- Responsive design adapting to different screen sizes
- Animation effects when loading charts
- Legend customization
- Color-coding for improved readability

## Export Options

The reports component provides multiple ways to save and share reports:

### Download Formats
- **PDF**: Professional-looking reports suitable for printing
- **CSV**: Raw data export for further analysis in spreadsheet software
- **Excel**: Formatted data for use in Microsoft Excel

### Email Functionality
Users can email reports directly from the application with options to:
- Include custom messages
- Select specific report sections to include
- Schedule recurring report delivery (premium feature)

## Integration with Other Features

The reports component integrates with several other parts of the BudgetMe application:

### Transaction System Integration
Uses transaction data to generate spending reports and trend analysis.

### Budget Integration
Incorporates budget data to show performance against budget allocations.

### Goals Integration
Shows progress toward financial goals and analyzes goal-related transactions.

### AI Prediction Integration
Incorporates predictive models to provide forward-looking financial projections.

### Data Flow

1. User financial data is fetched from various data services
2. The data is processed and formatted according to the selected report type
3. Appropriate chart options are generated based on report type and user preferences
4. The report is rendered as charts or tables depending on user selection
5. Users can interact with, export, or share the generated reports

The reports component provides powerful analytics capabilities typically found in professional financial software, making complex financial analysis accessible and understandable for personal finance management. 