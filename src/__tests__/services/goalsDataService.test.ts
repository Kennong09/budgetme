import { goalsDataService } from '../../components/goals/services/goalsDataService';
import { supabase } from '../../utils/supabaseClient';

// Mock Supabase client
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('GoalsDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchGoals', () => {
    test('successfully fetches goals from goals table', async () => {
      const mockGoals = [
        {
          id: '1',
          goal_name: 'Emergency Fund',
          target_amount: 10000,
          current_amount: 2500,
          status: 'in_progress'
        },
        {
          id: '2',
          goal_name: 'Vacation',
          target_amount: 5000,
          current_amount: 1000,
          status: 'in_progress'
        }
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: mockGoals, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      } as any);
      
      mockSelect.mockReturnValue({
        eq: mockEq
      });
      
      mockEq.mockReturnValue({
        order: mockOrder
      });

      const result = await goalsDataService.fetchGoals('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.data).toEqual(mockGoals);
      expect(result.error).toBeNull();
    });

    test('falls back to goal_details view when goals table fails', async () => {
      const mockGoalsFromView = [
        {
          id: '1',
          goal_name: 'Emergency Fund',
          target_amount: 10000,
          current_amount: 2500,
          status: 'in_progress'
        }
      ];

      // First call (goals table) fails
      const mockSelectGoals = jest.fn().mockReturnThis();
      const mockEqGoals = jest.fn().mockReturnThis();
      const mockOrderGoals = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation \"goals\" does not exist' }
      });

      // Second call (goal_details view) succeeds
      const mockSelectView = jest.fn().mockReturnThis();
      const mockEqView = jest.fn().mockReturnThis();
      const mockOrderView = jest.fn().mockResolvedValue({
        data: mockGoalsFromView,
        error: null
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockSelectGoals
        } as any)
        .mockReturnValueOnce({
          select: mockSelectView
        } as any);
      
      mockSelectGoals.mockReturnValue({ eq: mockEqGoals });
      mockEqGoals.mockReturnValue({ order: mockOrderGoals });
      
      mockSelectView.mockReturnValue({ eq: mockEqView });
      mockEqView.mockReturnValue({ order: mockOrderView });

      const result = await goalsDataService.fetchGoals('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(mockSupabase.from).toHaveBeenCalledWith('goal_details');
      expect(result.data).toEqual(mockGoalsFromView);
      expect(result.error).toBeNull();
    });

    test('handles errors when both main and fallback queries fail', async () => {
      const mockError = { message: 'Database connection failed' };
      
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const result = await goalsDataService.fetchGoals('user-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Database connection failed');
    });
  });

  describe('fetchGoalById', () => {
    test('successfully fetches a single goal', async () => {
      const mockGoal = {
        id: '1',
        goal_name: 'Emergency Fund',
        target_amount: 10000,
        current_amount: 2500,
        status: 'in_progress'
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockGoal, error: null });

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);
      mockSelect.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ single: mockSingle });

      const result = await goalsDataService.fetchGoalById('goal-1', 'user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(mockEq1).toHaveBeenCalledWith('id', 'goal-1');
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.data).toEqual(mockGoal);
      expect(result.error).toBeNull();
    });

    test('returns null when goal is not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);
      mockSelect.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ single: mockSingle });

      const result = await goalsDataService.fetchGoalById('nonexistent', 'user-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('createGoalContribution', () => {
    test('successfully creates a goal contribution', async () => {
      const contributionData = {
        goalId: 'goal-1',
        amount: 500,
        accountId: 'account-1',
        notes: 'Monthly contribution',
        userId: 'user-123'
      };

      const mockRpc = jest.fn().mockResolvedValue({ data: { success: true }, error: null });
      mockSupabase.rpc = mockRpc;

      const result = await goalsDataService.createGoalContribution(contributionData);

      expect(mockRpc).toHaveBeenCalledWith('contribute_to_goal', {
        p_goal_id: 'goal-1',
        p_amount: 500,
        p_account_id: 'account-1',
        p_notes: 'Monthly contribution',
        p_user_id: 'user-123'
      });
      expect(result.data).toEqual({ success: true });
      expect(result.error).toBeNull();
    });

    test('handles RPC errors', async () => {
      const contributionData = {
        goalId: 'goal-1',
        amount: 500,
        accountId: 'account-1',
        notes: 'Monthly contribution',
        userId: 'user-123'
      };

      const mockError = { message: 'Insufficient funds' };
      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: mockError });
      mockSupabase.rpc = mockRpc;

      const result = await goalsDataService.createGoalContribution(contributionData);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Insufficient funds');
    });
  });

  describe('updateGoal', () => {
    test('successfully updates a goal', async () => {
      const goalData = {
        goal_name: 'Updated Goal',
        target_amount: 15000,
        notes: 'Updated notes'
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: { ...goalData, id: 'goal-1' }, error: null });

      mockSupabase.from.mockReturnValue({ update: mockUpdate } as any);
      mockUpdate.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const result = await goalsDataService.updateGoal('goal-1', 'user-123', goalData);

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(mockUpdate).toHaveBeenCalledWith(goalData);
      expect(mockEq1).toHaveBeenCalledWith('id', 'goal-1');
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.data).toEqual({ ...goalData, id: 'goal-1' });
      expect(result.error).toBeNull();
    });

    test('handles update errors', async () => {
      const goalData = {
        goal_name: 'Updated Goal',
        target_amount: 15000
      };

      const mockError = { message: 'Goal not found' };
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue({ update: mockUpdate } as any);
      mockUpdate.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const result = await goalsDataService.updateGoal('goal-1', 'user-123', goalData);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Goal not found');
    });
  });

  describe('deleteGoal', () => {
    test('successfully deletes a goal', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({ data: { id: 'goal-1' }, error: null });

      mockSupabase.from.mockReturnValue({ delete: mockDelete } as any);
      mockDelete.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq2 });

      const result = await goalsDataService.deleteGoal('goal-1', 'user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('goals');
      expect(mockEq1).toHaveBeenCalledWith('id', 'goal-1');
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.data).toEqual({ id: 'goal-1' });
      expect(result.error).toBeNull();
    });

    test('handles deletion errors', async () => {
      const mockError = { message: 'Cannot delete goal with contributions' };
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({ data: null, error: mockError });

      mockSupabase.from.mockReturnValue({ delete: mockDelete } as any);
      mockDelete.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq2 });

      const result = await goalsDataService.deleteGoal('goal-1', 'user-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Cannot delete goal with contributions');
    });
  });

  describe('getServiceState', () => {
    test('returns current service state', () => {
      const state = goalsDataService.getServiceState();
      
      expect(state).toHaveProperty('fallbackMode');
      expect(state).toHaveProperty('lastError');
      expect(state).toHaveProperty('isHealthy');
      expect(typeof state.fallbackMode).toBe('boolean');
      expect(typeof state.isHealthy).toBe('boolean');
    });
  });
});

