# Goals Components Documentation

This documentation provides details about the components in the `src/components/goals` directory of the BudgetMe application. These components manage the financial goals functionality, allowing users to set, track, contribute to, and achieve their financial objectives.

## Table of Contents

1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [Goals Component](#goals-component)
4. [GoalDetails Component](#goaldetails-component)
5. [CreateGoal Component](#creategoal-component)
6. [GoalContribution Component](#goalcontribution-component)
7. [Data Types and Interfaces](#data-types-and-interfaces)
8. [Integration with Other Features](#integration-with-other-features)

## Overview

The goals components provide a comprehensive system for financial goal management. Users can create various financial goals (like saving for a vacation, buying a house, building an emergency fund), track progress towards these goals, make contributions, and visualize their journey. The system provides analytics, progress tracking, and recommendations to help users achieve their financial objectives efficiently.

## Component Structure

```
src/components/goals/
├── Goals.tsx             # Main goal list and overview component
├── GoalDetails.tsx       # Detailed view for a single goal
├── CreateGoal.tsx        # Form for creating new goals
└── GoalContribution.tsx  # Form for contributing to existing goals
```

## Goals Component

**File**: `Goals.tsx`

The Goals component serves as the main interface for viewing all goals and provides filtering and sorting capabilities.

### Key Features

- **Goal List**: Displays all user goals with progress indicators and key information
- **Filtering**: Allows filtering by priority, category, and search terms
- **Sorting**: Sorts goals by name, target date, progress, or amount
- **Visual Indicators**: Shows progress bars and status colors based on completion
- **Direct Actions**: Quick links to contribute to goals or view details

### Key Functions

- `applyFilters()`: Filters goal items based on user-selected criteria
- `sortGoals()`: Sorts goals by various criteria
- `handleFilterChange()`: Updates filter state when user changes criteria
- `resetFilters()`: Resets all filters to default values
- `getProgressStatusColor()`: Determines visual indicator color based on progress

### State Management

The component manages several state variables:
- List of goals (all and filtered)
- Filter criteria (priority, category, sort by, search)
- UI states (loading, filtering, tooltips)

## GoalDetails Component

**File**: `GoalDetails.tsx`

This component provides a detailed view of a single goal, including progress metrics, contribution history, and analytics.

### Key Features

- **Progress Display**: Visual gauge showing progress toward the goal
- **Contribution Timeline**: Charts showing contribution history over time
- **Required Savings**: Calculates and displays monthly savings needed to reach the goal
- **Related Transactions**: Lists all transactions related to this goal
- **Goal Management**: Options to edit, delete, or contribute to the goal
- **Analytics**: Projections and statistics related to the goal

### Key Functions

- `createChartConfigs()`: Generates chart configurations for various visualizations
- `handleDelete()`: Handles goal deletion process
- `toggleTip()`: Manages tooltip visibility for information icons

### State Management

The component manages several state variables:
- Current goal details
- Related transactions
- Chart configuration objects for multiple visualizations
- UI states (loading, tooltips)

## CreateGoal Component

**File**: `CreateGoal.tsx`

This component provides a form interface for creating new financial goals with a review process before submission.

### Key Features

- **Goal Information**: Fields for name, amount, date, and other details
- **Savings Recommendation**: Calculates recommended monthly savings
- **Priority Setting**: Options for high, medium, or low priority
- **Review Step**: Preview of the goal before final submission
- **Form Validation**: Validates required fields, amounts, and dates

### Key Functions

- `handleChange()`: Manages form input changes
- `handleReview()`: Validates form and switches to review mode
- `handleSubmit()`: Submits the final goal data
- `calculateRecommendation()`: Calculates monthly savings needed to reach the goal

### State Management

The component manages several state variables:
- Form data (name, amount, date, etc.)
- View mode (form or review)
- Submission states

## GoalContribution Component

**File**: `GoalContribution.tsx`

This component allows users to make contributions toward their financial goals from various accounts.

### Key Features

- **Account Selection**: Drop-down for selecting funding account
- **Contribution Amount**: Input for contribution amount
- **Goal Progress**: Shows current goal progress before contribution
- **Balance Check**: Verifies sufficient funds in selected account
- **Review Step**: Preview of the contribution before final submission

### Key Functions

- `handleChange()`: Manages form input changes
- `handleReview()`: Validates form and switches to review mode
- `handleSubmit()`: Processes the contribution, updating both the goal and account balance

### State Management

The component manages several state variables:
- Goal details
- Available accounts
- Contribution form data
- Error messages
- View mode (form or review)
- Submission state

## Data Types and Interfaces

The goals components use several key interfaces:

### Goal
```typescript
interface Goal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: "high" | "medium" | "low";
  category: string;
  description?: string;
}
```

### FilterState (for Goals List)
```typescript
interface FilterState {
  priority: "all" | "high" | "medium" | "low";
  category: string;
  sortBy: "name" | "target_date" | "progress" | "amount";
  search: string;
}
```

### GoalFormData
```typescript
interface GoalFormData {
  goal_name: string;
  target_amount: string;
  target_date: string;
  current_amount: string;
  priority: "low" | "medium" | "high";
  notes: string;
}
```

### Contribution Form Data
```typescript
interface ContributionFormData {
  amount: string;
  account_id: string;
  notes: string;
}
```

## Integration with Other Features

The goals components integrate with several other parts of the BudgetMe application:

### Transaction System Integration
When a user contributes to a goal, the system creates a transaction record and updates account balances accordingly.

### Budget Integration
The system can analyze how budget categories relate to goals, helping users allocate their budgets effectively to reach their goals.

### Dashboard Integration
Goal progress is displayed on the main dashboard, providing users with at-a-glance updates on their financial objectives.

### Family Goals
Goals can be shared with family members, allowing collaborative saving toward common objectives.

### Notification System
The system provides notifications for goal milestones, upcoming deadlines, and contribution recommendations.

### Data Flow

1. **Goals.tsx** serves as the entry point for goal management
2. From there, users can:
   - View all goals with filtering and sorting options
   - Click on a goal to view its details (navigates to GoalDetails)
   - Create a new goal (navigates to CreateGoal)
3. **GoalDetails.tsx** loads detailed information about a specific goal
4. From the details page, users can:
   - Make a contribution (navigates to GoalContribution)
   - Edit or delete the goal
5. **CreateGoal.tsx** handles the goal creation flow with form and review steps
6. **GoalContribution.tsx** handles the process of contributing funds to a goal

The components are designed with a clear separation of concerns, with each handling a specific part of the goal management functionality while maintaining consistent styling and user experience throughout the application. 