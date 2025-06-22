# Transactions Components Documentation

This documentation provides details about the components in the `src/components/transactions` directory of the BudgetMe application. These components handle transaction listing, creation, and detailed views, forming the core financial tracking functionality of the application.

## Table of Contents

1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [Transactions Component](#transactions-component)
4. [AddTransaction Component](#addtransaction-component)
5. [TransactionDetails Component](#transactiondetails-component)
6. [Data Types and Interfaces](#data-types-and-interfaces)
7. [Integration with Other Features](#integration-with-other-features)

## Overview

The transactions components form the financial tracking core of the BudgetMe application. They allow users to view, filter, and search their financial transactions, add new income or expense entries, and view detailed information about individual transactions. These components provide visualization of transaction patterns, categorization, and impact on overall financial health.

## Component Structure

```
src/components/transactions/
├── Transactions.tsx          # Main transaction list and filtering component
├── AddTransaction.tsx        # Form for adding new transactions
└── TransactionDetails.tsx    # Detailed view for individual transactions
```

## Transactions Component

**File**: `Transactions.tsx`

This component serves as the main transaction management interface, displaying a filterable list of transactions and providing analytics.

### Key Features

- **Transaction List**: Displays all user transactions with relevant details
- **Advanced Filtering**: Filter by type (income/expense), account, category, date range, and search term
- **Sorting Options**: Sort by date, amount, or category
- **Data Visualization**: Charts for spending patterns and category distribution
- **Quick Actions**: Options to view details or add new transactions
- **Financial Summary**: Shows totals for income, expenses, and balance
- **Export Functions**: Options to export transaction data
- **URL Parameter Sync**: Filters state is reflected in URL parameters for bookmarkable views

### Key Functions

- `applyFilters()`: Processes and applies selected filters to transaction list
- `prepareChartData()`: Formats transaction data for various chart visualizations
- `handleFilterChange()`: Updates filter state when user changes criteria
- `resetFilters()`: Resets all filters to default values
- `getPeriodTitle()`: Generates descriptive title for the current time period

### State Management

The component manages several state variables:
- Full and filtered transaction lists
- Filter criteria for type, account, category, date range, search
- Loading and filtering states
- Chart configuration objects
- UI states for tooltips and other interactive elements

## AddTransaction Component

**File**: `AddTransaction.tsx`

This component provides a form interface for adding new income or expense transactions.

### Key Features

- **Transaction Type Toggle**: Switch between income and expense entry
- **Dynamic Categories**: Categories change based on transaction type
- **Account Selection**: Choose from user's available accounts
- **Goal Association**: Optional linking of transactions to financial goals
- **Date Selection**: Date picker for transaction date
- **Form Validation**: Validates required fields and amounts
- **Review Step**: Preview of transaction before final submission

### Key Functions

- `handleChange()`: Manages form input changes
- `handleReview()`: Validates form and switches to review mode
- `handleSubmit()`: Processes the final transaction submission
- `toggleTip()`: Manages tooltip visibility for contextual help

### State Management

The component manages several state variables:
- Form data for the transaction
- View mode (form or review)
- Loading and submission states
- Tooltip visibility and positioning

## TransactionDetails Component

**File**: `TransactionDetails.tsx`

This component provides a detailed view of a single transaction, including contextual information and analytics.

### Key Features

- **Transaction Overview**: Shows all details of the selected transaction
- **Category Context**: Visualizes how this transaction compares to others in same category
- **Related Transactions**: Shows other transactions in the same category
- **Impact Analysis**: Charts showing this transaction's impact on financial patterns
- **Delete Functionality**: Option to delete the transaction
- **Edit Navigation**: Link to edit the transaction

### Key Functions

- `createChartConfigs()`: Generates chart configurations for visualizations
- `handleDelete()`: Processes transaction deletion
- `toggleTip()`: Manages tooltip visibility for information elements

### State Management

The component manages several state variables:
- Current transaction details
- Related transactions in the same category
- Chart configuration objects
- Loading and UI states

## Data Types and Interfaces

The transactions components use several key interfaces:

### Transaction
```typescript
interface Transaction {
  id: string;
  date: string;
  amount: number;
  notes: string;
  type: "income" | "expense";
  category_id?: number;
  account_id: number;
  goal_id?: string;
  created_at: string;
}
```

### Category
```typescript
interface Category {
  id: number;
  category_name: string;
}
```

### Account
```typescript
interface Account {
  id: number;
  account_name: string;
  account_type: string;
  balance: number;
}
```

### FilterState (for Transaction List)
```typescript
interface FilterState {
  type: "all" | "income" | "expense";
  accountId: string;
  categoryId: string;
  month: string;
  year: string;
  search: string;
}
```

### TransactionFormData
```typescript
interface TransactionFormData {
  type: "income" | "expense";
  account_id: string;
  category_id: string;
  goal_id: string;
  amount: string;
  date: string;
  notes: string;
}
```

## Integration with Other Features

The transactions components integrate with several other parts of the BudgetMe application:

### Account System Integration
Transactions are associated with specific accounts, updating account balances.

### Category System Integration
Transactions are categorized, enabling detailed spending analysis.

### Goals Integration
Transactions can be linked to financial goals, contributing to goal progress.

### Budget Integration
Transaction categories relate to budget categories for expense tracking.

### Dashboard Integration
Transaction data feeds into dashboard visualizations and summary metrics.

### Data Flow

1. User financial data (accounts, categories, transactions) is loaded from data service
2. The main Transactions component displays the transaction list with filtering options
3. The AddTransaction component allows adding new transactions to the system
4. The TransactionDetails component provides detailed analysis of individual transactions
5. Actions performed in these components update the underlying financial data
6. Changes affect account balances, budget tracking, and goal progress throughout the application

The transaction components form the financial backbone of the application, recording all money movements and providing the data needed for budgeting, goal tracking, and financial analysis. 