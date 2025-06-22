# Predictions Components Documentation

This documentation provides details about the component in the `src/components/predictions` directory of the BudgetMe application. This component implements AI-driven financial predictions to help users forecast their future finances based on historical data.

## Table of Contents

1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [AIPrediction Component](#aiprediction-component)
4. [Data Types and Interfaces](#data-types-and-interfaces)
5. [The Prophet Model](#the-prophet-model)
6. [Data Visualization](#data-visualization)
7. [Integration with Other Features](#integration-with-other-features)

## Overview

The predictions component uses advanced time series forecasting techniques to analyze user financial data and provide insights into future income, expenses, savings trends, and category-level predictions. These forecasts help users with financial planning, budgeting decisions, and setting realistic financial goals based on their spending patterns and income trends.

## Component Structure

```
src/components/predictions/
└── AIPrediction.tsx       # AI-powered financial prediction component
```

## AIPrediction Component

**File**: `AIPrediction.tsx`

This component is responsible for generating, displaying, and explaining AI-driven financial predictions to users, powered by Facebook's Prophet model.

### Key Features

- **Time Series Forecasting**: Projects future income, expenses, and savings based on historical patterns
- **Multiple Timeframes**: Provides predictions for different time horizons (3 months, 6 months, 1 year)
- **Visualization**: Presents predictions through interactive charts and graphs
- **Prediction Intervals**: Shows confidence intervals for predictions to indicate uncertainty
- **Category-Level Predictions**: Forecasts spending in individual categories
- **Model Transparency**: Provides detailed information about the Prophet model being used
- **Accuracy Metrics**: Shows how well the model has performed on historical data
- **Export Options**: Allows users to export predictions in various formats (CSV, PDF, Excel)

### Key Functions

- `getPredictionData()`: Generates prediction data for different timeframes
- `createDataPoints()`: Creates detailed prediction points with confidence intervals
- `generateModelMetadata()`: Sets up information about the Prophet prediction model
- `generateCategoryPredictions()`: Creates category-specific forecasts
- `getInsights()`: Extracts key insights from prediction data
- `handleExportCSV()`: Handles data export functionality
- `toggleTip()`: Manages tooltip visibility for information elements

### State Management

The component manages several state variables:
- Timeframe selection (3 months, 6 months, 1 year)
- Data type filter (all, income, expenses, savings)
- Model details visibility
- Accuracy report visibility
- Category-level predictions
- Model accuracy metrics
- User data for predictions

## Data Types and Interfaces

The predictions component uses several key interfaces:

### PredictionDataPoint
```typescript
interface PredictionDataPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  incomePrediction?: number;
  expensesPrediction?: number;
  savingsPrediction?: number;
  incomeUpper?: number;
  incomeLower?: number;
  expensesUpper?: number;
  expensesLower?: number;
}
```

### CategoryPrediction
```typescript
interface CategoryPrediction {
  category: string;
  current: number;
  predicted: number;
  change: number;
  changePercent: number;
}
```

### ModelAccuracy
```typescript
interface ModelAccuracy {
  metric: string;
  value: number;
  description: string;
}
```

### ModelDetail
```typescript
interface ModelDetail {
  name: string;
  value: string;
  description: string;
}
```

### Type Definitions
```typescript
type TimeframeType = "3months" | "6months" | "1year";
type DataType = "all" | "income" | "expenses" | "savings";
```

## The Prophet Model

The application uses Facebook's Prophet model for all financial predictions:

- Developed by Facebook
- Designed for business time series with strong seasonal patterns
- Handles missing data and outliers well
- Incorporates holiday effects and changepoints
- Highly effective for financial forecasting

Prophet was chosen because it excels at:
- Detecting seasonal patterns (weekly, monthly, yearly)
- Adapting to changing trends
- Providing reliable confidence intervals
- Requiring minimal parameter tuning
- Handling irregular time series data

## Data Visualization

The component uses Recharts for visualization with several chart types:

- **Line Charts**: For showing trends over time
- **Area Charts**: For displaying prediction intervals
- **Bar Charts**: For category comparisons
- **Composed Charts**: For complex visualizations with multiple data types

Key visualization features include:
- Interactive tooltips
- Confidence intervals (upper and lower bounds)
- Color-coding for different data types
- Responsive design for different screen sizes
- Visual indicators for predicted vs. actual values

## Integration with Other Features

The predictions component integrates with other parts of the BudgetMe application:

### Transaction System Integration
Uses historical transaction data as the basis for generating predictions.

### Budget Integration
Helps users set more realistic budgets based on predicted expenses in different categories.

### Goals Integration
Supports goal planning by forecasting available savings for future periods.

### Dashboard Integration
Key prediction insights can be displayed on the main dashboard.

### Data Flow

1. User historical financial data is fetched from the data service
2. The Prophet model processes this data to generate forecasts
3. Forecasts are visualized through charts and tables
4. Users can interact with predictions by changing timeframes and data types
5. Insights from predictions can inform budgeting and goal-setting decisions

The AI prediction functionality provides users with powerful forecasting tools typically found in professional financial planning software, making it accessible and understandable for personal finance management. 