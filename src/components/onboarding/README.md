# Onboarding System

This module provides an interactive tutorial and onboarding experience for new users of BudgetMe.

## Features

- Welcome modal for first-time users
- Interactive step-by-step walkthrough using react-joyride
- Persistence of onboarding progress in Supabase
- Help button in sidebar to restart the tutorial at any time
- Comprehensive tour of all major app features

## Components

- **OnboardingController**: Main component that manages the onboarding flow
- **TutorialModal**: Initial welcome screen shown to first-time users
- **TutorialJoyride**: Interactive walkthrough using react-joyride
- **HelpButton**: Button added to the sidebar to access the tutorial anytime

## Database Schema

The onboarding system uses a `user_onboarding` table in Supabase with the following structure:

```sql
CREATE TABLE IF NOT EXISTS public.user_onboarding (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    tutorial_completed BOOLEAN DEFAULT false,
    current_step INT DEFAULT 0,
    dashboard_seen BOOLEAN DEFAULT false,
    budget_seen BOOLEAN DEFAULT false,
    goals_seen BOOLEAN DEFAULT false,
    transactions_seen BOOLEAN DEFAULT false,
    reports_seen BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id)
);
```

## Customization

To modify the tutorial steps or content, edit the following files:

- **TutorialJoyride.tsx**: Contains the steps and content for each section
- **onboarding.css**: Styling for the tutorial components

## Usage

The onboarding tutorial automatically appears for new users after login. Users can access the tutorial anytime by clicking the Help button in the sidebar. 