import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Goal, DeleteModalState } from '../types';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../utils/ToastContext';
import { calculateGoalSummary } from '../utils/goalUtils';

/**
 * Custom hook for managing goal deletion
 */
export const useGoalDeletion = (
  goals: Goal[], 
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>,
  filteredGoals: Goal[],
  setFilteredGoals: React.Dispatch<React.SetStateAction<Goal[]>>,
  setGoalSummary: React.Dispatch<React.SetStateAction<any>>
) => {
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState>({
    showDeleteModal: false,
    goalToDelete: null,
    isDeleting: false,
    deleteError: null,
    hasLinkedTransactions: false
  });

  // Function to open delete confirmation modal
  const openDeleteModal = (goalId: string) => {
    setDeleteModalState(prev => ({
      ...prev,
      goalToDelete: goalId,
      showDeleteModal: true,
      deleteError: null,
      hasLinkedTransactions: false
    }));
  };

  // Function to close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModalState({
      showDeleteModal: false,
      goalToDelete: null,
      isDeleting: false,
      deleteError: null,
      hasLinkedTransactions: false
    });
  };

  // Function to handle goal deletion
  const handleDeleteGoal = async () => {
    if (!deleteModalState.goalToDelete) return;
    
    try {
      setDeleteModalState(prev => ({
        ...prev,
        isDeleting: true,
        deleteError: null,
        hasLinkedTransactions: false
      }));
      
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', deleteModalState.goalToDelete);
        
      if (error) {
        // Check for foreign key constraint violation
        if (error.message.includes("foreign key constraint") && error.message.includes("transactions_goal_id_fkey")) {
          setDeleteModalState(prev => ({
            ...prev,
            hasLinkedTransactions: true,
            deleteError: "This goal has linked transactions. Please reassign or delete these transactions before deleting the goal.",
            isDeleting: false
          }));
          return;
        }
        throw new Error(`Error deleting goal: ${error.message}`);
      }
      
      // Optimistically update the UI by removing the deleted goal from state
      const updatedGoals = goals.filter(goal => goal.id !== deleteModalState.goalToDelete);
      setGoals(updatedGoals);
      
      // Also update filtered goals to keep the UI in sync
      const updatedFiltered = filteredGoals.filter(goal => goal.id !== deleteModalState.goalToDelete);
      setFilteredGoals(updatedFiltered);
      
      // Update goal summary
      const summary = calculateGoalSummary(updatedGoals);
      setGoalSummary(summary);
      
      showSuccessToast("Goal deleted successfully");
      closeDeleteModal();
    } catch (err) {
      console.error("Error deleting goal:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setDeleteModalState(prev => ({
        ...prev,
        deleteError: errorMessage,
        isDeleting: false
      }));
      showErrorToast(`Failed to delete goal: ${errorMessage}`);
    }
  };

  // Function to view transactions associated with a goal
  const viewLinkedTransactions = () => {
    if (!deleteModalState.goalToDelete) return;
    
    // Navigate to transactions page with goal filter
    navigate(`/transactions?goal_id=${deleteModalState.goalToDelete}`);
    closeDeleteModal();
  };

  return {
    deleteModalState,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteGoal,
    viewLinkedTransactions
  };
};