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
      
      // Check user's family membership
      const { data: checkResult, error: checkError } = await supabase.rpc(
        'check_user_family',
        { p_user_id: userId }
      );
      
      if (checkError) {
        console.error("Error checking family membership:", checkError);
        
        // Try direct membership check as fallback
        const { data: directResult, error: directError } = await supabase.rpc(
          'get_family_membership',
          { p_user_id: userId }
        );
        
        if (directError) {
          console.error("Error using direct membership check:", directError);
          
          if (retryCount < maxRetries - 1) {
            setTimeout(() => {
              fetchFamilyData(retryCount + 1, maxRetries);
            }, 1500);
            return;
          }
          
          showErrorToast(`Error checking family status: ${checkError.message}`);
          return;
        }
        
        if (directResult && directResult.is_member) {
          const familyFromDirect = {
            id: directResult.family_id,
            family_name: directResult.family_name,
            description: directResult.description || "",
            currency_pref: directResult.currency_pref || "",
            created_by: "",
            created_at: "",
            updated_at: ""
          };
          
          setFamilyData(familyFromDirect);
          
          // Fetch full family details
          const { data: fullFamilyDetails, error: fullFamilyError } = await supabase
            .from('families')
            .select('*')
            .eq('id', directResult.family_id)
            .single();
            
          if (!fullFamilyError && fullFamilyDetails) {
            setFamilyData(fullFamilyDetails);
            setIsCreator(userId === fullFamilyDetails.created_by);
          }
        } else {
          if (retryCount < maxRetries - 1) {
            setTimeout(() => {
              fetchFamilyData(retryCount + 1, maxRetries);
            }, 1500);
            return;
          }
          
          setFamilyData(null);
          return;
        }
      } else if (checkResult) {
        // Handle both old JSON format and new table format
        let isMember = false;
        let familyId = null;
        
        if (Array.isArray(checkResult) && checkResult.length > 0) {
          isMember = checkResult[0].is_member;
          familyId = checkResult[0].family_id;
        } else if (checkResult.is_member !== undefined) {
          isMember = checkResult.is_member;
          familyId = checkResult.family_id;
        }
        
        if (!isMember || !familyId) {
          if (retryCount < maxRetries - 1) {
            setTimeout(() => {
              fetchFamilyData(retryCount + 1, maxRetries);
            }, 1500);
            return;
          }
          
          setFamilyData(null);
          return;
        }
        
        // Fetch full family data
        const { data, error } = await supabase
          .from("families")
          .select("*")
          .eq("id", familyId)
          .single();
          
        if (error) {
          console.error("Error fetching family data:", error);
          showErrorToast(`Error loading family data: ${error.message}`);
          return;
        }
        
        setFamilyData(data);
        setIsCreator(userId === data.created_by);
      }
    } catch (err) {
      console.error("Error in fetchFamilyData:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
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
