import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../utils/AuthContext';
import { useToast } from '../../../utils/ToastContext';
import { supabase } from '../../../utils/supabaseClient';
import { EnhancedTransactionService } from '../../../services/database/enhancedTransactionService';
import { getCurrentMonthDates } from '../../../utils/helpers';
import {
  UserData,
  BudgetItem,
  Transaction,
  Invitation,
  Account,
  Category,
  Goal,
  BudgetData
} from '../types';

/**
 * Custom hook for fetching and managing dashboard data
 */
export const useDashboardData = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showErrorToast } = useToast();
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [budgetProgress, setBudgetProgress] = useState<BudgetItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Request deduplication
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 2000; // 2 seconds minimum between fetches

  const fetchUserData = useCallback(async () => {
    if (!user) {
      navigate("/");
      return;
    }

    // Prevent duplicate requests
    const now = Date.now();
    if (fetchInProgress.current || (now - lastFetchTime.current < FETCH_COOLDOWN)) {
      console.log('Fetch request deduplication: skipping duplicate or too frequent request');
      return;
    }

    try {
      fetchInProgress.current = true;
      lastFetchTime.current = now;
      setLoading(true);
      
      // Fetch user's accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
        
      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
        throw accountsError;
      }
      
      // Fetch income categories
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_categories')
        .select('*')
        .eq('user_id', user.id);
        
      if (incomeError) {
        console.error('Error fetching income categories:', incomeError);
        throw incomeError;
      }
      
      // Fetch expense categories
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('user_id', user.id);
        
      if (expenseError) {
        console.error('Error fetching expense categories:', expenseError);
        throw expenseError;
      }
      
      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
        
      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        throw goalsError;
      }
      
      // Fetch recent transactions using EnhancedTransactionService for proper category mapping
      const transactionResult = await EnhancedTransactionService.fetchTransactionsWithMapping(
        user.id,
        { limit: 500 } // Get more transactions for comprehensive dashboard view
      );
      
      if (!transactionResult.success) {
        console.error('Error fetching transactions:', transactionResult.error);
        throw new Error(transactionResult.error || 'Failed to fetch transactions');
      }
      
      const transactionsData = transactionResult.data || [];

      // Fetch budget progress data with improved error handling and multiple fallback patterns
      let budgetsData: BudgetData[] | null = null;
      let budgetsError = null;
      
      // Try multiple different budget table structures and relationships
      try {
        // Attempt 1: Try budgets table with budget_categories relationship
        const result1 = await supabase
          .from('budgets')
          .select(`
            *,
            budget_categories!budgets_category_id_fkey(category_name)
          `)
          .eq('user_id', user.id);
        
        if (!result1.error && result1.data) {
          budgetsData = result1.data;
          console.log('Successfully fetched budgets from budgets table with budget_categories');
        } else {
          throw new Error('Budget_categories relationship not found');
        }
      } catch (err1) {
        console.log('Attempt 1 failed, trying expense_categories relationship:', err1);
        
        try {
          // Attempt 2: Try budgets table with expense_categories relationship (legacy)
          const result2 = await supabase
            .from('budgets')
            .select(`
              *,
              expense_categories!budgets_category_id_fkey(category_name)
            `)
            .eq('user_id', user.id);
          
          if (!result2.error && result2.data) {
            budgetsData = result2.data;
            console.log('Successfully fetched budgets from budgets table with expense_categories');
          } else {
            throw new Error('Expense_categories relationship not found');
          }
        } catch (err2) {
          console.log('Attempt 2 failed, trying budgets table without relationships:', err2);
          
          try {
            // Attempt 3: Try budgets table without foreign key relationships
            const result3 = await supabase
              .from('budgets')
              .select('*')
              .eq('user_id', user.id);
            
            if (!result3.error && result3.data) {
              budgetsData = result3.data;
              console.log('Successfully fetched budgets from budgets table without relationships');
            } else {
              throw new Error('Budgets table not accessible');
            }
          } catch (err3) {
            console.log('Attempt 3 failed, trying budget_details view:', err3);
            
            try {
              // Attempt 4: Try budget_details view as fallback
              const result4 = await supabase
                .from('budget_details')
                .select('*')
                .eq('user_id', user.id)
                .order('percentage', { ascending: false });
              
              if (!result4.error && result4.data) {
                budgetsData = result4.data;
                console.log('Successfully fetched budgets from budget_details view');
              } else {
                throw new Error('Budget_details view not accessible');
              }
            } catch (err4) {
              console.log('All budget query attempts failed, continuing without budget data:', err4);
              budgetsData = [];
              budgetsError = null; // Don't treat as error, just no data available
            }
          }
        }
      }
      
      if (budgetsError) {
        console.error('Error fetching budgets:', budgetsError);
      }
      
      // Get pending family invitations
      const formattedInvitations = await fetchPendingInvitations(user.id);
      
      // Format budget data
      const formattedBudgetData = formatBudgetData(budgetsData || []);
      
      // Calculate all-time income and expenses
      const allTransactions = transactionsData || [];
      
      const income = allTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const expenses = allTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
        
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
      
      // Create user data object
      const dashboardUserData: UserData = {
        user: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        },
        accounts: accountsData || [],
        incomeCategories: incomeData || [],
        expenseCategories: expenseData || [],
        goals: goalsData || [],
        transactions: transactionsData || [],
        summaryData: {
          income,
          expenses,
          balance: income - expenses,
          savingsRate
        }
      };
      
      // Update state
      setUserData(dashboardUserData);
      setPendingInvites(formattedInvitations);
      // Limit budget progress to 10 latest budgets
      setBudgetProgress(formattedBudgetData.slice(0, 10));
      
      // Set recent transactions - limit to 10 latest
      const sortedTransactions = [...(transactionsData || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 10);
      setRecentTransactions(sortedTransactions);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      showErrorToast(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [user, navigate, showErrorToast]);

  // Memoized helper function to fetch pending invitations
  const fetchPendingInvitations = useCallback(async (userId: string): Promise<Invitation[]> => {
    let formattedInvitations: Invitation[] = [];
    
    try {
      // Try multiple table structures for compatibility
      const { data: familyData, error: familyError } = await supabase
        .from('family_details')
        .select('*, invitee:invitee_id(*), family:family_id(*)')
        .eq('invitee_id', userId)
        .eq('status', 'pending');
        
      if (familyError) {
        console.log('Family details not found, trying family_members:', familyError);
        
        // Try family_members table as fallback
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select('*, families:family_id(*)')
          .eq('user_id', userId)
          .eq('status', 'pending');
          
        if (memberError) {
          console.log('Family members not found, trying invite_requests:', memberError);
          
          // Try another possible table structure
          const { data: inviteData, error: inviteError } = await supabase
            .from('invite_requests')
            .select('*')
            .eq('invitee_id', userId)
            .eq('status', 'pending');
            
          if (inviteError) {
            console.error('Error fetching invitations from all possible tables:', inviteError);
          } else if (inviteData) {
            formattedInvitations = inviteData.map(inv => ({
              id: inv.id,
              family_id: inv.family_id,
              family_name: inv.family_name || 'Unknown Family',
              inviter_user_id: inv.inviter_id,
              inviter_email: inv.inviter_email || 'Unknown'
            }));
          }
        } else if (memberData) {
          formattedInvitations = memberData.map(member => ({
            id: member.id,
            family_id: member.family_id,
            family_name: member.families?.family_name || 'Unknown Family',
            inviter_user_id: member.invited_by || userId,
            inviter_email: 'Family Admin'
          }));
        }
      } else if (familyData) {
        formattedInvitations = familyData.map(detail => ({
          id: detail.id,
          family_id: detail.family_id,
          family_name: detail.family?.family_name || 'Unknown Family',
          inviter_user_id: detail.inviter_id || '',
          inviter_email: detail.invitee?.email || 'Unknown'
        }));
      }
    } catch (err) {
      console.error('Error processing family invitations:', err);
    }
    
    return formattedInvitations;
  }, []);

  // Memoized helper function to format budget data
  const formatBudgetData = useCallback((budgetsData: BudgetData[]): BudgetItem[] => {
    return budgetsData.map(budget => {
      // Calculate status based on percentage
      let status: "success" | "warning" | "danger" = "success";
      let percentage = 0;
      let spent = 0;
      let amount = 0;
      let remaining = 0;
      let category = '';
      
      // Handle different data structures (budget_details view vs budgets table)
      if ('percentage' in budget) {
        // Data from budget_details view
        percentage = budget.percentage || 0;
        spent = budget.spent || 0;
        amount = budget.amount || 0;
        remaining = budget.remaining || 0;
        category = budget.category_name || '';
      } else {
        // Data from budgets table with or without joined categories
        amount = budget.amount || 0;
        spent = budget.spent || 0;
        remaining = amount - spent;
        percentage = amount > 0 ? (spent / amount) * 100 : 0;
        
        // Try different category name sources based on available relationships
        if (budget.budget_categories?.category_name) {
          category = budget.budget_categories.category_name;
        } else if (budget.expense_categories?.category_name) {
          category = budget.expense_categories.category_name;
        } else if (budget.category_name) {
          category = budget.category_name;
        } else if (budget.name) {
          category = budget.name;
        } else {
          category = `Budget ${budget.id || 'Unknown'}`;
        }
      }
      
      if (percentage >= 100) {
        status = "danger";
      } else if (percentage >= 80) {
        status = "warning";
      }
      
      return {
        id: budget.id,
        category: category,
        name: category,
        amount: amount,
        spent: spent,
        remaining: remaining,
        percentage: percentage,
        status: status
      };
    });
  }, []);

  // Handle invitation actions with stable callbacks
  const handleAcceptInvite = useCallback(async (inviteId: number) => {
    if (!user) {
      showErrorToast('You must be logged in to accept invitations');
      return;
    }
    
    try {
      // Update invitation status
      const { error } = await supabase
        .from('family_invitations')
        .update({ status: 'accepted' })
        .eq('id', inviteId);
      
      if (error) throw error;
      
      // Get the invitation details
      const { data: inviteData, error: fetchError } = await supabase
        .from('family_invitations')
        .select('family_id, families:family_id(family_name)')
        .eq('id', inviteId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Add user to family_members table
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: inviteData?.family_id,
          user_id: user.id,
          role: 'member'
        });
      
      if (memberError) throw memberError;
      
      // Update state
      setPendingInvites(current => current.filter(inv => inv.id !== inviteId));
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      showErrorToast(error.message || 'Failed to accept invitation');
    }
  }, [user, showErrorToast]);

  const handleRejectInvite = useCallback(async (inviteId: number) => {
    if (!user) {
      showErrorToast('You must be logged in to reject invitations');
      return;
    }
    
    try {
      // Update invitation status
      const { error } = await supabase
        .from('family_invitations')
        .update({ status: 'rejected' })
        .eq('id', inviteId);
      
      if (error) throw error;
      
      // Update state
      setPendingInvites(current => current.filter(inv => inv.id !== inviteId));
      
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      showErrorToast(error.message || 'Failed to reject invitation');
    }
  }, [user, showErrorToast]);

  // Fetch data on mount
  useEffect(() => {
    fetchUserData();
  }, [user]);

  return {
    userData,
    budgetProgress,
    recentTransactions,
    pendingInvites,
    loading,
    fetchUserData,
    handleAcceptInvite,
    handleRejectInvite
  };
};
