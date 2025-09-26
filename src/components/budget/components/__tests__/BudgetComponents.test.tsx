import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components to test
import BudgetModalHeader from '../BudgetModalHeader';
import BudgetProgressBar from '../BudgetProgressBar';
import BudgetTooltip from '../BudgetTooltip';
import BudgetStepCard from '../BudgetStepCard';
import BudgetSidebar from '../BudgetSidebar';
import ValidationFeedback from '../ValidationFeedback';

// Mock data
const mockModalState = {
  currentStep: 'workflow_choice' as const,
  workflowChoice: {
    workflow_type: 'budget_first' as const,
    user_experience_level: 'beginner' as const,
    choice_reason: 'Planning ahead'
  },
  budgetData: {
    budget_name: 'Test Budget',
    category_id: '1',
    category_name: 'Food',
    amount: 1000,
    period: 'month' as const,
    start_date: '2025-01',
    alert_threshold: 0.8
  },
  transactionData: {
    type: 'expense' as const,
    amount: 100,
    account_id: '1',
    account_name: 'Test Account',
    category_id: '1',
    category_name: 'Food',
    date: '2025-01-15',
    description: 'Test transaction'
  },
  validationErrors: {},
  isSubmitting: false,
  allowWorkflowChange: true,
  progressPercentage: 25
};

