import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../utils/AuthContext';
import { ToastProvider } from '../../utils/ToastContext';
import { goalsDataService } from '../../components/goals/services/goalsDataService';
import EditGoal from '../../components/goals/EditGoal';

// Mock the services
jest.mock('../../components/goals/services/goalsDataService');
jest.mock('../../utils/supabaseClient');

const mockGoalsDataService = goalsDataService as jest.Mocked<typeof goalsDataService>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { username: 'testuser' }
};

// Mock goal data
const mockGoal = {
  id: 'test-goal-id',
  goal_name: 'Test Goal',
  target_amount: 10000,
  current_amount: 2500,
  target_date: '2024-12-31',
  priority: 'high' as const,
  notes: 'Test goal notes',
  status: 'in_progress' as const,
  user_id: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z'
};

describe('EditGoal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the goals data service
    mockGoalsDataService.fetchGoalById.mockResolvedValue({
      data: mockGoal,
      error: null
    });
    
    mockGoalsDataService.updateGoal.mockResolvedValue({
      data: mockGoal,
      error: null
    });
    
    // Mock useAuth hook
    jest.spyOn(require('../../utils/AuthContext'), 'useAuth').mockReturnValue({
      user: mockUser,
      signIn: jest.fn(),
      signOut: jest.fn(),
      loading: false
    });
    
    // Mock useParams
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({
      id: 'test-goal-id'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders goal edit form with correct initial values', async () => {
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
    });

    // Check form fields
    expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2500')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test goal notes')).toBeInTheDocument();
  });

  test('updates goal name when input changes', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
    });

    const goalNameInput = screen.getByDisplayValue('Test Goal');
    await user.clear(goalNameInput);
    await user.type(goalNameInput, 'Updated Goal Name');

    expect(goalNameInput).toHaveValue('Updated Goal Name');
  });

  test('validates required fields before submission', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
    });

    // Clear required field
    const goalNameInput = screen.getByDisplayValue('Test Goal');
    await user.clear(goalNameInput);

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /continue to review/i });
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/goal name is required/i)).toBeInTheDocument();
    });
  });

  test('switches to review mode when form is valid', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
    });

    // Submit valid form
    const submitButton = screen.getByRole('button', { name: /continue to review/i });
    await user.click(submitButton);

    // Should switch to review mode
    await waitFor(() => {
      expect(screen.getByText('Review Goal Changes')).toBeInTheDocument();
    });
  });

  test('calls update service when saving changes', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
    });

    // Update goal name
    const goalNameInput = screen.getByDisplayValue('Test Goal');
    await user.clear(goalNameInput);
    await user.type(goalNameInput, 'Updated Goal');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /continue to review/i });
    await user.click(submitButton);

    // Should be in review mode
    await waitFor(() => {
      expect(screen.getByText('Review Goal Changes')).toBeInTheDocument();
    });

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Should call the update service
    await waitFor(() => {
      expect(mockGoalsDataService.updateGoal).toHaveBeenCalledWith(
        'test-goal-id',
        'test-user-id',
        expect.objectContaining({
          goal_name: 'Updated Goal'
        })
      );
    });
  });

  test('handles service errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock service error
    mockGoalsDataService.updateGoal.mockResolvedValue({
      data: null,
      error: new Error('Update failed')
    });
    
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /continue to review/i });
    await user.click(submitButton);

    // Save changes
    await waitFor(() => {
      expect(screen.getByText('Review Goal Changes')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeInTheDocument();
    });
  });

  test('shows loading state while fetching goal data', () => {
    // Mock loading state
    mockGoalsDataService.fetchGoalById.mockReturnValue(
      new Promise(() => {}) // Never resolves, simulating loading
    );
    
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    expect(screen.getByText('Loading goal data...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('redirects when goal is not found', async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
    
    // Mock goal not found
    mockGoalsDataService.fetchGoalById.mockResolvedValue({
      data: null,
      error: new Error('Goal not found')
    });
    
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/goals');
    });
  });
});

describe('EditGoal Integration Tests', () => {
  test('complete edit workflow', async () => {
    const user = userEvent.setup();
    const mockNavigate = jest.fn();
    
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
    
    render(
      <TestWrapper>
        <EditGoal />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
    });

    // Update multiple fields
    const goalNameInput = screen.getByDisplayValue('Test Goal');
    const targetAmountInput = screen.getByDisplayValue('10000');
    const notesInput = screen.getByDisplayValue('Test goal notes');

    await user.clear(goalNameInput);
    await user.type(goalNameInput, 'My New Goal');
    
    await user.clear(targetAmountInput);
    await user.type(targetAmountInput, '15000');
    
    await user.clear(notesInput);
    await user.type(notesInput, 'Updated notes for my goal');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /continue to review/i });
    await user.click(submitButton);

    // Verify review mode
    await waitFor(() => {
      expect(screen.getByText('My New Goal')).toBeInTheDocument();
      expect(screen.getByText('₱15,000.00')).toBeInTheDocument();
      expect(screen.getByText('Updated notes for my goal')).toBeInTheDocument();
    });

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Verify service was called with correct data
    await waitFor(() => {
      expect(mockGoalsDataService.updateGoal).toHaveBeenCalledWith(
        'test-goal-id',
        'test-user-id',
        expect.objectContaining({
          goal_name: 'My New Goal',
          target_amount: 15000,
          notes: 'Updated notes for my goal'
        })
      );
    });

    // Should redirect after successful save
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/goals/test-goal-id');
    });
  });
});