import { useState, useCallback } from 'react';
import { familyService } from '../../../services/database/familyService';
import { FamilyMember } from '../types';

interface UseFamilyMembersReturn {
  members: FamilyMember[];
  isLoadingMembers: boolean;
  fetchFamilyMembers: (familyId: string) => Promise<void>;
  setMembers: (members: FamilyMember[]) => void;
}

export const useFamilyMembers = (showErrorToast: (message: string) => void): UseFamilyMembersReturn => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);

  const fetchFamilyMembers = useCallback(async (familyId: string) => {
    if (!familyId) return;
    
    setIsLoadingMembers(true);
    
    try {
      // Use the familyService method which already works properly
      const familyMembers = await familyService.getFamilyMembers(familyId);
      console.log('Fetched family members via familyService:', familyMembers);
      setMembers(familyMembers);
    } catch (err) {
      console.error("Error in fetchFamilyMembers:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showErrorToast(`Error loading family members: ${errorMessage}`);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [showErrorToast]);

  return {
    members,
    isLoadingMembers,
    fetchFamilyMembers,
    setMembers
  };
};
