# Settings Components Documentation

This documentation provides details about the components in the `src/components/settings` directory of the BudgetMe application. These components handle user preferences, profile settings, appearance options, and notification configurations.

## Table of Contents

1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [Settings Component](#settings-component)
4. [Data Types and Interfaces](#data-types-and-interfaces)
5. [Styling](#styling)
6. [Integration with Other Features](#integration-with-other-features)

## Overview

The settings components provide a comprehensive interface for users to manage their profile information and personalize their experience within the BudgetMe application. Through a tabbed interface, users can update their profile information, customize the application appearance, set preferences like currency and language, and manage notification settings.

## Component Structure

```
src/components/settings/
├── Settings.tsx       # Main settings component with tabbed interface
└── settings.css       # Settings-specific styles
```

## Settings Component

**File**: `Settings.tsx`

This component serves as the main settings interface, providing a tabbed layout for different categories of settings.

### Key Features

- **Tabbed Interface**: Organizes settings into logical categories (Profile, Appearance, Preferences, Notifications)
- **Profile Management**: Allows users to update their name and profile picture
- **Theme Selection**: Provides light, dark, and system default theme options with visual preview
- **Currency Selection**: Allows users to choose their preferred currency for financial displays
- **Language Options**: Supports multiple language selections
- **Notification Preferences**: Toggles for email and push notification channels
- **Form Validation**: Ensures data integrity before saving settings
- **Feedback Messages**: Success and error messages for user actions
- **Responsive Design**: Adapts to different screen sizes

### Tabs

1. **Profile**
   - Profile picture management
   - Name editing
   - Email display (with security restrictions)

2. **Appearance**
   - Theme selection (Light/Dark/System)
   - Visual theme preview

3. **Preferences**
   - Currency selection
   - Language selection

4. **Notifications**
   - Email notification toggle
   - Push notification toggle

### Key Functions

- `handleTabChange()`: Switches between settings tabs
- `handleInputChange()`: Manages form input changes, including global currency updates
- `handleCheckboxChange()`: Handles toggles for notification settings
- `handleSaveSettings()`: Processes and saves settings changes
- `loadUserProfile()`: Loads user profile data from authentication context or mock data

### State Management

The component manages several state variables:
- Active tab selection
- Loading and saving states
- Success and error messages
- User profile data including preferences and settings

## Data Types and Interfaces

The settings component uses two key interfaces:

### UserProfile
```typescript
interface UserProfile {
  name: string;
  email: string;
  profilePicture: string;
  currency: string;
  language: string;
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
}
```

### SettingsTab
```typescript
interface SettingsTab {
  id: string;
  label: string;
  icon: string;
}
```

## Styling

The settings component uses a dedicated CSS file (`settings.css`) for component-specific styling:

### Key Styling Features

- **Tab Navigation**: Custom styling for the settings navigation tabs with active indicators
- **Profile Picture**: Interactive profile picture container with overlay for update option
- **Theme Preview**: Visual representation of theme options with realistic UI elements
- **Custom Form Elements**: Styled input fields, dropdowns, and toggle switches
- **Animation Effects**: Smooth transitions between tabs and settings sections
- **Responsive Layouts**: Adjusts for different screen sizes with appropriate spacing

### CSS Structure

- **Navigation Styling**: Custom styling for the settings tabs
- **Profile Picture Container**: Positioning and overlay effects for profile image
- **Theme Preview**: Mini UI mockup for theme visualization
- **Form Control Styling**: Custom styling for input elements
- **Animation Definitions**: Keyframes for transition effects

## Integration with Other Features

The settings component integrates with several other parts of the BudgetMe application:

### Authentication Integration
Uses the authentication context to retrieve and display user information.

### Currency Context Integration
Updates the global currency context when the user changes their currency preference.

### Theme Integration
Changes affect the application's visual appearance through the selected theme.

### Data Flow

1. User profile data is loaded from authentication context or mock data service
2. Settings are displayed in the appropriate tabs
3. Users can modify settings through the form interfaces
4. On save, settings are validated and then:
   - Updated in local state
   - Synchronized with global contexts (like currency)
   - In a production environment, would be persisted to backend storage
5. Success/error feedback is provided to the user

These settings determine how financial information is displayed throughout the application, affecting currency symbols, number formats, visual theme, and communication channels for notifications. 