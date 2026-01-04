# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-11-18

### Added

#### Reports
- Navigation system for reviewing and managing anomalies in financial reports
- Dismissal functionality and pagination controls for anomaly alerts
- New financial report components providing enhanced analytical insights
- Contribution tracking in income and expense data processing
- Comprehensive data processing utilities for financial reporting
- Support for uncategorized transactions in savings and spending analysis
- Export functionality for PDF, Excel, and Word formats with BudgetMe branding
- AI insights integration in all export formats
- Chart image capture and embedding in PDF and DOCX exports

#### Predictions
- UsageLimitIndicator component integrated into AIPrediction and AIInsightsCard
- Timeframe conversion utilities for enhanced prediction accuracy
- Data validation and logging capabilities for usage limit indicators

#### Goals
- Contribution modal with animations in Family Dashboard
- Filtering and pagination capabilities in GoalsTab component
- Full pagination support for goals management

#### Budgets
- Advanced filtering options with enhanced styling capabilities
- Export functionality for PDF, Excel, and Word formats with BudgetMe branding
- Budget status indicators and summary cards in exports

#### Transactions
- Comprehensive pagination system for transaction tables
- Enhanced pagination styling for improved user experience
- Export functionality for PDF, Excel, and Word formats with BudgetMe branding
- Transaction type categorization in exports

#### UI/UX
- Active page highlighting for pagination components
- Visual feedback indicators across pagination interfaces

### Changed

#### Reports
- Optimized report data processing algorithms and query structures
- Streamlined financial reports architecture by removing deprecated components
- Fixed uncategorized transaction counting to exclude transfers and contributions
- Fixed monthly summary calculations to use actual transaction data

#### Predictions
- Improved growth calculation methodology using average baselines
- Updated forecast calculations to utilize current month values
- Enhanced prediction accuracy by incorporating current year actuals

#### Goals
- Refactored ContributionModal for improved account handling and error messaging
- Redesigned ContributionModal layout for enhanced user experience
- Updated button styles and accessibility features in GoalsTab component

#### Budgets
- Standardized budget period terminology from 'monthly' to 'month' for consistency

#### Transactions
- Separated transaction filtering logic for complete and paginated datasets
- Improved data handling for better performance

#### Dashboard
- Enhanced transaction trend calculation algorithms with improved logging
- Refined date comparison logic in useFilteredData hook
- Optimized custom date filtering across insights and charts components

#### UI/UX
- Updated modal styling for improved presentation and alignment
- Consolidated pagination styling to Indigo theme across all components
- Enhanced button styling consistency throughout the application

#### General
- Improved chatbot visibility management on admin routes
- Enhanced error handling for invalid or expired password reset links

### Fixed

#### Predictions
- Resolved data validation issues in UsageLimitIndicator component
- Corrected growth calculation inaccuracies in AIPrediction module
- Fixed forecast discrepancies in TransactionTypeForecastTable

#### Goals
- Corrected unclosed div tag in GoalsTab component

### Removed

#### Reports
- Deprecated financial report components no longer in use

---

## Technical Details

**Commit Range**: 8158ea4...8725f20  
**Total Commits**: 42  
**Release Date**: November 18, 2025

### Module Impact Summary

| Module | Features | Changes | Fixes |
|--------|----------|---------|-------|
| Reports | 6 | 2 | 0 |
| Predictions | 3 | 3 | 3 |
| Goals | 3 | 3 | 1 |
| Budgets | 1 | 1 | 0 |
| Transactions | 2 | 2 | 0 |
| Dashboard | 0 | 4 | 0 |
| UI/UX | 2 | 3 | 0 |
| General | 0 | 2 | 0 |

### Key Highlights

This release represents a significant enhancement to the application's core functionality:

- **Financial Intelligence**: Comprehensive improvements to reporting and analytics capabilities, enabling users to gain deeper insights into their financial data with enhanced anomaly detection and management.

- **Predictive Analytics**: Refined AI-powered prediction algorithms with improved accuracy through better data validation and calculation methodologies.

- **User Experience**: Systematic implementation of pagination across major data-heavy components, improving application performance and usability.

- **Code Quality**: Architectural improvements through removal of deprecated components and optimization of data processing pipelines.

- **Design Consistency**: Unified styling approach with consolidated theming and enhanced visual feedback mechanisms.

### Migration Notes

- Budget period references have been updated from 'monthly' to 'month'. Ensure any external integrations or API consumers are updated accordingly.
- Deprecated financial report components have been removed. Applications extending these components should migrate to the new report component architecture.