describe('GoalsDataService Integration Tests', () => {
  test('handles complete goal lifecycle', async () => {
    // Mock successful operations
    const mockGoal = {
      id: 'goal-1',
      goal_name: 'Test Goal',
      target_amount: 10000,
      current_amount: 0,
      status: 'not_started'
    };

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis()
    };

    // Set up method chaining
    Object.keys(mockChain).forEach(method => {
      if (method !== 'single') {
        mockChain[method as keyof typeof mockChain].mockReturnValue(mockChain);
      }
    });

    mockSupabase.from.mockReturnValue(mockChain as any);

    // Test fetch
    mockChain.order.mockResolvedValueOnce({ data: [mockGoal], error: null });
    const fetchResult = await goalsDataService.fetchGoals('user-123');
    expect(fetchResult.data).toHaveLength(1);

    // Test update
    mockChain.single.mockResolvedValueOnce({ 
      data: { ...mockGoal, goal_name: 'Updated Goal' }, 
      error: null 
    });
    const updateResult = await goalsDataService.updateGoal('goal-1', 'user-123', {
      goal_name: 'Updated Goal'
    });
    expect(updateResult.data?.goal_name).toBe('Updated Goal');

    // Test delete
    mockChain.eq.mockResolvedValueOnce({ data: mockGoal, error: null });
    const deleteResult = await goalsDataService.deleteGoal('goal-1', 'user-123');
    expect(deleteResult.error).toBeNull();
  });
});