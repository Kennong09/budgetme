import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { Family } from '../types';
import { refreshFamilyMembershipsView } from '../../../utils/helpers';

interface UseFamilyDataReturn {
  familyData: Family | null;
  isLoadingFamilyData: boolean;
  isCreator: boolean;
  fetchFamilyData: (retryCount?: number, maxRetries?: number, specificFamilyId?: string) => Promise<void>;
  setFamilyData: (data: Family | null) => void;
}

export const useFamilyData = (userId: string | undefined, showErrorToast: (message: string) => void): UseFamilyDataReturn => {
  const [familyData, setFamilyData] = useState<Family | null>(null);
  const [isLoadingFamilyData, setIsLoadingFamilyData] = useState<boolean>(false);
  const [isCreator, setIsCreator] = useState<boolean>(false);

  const fetchFamilyData = useCallback(async (retryCount = 0, maxRetries = 3, specificFamilyId?: string) => {
    if (!userId) return;
    
    setIsLoadingFamilyData(true);
    
    try {
      // If a specific family ID is provided, fetch it directly
      if (specificFamilyId) {
        const { data, error } = await supabase
          .from('families')
          .select('*')
          .eq('id', specificFamilyId)
          .single();
          
        if (error) {
          console.error("Error fetching specific family:", error);
          showErrorToast(`Error loading family: ${error.message}`);
          return;
        }
        
        if (data) {
          setFamilyData(data);
          setIsCreator(userId === data.created_by);
          return;
        }
      }
      
      // Use direct query instead of RPC functions to avoid errors
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select(`
          family_id,
          role,
          status,
          families (
            id,
            family_name,
            description,
            currency_pref,
            created_by,
            created_at,
            updated_at,
            is_public
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (memberError || !memberData) {
        if (retryCount < maxRetries - 1) {
          setTimeout(() => {
            fetchFamilyData(retryCount + 1, maxRetries);
          }, 1500);
          return;
        }
        
        setFamilyData(null);
        return;
      }

      // Set family data from the joined query result
      const familyData = memberData.families as any;
      if (familyData) {
        setFamilyData({
          id: familyData.id,
          family_name: familyData.family_name,
          description: familyData.description || '',
          currency_pref: familyData.currency_pref || 'PHP',
          created_by: familyData.created_by,
          created_at: familyData.created_at,
          updated_at: familyData.updated_at,
          is_public: familyData.is_public || false
        });
        setIsCreator(userId === familyData.created_by);
      } else {
        if (retryCount < maxRetries - 1) {
          setTimeout(() => {
            fetchFamilyData(retryCount + 1, maxRetries);
          }, 1500);
          return;
        }
        
        setFamilyData(null);
      }
    } catch (err) {
      console.error("Error in fetchFamilyData:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      
      // Check for specific database errors that could cause infinite loops
      if (errorMessage.includes('400') || 
          errorMessage.includes('Bad Request') ||
          errorMessage.includes('RPC') ||
          errorMessage.includes('get_family_membership') ||
          errorMessage.includes('check_user_family')) {
        showErrorToast("Database connection error. Please try refreshing the page.");
        setFamilyData(null);
        return;
      }
      
      if (retryCount < maxRetries - 1) {
        setTimeout(() => {
          fetchFamilyData(retryCount + 1, maxRetries);
        }, 1500);
        return;
      }
      
      showErrorToast(`Error loading family data: ${errorMessage}`);
    } finally {
      setIsLoadingFamilyData(false);
    }
  }, [userId, showErrorToast]);

  return {
    familyData,
    isLoadingFamilyData,
    isCreator,
    fetchFamilyData,
    setFamilyData
  };
};