describe('BudgetModalHeader', () => {
  test('renders with correct title and progress', () => {
    const mockOnClose = jest.fn();
    
    render(
      <BudgetModalHeader
        currentStep="workflow_choice"
        progressPercentage={25}
        onClose={mockOnClose}
        workflowType="budget_first"
      />
    );

    expect(screen.getByText('Choose Your Approach')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    
    render(
      <BudgetModalHeader
        currentStep="workflow_choice"
        progressPercentage={25}
        onClose={mockOnClose}
        workflowType="budget_first"
      />
    );

    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('displays correct title for different steps', () => {
    const mockOnClose = jest.fn();
    
    const { rerender } = render(
      <BudgetModalHeader
        currentStep="budget_config"
        progressPercentage={50}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Configure Budget')).toBeInTheDocument();

    rerender(
      <BudgetModalHeader
        currentStep="transaction_setup"
        progressPercentage={50}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Transaction Details')).toBeInTheDocument();
  });
});

describe('BudgetProgressBar', () => {
  test('renders progress bar with correct percentage', () => {
    render(
      <BudgetProgressBar
        currentStep="budget_config"
        progressPercentage={50}
        workflowType="budget_first"
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveStyle('width: 50%');
  });

  test('displays correct workflow type', () => {
    render(
      <BudgetProgressBar
        currentStep="budget_config"
        progressPercentage={50}
        workflowType="budget_first"
      />
    );

    expect(screen.getByText('Budget-First Approach')).toBeInTheDocument();
  });

  test('shows different step indicators for different workflows', () => {
    const { rerender } = render(
      <BudgetProgressBar
        currentStep="workflow_choice"
        progressPercentage={25}
        workflowType="budget_first"
      />
    );

    expect(screen.getByText('Configure Budget')).toBeInTheDocument();

    rerender(
      <BudgetProgressBar
        currentStep="workflow_choice"
        progressPercentage={25}
        workflowType="transaction_first"
      />
    );

    expect(screen.getByText('Setup Transaction')).toBeInTheDocument();
  });
});

describe('BudgetTooltip', () => {
  test('does not render when not visible', () => {
    const mockOnClose = jest.fn();
    
    render(
      <BudgetTooltip
        isVisible={false}
        position={null}
        title="Test Title"
        description="Test Description"
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  test('renders when visible with correct content', () => {
    const mockOnClose = jest.fn();
    
    render(
      <BudgetTooltip
        isVisible={true}
        position={{ top: 100, left: 100 }}
        title="Test Title"
        description="Test Description"
        onClose={mockOnClose}
        category="workflow"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    
    render(
      <BudgetTooltip
        isVisible={true}
        position={{ top: 100, left: 100 }}
        title="Test Title"
        description="Test Description"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close tooltip');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

describe('BudgetStepCard', () => {
  test('renders with basic content', () => {
    render(
      <BudgetStepCard>
        <div>Test Content</div>
      </BudgetStepCard>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('renders with title and navigation', () => {
    const mockNavigation = {
      onPrevious: jest.fn(),
      onNext: jest.fn(),
      isValid: true,
      previousLabel: 'Back',
      nextLabel: 'Next'
    };

    render(
      <BudgetStepCard
        title="Test Card"
        navigation={mockNavigation}
      >
        <div>Card Content</div>
      </BudgetStepCard>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  test('calls navigation handlers when buttons are clicked', () => {
    const mockNavigation = {
      onPrevious: jest.fn(),
      onNext: jest.fn(),
      isValid: true
    };

    render(
      <BudgetStepCard navigation={mockNavigation}>
        <div>Content</div>
      </BudgetStepCard>
    );

    fireEvent.click(screen.getByText('Previous'));
    expect(mockNavigation.onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Continue'));
    expect(mockNavigation.onNext).toHaveBeenCalledTimes(1);
  });

  test('disables next button when form is invalid', () => {
    const mockNavigation = {
      onNext: jest.fn(),
      isValid: false
    };

    render(
      <BudgetStepCard navigation={mockNavigation}>
        <div>Content</div>
      </BudgetStepCard>
    );

    const nextButton = screen.getByText('Continue');
    expect(nextButton).toBeDisabled();
  });
});

describe('BudgetSidebar', () => {
  test('renders with tips panel by default', () => {
    const mockOnTipClick = jest.fn();
    
    render(
      <BudgetSidebar
        currentStep="workflow_choice"
        modalState={mockModalState}
        onTipClick={mockOnTipClick}
      />
    );

    expect(screen.getByText('Smart Tips')).toBeInTheDocument();
    expect(screen.getByText('Budget-First Approach')).toBeInTheDocument();
  });

  test('switches between panels when tabs are clicked', () => {
    const mockOnTipClick = jest.fn();
    
    render(
      <BudgetSidebar
        currentStep="budget_config"
        modalState={mockModalState}
        onTipClick={mockOnTipClick}
      />
    );

    // Click Analytics tab
    fireEvent.click(screen.getByText('Analytics'));
    expect(screen.getByText('Budget Analytics')).toBeInTheDocument();

    // Click Quick Actions tab
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  test('displays budget analytics when budget data is available', () => {
    const mockOnTipClick = jest.fn();
    
    render(
      <BudgetSidebar
        currentStep="budget_config"
        modalState={mockModalState}
        onTipClick={mockOnTipClick}
      />
    );

    // Switch to analytics panel
    fireEvent.click(screen.getByText('Analytics'));
    
    expect(screen.getByText('₱1,000.00')).toBeInTheDocument(); // Budget amount
    expect(screen.getByText('₱100.00')).toBeInTheDocument(); // Transaction amount
  });
});

describe('ValidationFeedback', () => {
  test('shows success message when no errors', () => {
    render(
      <ValidationFeedback validationErrors={{}} />
    );

    expect(screen.getByText('All fields are valid and ready to proceed!')).toBeInTheDocument();
  });

  test('displays error messages when validation errors exist', () => {
    const validationErrors = {
      budgetName: 'Budget name is required',
      budgetAmount: 'Amount must be greater than 0'
    };

    render(
      <ValidationFeedback validationErrors={validationErrors} />
    );

    expect(screen.getByText(/2 validation errors found/)).toBeInTheDocument();
    expect(screen.getByText(/Budget name is required/)).toBeInTheDocument();
    expect(screen.getByText(/Amount must be greater than 0/)).toBeInTheDocument();
  });

  test('generates helpful suggestions based on error types', () => {
    const validationErrors = {
      budgetAmount: 'Invalid amount',
      budgetName: 'Invalid name'
    };

    render(
      <ValidationFeedback validationErrors={validationErrors} />
    );

    expect(screen.getByText('Helpful Tips:')).toBeInTheDocument();
    expect(screen.getByText(/Set a realistic budget amount/)).toBeInTheDocument();
    expect(screen.getByText(/Use descriptive names like/)).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  test('components work together in modal context', async () => {
    const mockOnClose = jest.fn();
    const mockOnTipClick = jest.fn();

    render(
      <div>
        <BudgetModalHeader
          currentStep="budget_config"
          progressPercentage={50}
          onClose={mockOnClose}
          workflowType="budget_first"
        />
        <div className="row">
          <div className="col-md-8">
            <BudgetStepCard
              title="Configure Budget"
              cardType="form"
              validationErrors={mockModalState.validationErrors}
            >
              <ValidationFeedback validationErrors={{}} />
            </BudgetStepCard>
          </div>
          <div className="col-md-4">
            <BudgetSidebar
              currentStep="budget_config"
              modalState={mockModalState}
              onTipClick={mockOnTipClick}
            />
          </div>
        </div>
      </div>
    );

    // Test that all components render together
    expect(screen.getByText('Configure Budget')).toBeInTheDocument();
    expect(screen.getByText('Smart Tips')).toBeInTheDocument();
    expect(screen.getByText('All fields are valid and ready to proceed!')).toBeInTheDocument();

    // Test interactions
    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('tooltip system works across components', async () => {
    const mockOnClose = jest.fn();

    const { rerender } = render(
      <BudgetTooltip
        isVisible={false}
        position={null}
        title=""
        description=""
        onClose={mockOnClose}
      />
    );

    // Simulate tooltip being shown
    rerender(
      <BudgetTooltip
        isVisible={true}
        position={{ top: 200, left: 300 }}
        title="Budget Configuration Help"
        description="This step helps you set up your budget parameters"
        onClose={mockOnClose}
        category="form"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Budget Configuration Help')).toBeInTheDocument();
      expect(screen.getByText('This step helps you set up your budget parameters')).toBeInTheDocument();
    });
  });
});

describe('Accessibility Tests', () => {
  test('components have proper ARIA attributes', () => {
    const mockOnClose = jest.fn();
    
    render(
      <BudgetProgressBar
        currentStep="budget_config"
        progressPercentage={50}
        workflowType="budget_first"
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  test('tooltip has proper accessibility attributes', () => {
    const mockOnClose = jest.fn();
    
    render(
      <BudgetTooltip
        isVisible={true}
        position={{ top: 100, left: 100 }}
        title="Test Title"
        description="Test Description"
        onClose={mockOnClose}
      />
    );

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('aria-live', 'polite');
    expect(tooltip).toHaveAttribute('tabIndex', '-1');
  });

  test('close button has proper aria-label', () => {
    const mockOnClose = jest.fn();
    
    render(
      <BudgetTooltip
        isVisible={true}
        position={{ top: 100, left: 100 }}
        title="Test Title"
        description="Test Description"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close tooltip');
    expect(closeButton).toBeInTheDocument();
  });
});