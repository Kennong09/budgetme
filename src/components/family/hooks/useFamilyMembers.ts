import { useState, useCallback } from 'react';
import { supabase } from '../../../utils/supabaseClient';
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
      const { data, error } = await supabase
        .from("family_members")
        .select(`
          user_id,
          joined_at,
          role,
          status,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq("family_id", familyId)
        .eq("status", "active");
        
      if (error) {
        console.error("Error fetching family members:", error);
        showErrorToast(`Error loading family members: ${error.message}`);
        return;
      }
      
      const formattedMembers: FamilyMember[] = data?.map(member => ({
        id: member.user_id, // Using user_id as id for compatibility
        family_id: familyId,
        user_id: member.user_id,
        joined_at: member.joined_at,
        role: member.role,
        status: member.status,
        user: member.users && member.users[0] ? {
          id: member.users[0].id || '',
          email: member.users[0].email || '',
          full_name: member.users[0].full_name || '',
          avatar_url: member.users[0].avatar_url || '',
          created_at: ''
        } : {
          id: '',
          email: '',
          full_name: '',
          avatar_url: '',
          created_at: ''
        }
      })) || [];
      
      setMembers(formattedMembers);
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
