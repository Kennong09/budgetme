# Budget Components Documentation

This documentation provides details about the components in the `src/components/budget` directory of the BudgetMe application. These components manage the budgeting functionality, allowing users to view, create, and manage their financial budgets.

## Table of Contents

1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [Budgets Component](#budgets-component)
4. [BudgetDetails Component](#budgetdetails-component)
5. [CreateBudget Component](#createbudget-component)
6. [Data Types and Interfaces](#data-types-and-interfaces)
7. [Integration and Data Flow](#integration-and-data-flow)
8. [Supabase Integration](#supabase-integration)

## Overview

The budget components provide a comprehensive budgeting system for managing personal finances. Users can create budgets for different expense categories, track their spending against these budgets, and visualize their budget allocation and performance. The system supports different budget periods (monthly, quarterly, yearly) and offers detailed analytics and insights.

## Component Saucture

```
src/components/budget/
├── Budgets.tsx         # Main budget list and overview component
├── BudgetDetails.tsx   # Detailed view for a single budget
└── CreateBudget.tsx    # Form for creating new budgets
```

## Budgets Component

**File**: `Budgets.tsx`

The Budgets component serves as the main interface for viewing all budgets and provides an overview of budget allocation and performance.

### Key Features

- **Budget List**: Displays all budgets with their progress indicators
- **Filtering**: Allows filtering by category, status, search term, month, and year
- **Visualizations**: Includes bar and pie charts for budget distribution with enhanced no-data handling
- **Sorting**: Sorts budgets by various criteria (e.g., most overspent, alphabetical)
- **Status Indicators**: Visual indicators for budget health (success, warning, danger)
- **Smart Empty States**: Context-aware no-data handling that differentiates between no budgets and no spending
- **Data Source Notifications**: Transparent fallback notifications for system degraded states (removed for normal operation)

### Key Functions

- `applyFilters()`: Filters budget items based on user-selected criteria
- `updateVisualizations()`: Updates charts when filters change, with intelligent data validation
- `getPeriodTitle()`: Generates title for the current period
- `toggleTip()`: Manages tooltip visibility for providing additional information
- `resetFilters()`: Resets all filters to default values
- Enhanced chart rendering logic that detects meaningful spending data vs empty states

### State Management

The component manages several state variables:
- List of budgets (all and filtered)
- Filter criteria (category, status, search, month, year)
- Chart configuration objects
- UI states (loading, filtering, tooltips)

## BudgetDetails Component

**File**: `BudgetDetails.tsx`

This component provides a detailed view of a single budget, including spending breakdown, related transactions, and budget performance metrics.

### Key Features

- **Budget Overview**: Shows budget amount, spent amount, and remaining amount
- **Spending Breakdown**: Visual breakdown of spending within the budget category
- **Related Transactions**: Lists all transactions related to this budget
- **Budget Period**: Shows the time period for the budget
- **Comparison**: Compares this budget with related budgets in the same category
- **Budget Management**: Options to edit or delete the budget

### Key Functions

- `createChartConfigs()`: Generates chart configurations for visualizations
- `handleDelete()`: Handles budget deletion
- `toggleTip()`: Manages tooltip visibility
- `getMonthIndex()`: Helper function to get numeric month index

### State Management

The component manages several state variables:
- Current budget details
- Related budgets in the same category
- Related transactions
- Chart configuration objects
- UI states (loading, tooltips)

## CreateBudget Component

**File**: `CreateBudget.tsx`

This component provides a form interface for creating new budgets with a review process before submission.

### Key Features

- **Category Selection**: Dropdown for selecting expense categories
- **Budget Amount**: Input field for budget amount
- **Period Selection**: Options for monthly, quarterly, or yearly budgets
- **Date Selection**: Start date picker for the budget period
- **Review Step**: Preview of the budget before final submission
- **Form Validation**: Validates required fields and amounts

### Key Functions

- `handleChange()`: Manages form input changes
- `getEndDate()`: Calculates end date based on period and start date
- `handleReview()`: Validates form and switches to review mode
- `handleSubmit()`: Submits the final budget data

### State Management

The component manages several state variables:
- Form data (category, amount, period, start date)
- View mode (form or review)
- Loading and submission states
- User data (for category options)

## Data Types and Interfaces

The budget components use several key interfaces:

### BudgetItem
```typescript
interface BudgetItem {
  id: string;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "success" | "warning" | "danger";
  month: string;
  year: number | string;
  period_start: string;
  period_end: string;
}
```

### FilterState
```typescript
interface FilterState {
  categoryId: string;
  status: "all" | "success" | "warning" | "danger";
  search: string;
  month: string;
  year: string;
}
```

### BudgetFormData
```typescript
interface BudgetFormData {
  category_id: string;
  amount: string;
  period: "month" | "quarter" | "year";
  startDate: string;
}
```

### Transaction
```typescript
interface Transaction {
  id: number;
  user_id: number;
  account_id: number;
  category_id: number;
  type: "income" | "expense";
  amount: number;
  date: string;
  notes: string;
  created_at: string;
}
```

## Integration and Data Flow

The budget components integrate with other parts of the application through:

1. **Data Services**: Mock data services like `getBudgetProgressData()`, `getTransactionsByCategory()`, etc., which would be replaced by actual API calls in production
2. **Routing**: React Router integration for navigation between budget views
3. **Shared Utilities**: Formatting helpers like `formatCurrency()`, `formatDate()`, etc.
4. **Context Providers**: Currency context for consistent currency formatting
5. **Chart Libraries**: Highcharts integration for data visualization
6. **Supabase Database**: Direct integration with Supabase for data persistence

### Data Flow

1. **Budgets.tsx** serves as the entry point for budget management
2. From there, users can:
   - View all budgets with filtering and sorting options
   - Click on a budget to view its details (navigates to BudgetDetails)
   - Create a new budget (navigates to CreateBudget)
3. **BudgetDetails.tsx** loads detailed information about a specific budget
4. **CreateBudget.tsx** handles the creation flow with form and review steps

The components are designed with a clear separation of concerns, with each handling a specific part of the budgeting functionality while maintaining consistent styling and user experience throughout the application. 

## Supabase Integration

The budget components integrate with Supabase, a PostgreSQL-based backend-as-a-service platform, for data persistence and real-time capabilities.

### Database Schema

The budget functionality relies on these key tables in Supabase:

#### Budgets Table
```sql
create table budgets (
  id uuid default uuid_generate_v4() primary key,
  category_id int references categories(id) not null,
  amount numeric not null,
  spent numeric default 0 not null,
  period text not null check (period in ('month', 'quarter', 'year')),
  start_date date not null,
  end_date date not null,
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default now() not null
);
```

#### Categories Table
```sql
create table categories (
  id serial primary key,
  category_name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  created_at timestamp with time zone default now() not null
);
```

### Authentication Integration

Budget components use the `useAuth` hook to access the currently authenticated user:

```typescript
const { user } = useAuth();
```

This ensures that:
1. Only authenticated users can create and manage budgets
2. Users can only see and manipulate their own budget data
3. The user's ID is automatically associated with created budgets

### Supabase Data Operations

The components use the following Supabase operations:

#### Fetching Data

```typescript
// Fetch expense categories
const { data, error } = await supabase
  .from('categories')
  .select('id, category_name')
  .eq('type', 'expense')
  .order('category_name', { ascending: true });
```

#### Creating Records

```typescript
// Insert budget into Supabase
const { data, error } = await supabase
  .from('budgets')
  .insert({
    category_id: parseInt(budget.category_id),
    amount: parseFloat(budget.amount),
    period: budget.period,
    start_date: startDate,
    end_date: endDate,
    user_id: user.id,
    spent: 0 // Initial spent is zero
  })
  .select()
  .single();
```

#### Updating Records

```typescript
// Update budget amount
const { data, error } = await supabase
  .from('budgets')
  .update({ amount: newAmount })
  .eq('id', budgetId)
  .eq('user_id', user.id) // Security: ensure user owns the budget
  .select()
  .single();
```

### Error Handling

The Supabase integration includes comprehensive error handling:

1. Authentication errors (redirect to login)
2. Database query errors (displayed with toast notifications)
3. Network and connectivity issues
4. Data validation errors

### Benefits of Supabase Integration

1. **Real-time data**: Changes to budgets can be synchronized across devices
2. **Scalable backend**: Handles growing user data efficiently
3. **Security**: Row-level security policies ensure data isolation
4. **Reduced development time**: No need for custom API endpoints
5. **Future extensibility**: Easy integration with other Supabase features like Functions and Edge Functions 