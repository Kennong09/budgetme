# Family Components Documentation

This documentation provides details about the components in the `src/components/family` directory of the BudgetMe application. These components facilitate family finance management, allowing users to create family groups, invite members, and track shared financial goals.

## Table of Contents

1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [FamilyDashboard Component](#familydashboard-component)
4. [InviteFamilyMember Component](#invitefamilymember-component)
5. [Data Types and Interfaces](#data-types-and-interfaces)
6. [Integration with Other Features](#integration-with-other-features)

## Overview

The family components enable collaborative finance management for households. Users can create or join family groups, view aggregated financial data across family members, track shared goals, and manage permissions through different user roles (admin and viewer).

This feature focuses on making household budgeting a collaborative effort, with transparency that can be controlled through permission levels. The components provide views for family overview, member management, activity tracking, and shared goal progress.

## Component Structure

```
src/components/family/
├── FamilyDashboard.tsx       # Dashboard showing family finances and members
└── InviteFamilyMember.tsx    # Form for inviting new family members
```

## FamilyDashboard Component

**File**: `FamilyDashboard.tsx`

The FamilyDashboard serves as the central hub for family finance management, showing aggregated data from all family members and providing tools for family management.

### Key Features

- **Member List**: Displays all family members with their roles
- **Financial Summary**: Shows aggregated income, expenses, and savings rate across all members
- **Budget Performance**: Visual comparison of budget performance by category
- **Shared Goals**: Displays goals that are shared among family members with contribution details
- **Recent Activity**: Timeline of member activities like transactions, goal contributions, and new joins
- **Tab Navigation**: Separate tabs for Overview, Members, Activity, and Goals

### Key Functions

- `calculateFamilyMonthlyData()`: Aggregates monthly financial data across all family members
- `calculateFamilyCategoryData()`: Processes spending by category for all family members
- `formatBudgetPerformanceForHighcharts()`: Prepares budget performance data for visualization
- `formatCategoryDataForHighcharts()`: Formats category spending data for chart display
- `getMemberRoleBadge()`: Generates visual role indicators for family members

### State Management

- Family data and member details
- Aggregated financial summaries
- Chart configurations for visualizations
- Activity feed of family financial events
- UI state for tabs and tooltips

## InviteFamilyMember Component

**File**: `InviteFamilyMember.tsx`

This component provides a form interface for inviting new members to join a family group, with role assignment and personalized messaging.

### Key Features

- **Email Lookup**: Verifies if the invited user has a BudgetMe account
- **Role Assignment**: Allows setting the invited member as Admin or Viewer
- **Personalized Message**: Custom invitation message field
- **Multi-step Process**: Form and review steps before sending invitation
- **Validation**: Checks for valid email, existing accounts, and duplicate invitations

### Key Functions

- `handleChange()`: Manages form input changes
- `handleReview()`: Validates form data and shows review screen
- `handleSubmit()`: Processes the invitation submission
- `toggleTip()`: Displays contextual help tooltips

### State Management

- Form data (email, role, message)
- View mode (form or review)
- Submission state (loading, errors)
- Tooltip visibility and positioning

## Data Types and Interfaces

The family components use several key interfaces:

### User
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  last_login: string;
  profilePicture?: string;
}
```

### Family
```typescript
interface Family {
  id: number;
  family_name: string;
  created_at: string;
  owner_user_id: number;
}
```

### FamilyMember
```typescript
interface FamilyMember {
  id: number;
  family_id: number;
  member_user_id: number;
  role: "admin" | "viewer";
  join_date: string;
  user?: User;
}
```

### InviteFormData
```typescript
interface InviteFormData {
  email: string;
  role: "admin" | "viewer";
  message: string;
}
```

### Goal (with Contributors)
```typescript
interface Goal {
  id: number;
  user_id: number;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: "high" | "medium" | "low";
  category: string;
  description?: string;
  contributors?: Contributor[];
}

interface Contributor {
  userId: number;
  username: string;
  profilePicture: string;
  amount: number;
}
```

## Integration with Other Features

The family components integrate with several other parts of the BudgetMe application:

### Dashboard Integration
The family financial data is aggregated from individual member dashboards, showing a collective view of the household finances.

### Budget Integration
Family budgets can be tracked alongside individual budgets, with performance metrics and comparisons.

### Goals Integration
Goals can be designated as shared among family members, with contribution tracking for each member.

### Notification System
Invitations generate notifications for the invited users, appearing on their dashboard.

### Permission System
The role-based system (admin/viewer) controls what actions family members can take:
- **Admin**: Can invite new members, edit family details, and manage shared goals
- **Viewer**: Can view data but cannot edit family settings or invite others

### Data Flow

1. Creating a family sets the current user as the owner with admin role
2. Admin members can invite others through the InviteFamilyMember component
3. Invited users receive notifications and can accept or decline
4. Upon acceptance, users are added to the family with the assigned role
5. The FamilyDashboard aggregates data from all members based on permissions
6. Financial data flows from individual user accounts to the family view

This family finance management system helps households collaborate on financial planning while maintaining appropriate privacy and permission controls. 