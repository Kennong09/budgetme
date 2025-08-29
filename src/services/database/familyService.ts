import { supabase } from '../../utils/supabaseClient';

// Types for family operations
export interface Family {
  id: string;
  family_name: string;
  description?: string;
  currency_pref: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'admin' | 'viewer';
  status: 'active' | 'pending' | 'inactive' | 'removed';
  joined_at: string;
  created_at: string;
  updated_at: string;
  user?: any; // User profile data
  email?: string;
  full_name?: string;
  avatar_url?: string;
  invited_by?: string;
}

export interface FamilyCreateData {
  family_name: string;
  description?: string;
  currency_pref: string;
  is_public?: boolean;
}

export interface FamilyUpdateData {
  family_name?: string;
  description?: string;
  currency_pref?: string;
  is_public?: boolean;
}

export interface FamilyMembershipInfo {
  is_member: boolean;
  family_id?: string;
  family_name?: string;
  description?: string;
  currency_pref?: string;
  role?: string;
  status?: string;
  member_count?: number;
}

export interface FamilyStats {
  member_count: number;
  total_income: number;
  total_expenses: number;
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  total_transactions: number;
}

class FamilyService {
  /**
   * Create a new family with the current user as admin
   */
  async createFamily(data: FamilyCreateData, userId: string): Promise<Family> {
    try {
      // First check if user already belongs to a family
      const existingMembership = await this.checkFamilyMembership(userId);
      if (existingMembership.is_member) {
        throw new Error('User already belongs to a family');
      }

      // Use the transaction-safe RPC function
      const { data: result, error } = await supabase.rpc('create_family_with_member', {
        p_family_name: data.family_name,
        p_description: data.description || '',
        p_currency_pref: data.currency_pref,
        p_is_public: data.is_public || false,
        p_user_id: userId
      });

      if (error) {
        throw new Error(`Failed to create family: ${error.message}`);
      }

      // Ensure updated_at is present
      return {
        ...result,
        updated_at: result.updated_at || result.created_at
      };
    } catch (error) {
      console.error('Error in createFamily:', error);
      throw error;
    }
  }

  /**
   * Update family details
   */
  async updateFamily(familyId: string, data: FamilyUpdateData, userId: string): Promise<Family> {
    try {
      const { data: result, error } = await supabase
        .from('families')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', familyId)
        .eq('created_by', userId) // Ensure only creator can update
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update family: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error in updateFamily:', error);
      throw error;
    }
  }

  /**
   * Delete a family (only by creator)
   */
  async deleteFamily(familyId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('families')
        .delete()
        .eq('id', familyId)
        .eq('created_by', userId);

      if (error) {
        throw new Error(`Failed to delete family: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteFamily:', error);
      throw error;
    }
  }

  /**
   * Get family by ID
   */
  async getFamilyById(familyId: string): Promise<Family | null> {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw new Error(`Failed to get family: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getFamilyById:', error);
      throw error;
    }
  }

  /**
   * Get user's family
   */
  async getUserFamily(userId: string): Promise<Family | null> {
    try {
      // First get the family membership
      const membership = await this.checkFamilyMembership(userId);
      
      if (!membership.is_member || !membership.family_id) {
        return null;
      }

      return await this.getFamilyById(membership.family_id);
    } catch (error) {
      console.error('Error in getUserFamily:', error);
      throw error;
    }
  }

  /**
   * Check if user is a member of any family
   */
  async checkFamilyMembership(userId: string): Promise<FamilyMembershipInfo> {
    try {
      // Try the RPC function first
      const { data: result, error } = await supabase.rpc('get_family_membership', {
        p_user_id: userId
      });

      if (!error && result) {
        return {
          is_member: result.is_member || false,
          family_id: result.family_id,
          family_name: result.family_name,
          description: result.description,
          currency_pref: result.currency_pref,
          role: result.role,
          status: result.status,
          member_count: result.member_count
        };
      }

      // Fallback to direct query
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
            currency_pref
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (memberError || !memberData) {
        return { is_member: false };
      }

      return {
        is_member: true,
        family_id: memberData.family_id,
        family_name: (memberData.families as any)?.family_name,
        description: (memberData.families as any)?.description,
        currency_pref: (memberData.families as any)?.currency_pref,
        role: memberData.role,
        status: memberData.status
      };
    } catch (error) {
      console.error('Error in checkFamilyMembership:', error);
      return { is_member: false };
    }
  }

  /**
   * Check if user is a member of a specific family
   */
  async checkSpecificFamilyMembership(userId: string, familyId: string): Promise<FamilyMembershipInfo> {
    try {
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
            currency_pref
          )
        `)
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .eq('status', 'active')
        .single();

      if (memberError || !memberData) {
        return { is_member: false };
      }

      return {
        is_member: true,
        family_id: memberData.family_id,
        family_name: (memberData.families as any)?.family_name,
        description: (memberData.families as any)?.description,
        currency_pref: (memberData.families as any)?.currency_pref,
        role: memberData.role,
        status: memberData.status
      };
    } catch (error) {
      console.error('Error in checkSpecificFamilyMembership:', error);
      return { is_member: false };
    }
  }

  /**
   * Add a family member
   */
  async addFamilyMember(
    familyId: string, 
    userId: string, 
    role: string = 'viewer',
    invitedBy?: string
  ): Promise<FamilyMember> {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          family_id: familyId,
          user_id: userId,
          role: role,
          status: 'active',
          invited_by: invitedBy
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add family member: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in addFamilyMember:', error);
      throw error;
    }
  }

  /**
   * Remove a family member
   */
  async removeFamilyMember(familyId: string, userId: string, adminUserId: string): Promise<void> {
    try {
      // Verify admin has permission
      const { data: adminMember, error: adminError } = await supabase
        .from('family_members')
        .select('role')
        .eq('family_id', familyId)
        .eq('user_id', adminUserId)
        .eq('status', 'active')
        .single();

      if (adminError || !adminMember || adminMember.role !== 'admin') {
        throw new Error('Only family admins can remove members');
      }

      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to remove family member: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in removeFamilyMember:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    familyId: string, 
    userId: string, 
    newRole: string, 
    adminUserId: string
  ): Promise<void> {
    try {
      // Verify admin has permission
      const { data: adminMember, error: adminError } = await supabase
        .from('family_members')
        .select('role')
        .eq('family_id', familyId)
        .eq('user_id', adminUserId)
        .eq('status', 'active')
        .single();

      if (adminError || !adminMember || adminMember.role !== 'admin') {
        throw new Error('Only family admins can update member roles');
      }

      const { error } = await supabase
        .from('family_members')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('family_id', familyId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to update member role: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updateMemberRole:', error);
      throw error;
    }
  }

  /**
   * Get all family members with user profiles
   */
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      // Get family members
      const { data: members, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'active');

      if (membersError) {
        throw new Error(`Failed to get family members: ${membersError.message}`);
      }

      if (!members || members.length === 0) {
        return [];
      }

      // Get user profiles
      const memberUserIds = members.map(member => member.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, user_metadata, created_at, updated_at, last_sign_in_at')
        .in('id', memberUserIds);

      if (profilesError) {
        console.warn('Error fetching user profiles:', profilesError);
        // Continue with basic member data
      }

      // Combine member and profile data
      const enhancedMembers: FamilyMember[] = members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          ...member,
          user: profile,
          email: profile?.email || '',
          full_name: profile?.user_metadata?.full_name || 
                    profile?.user_metadata?.username || 
                    profile?.email?.split('@')[0] || 
                    'Unknown',
          avatar_url: profile?.user_metadata?.avatar_url || '',
          joined_at: member.created_at,
          updated_at: member.updated_at || member.created_at // Ensure updated_at is always present
        };
      });

      return enhancedMembers;
    } catch (error) {
      console.error('Error in getFamilyMembers:', error);
      throw error;
    }
  }

  /**
   * Get family statistics
   */
  async getFamilyStats(familyId: string): Promise<FamilyStats> {
    try {
      // Try RPC function first
      const { data: stats, error: statsError } = await supabase.rpc('get_family_stats', {
        p_family_id: familyId
      });

      if (!statsError && stats) {
        return stats;
      }

      // Fallback to manual calculation
      const members = await this.getFamilyMembers(familyId);
      const memberUserIds = members.map(m => m.user_id);

      if (memberUserIds.length === 0) {
        return {
          member_count: 0,
          total_income: 0,
          total_expenses: 0,
          total_goals: 0,
          active_goals: 0,
          completed_goals: 0,
          total_transactions: 0
        };
      }

      // Get current month date range
      const currentDate = new Date();
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      // Get transactions for current month
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, type')
        .in('user_id', memberUserIds)
        .gte('date', firstDay)
        .lte('date', lastDay);

      if (txError) {
        console.warn('Error fetching transactions for stats:', txError);
      }

      // Get goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, target_amount, current_amount, status')
        .in('user_id', memberUserIds);

      if (goalsError) {
        console.warn('Error fetching goals for stats:', goalsError);
      }

      // Calculate stats
      const totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalGoals = goals?.length || 0;
      const activeGoals = goals?.filter(g => g.status === 'active').length || 0;
      const completedGoals = goals?.filter(g => g.status === 'completed').length || 0;

      return {
        member_count: members.length,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        total_goals: totalGoals,
        active_goals: activeGoals,
        completed_goals: completedGoals,
        total_transactions: transactions?.length || 0
      };
    } catch (error) {
      console.error('Error in getFamilyStats:', error);
      throw error;
    }
  }

  /**
   * Get public families available for joining
   */
  async getPublicFamilies(userId: string): Promise<any[]> {
    try {
      // Get all public families
      const { data: publicFamilies, error: familiesError } = await supabase
        .from('families')
        .select('*')
        .eq('is_public', true);

      if (familiesError) {
        throw new Error(`Failed to get public families: ${familiesError.message}`);
      }

      if (!publicFamilies || publicFamilies.length === 0) {
        return [];
      }

      // Get families user is already a member of
      const { data: userMemberships, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (membershipError) {
        console.warn('Error checking user memberships:', membershipError);
      }

      const userFamilyIds = new Set(userMemberships?.map(m => m.family_id) || []);

      // Filter out families user is already a member of
      const availableFamilies = publicFamilies.filter(family => !userFamilyIds.has(family.id));

      // Get additional info for each family
      const enhancedFamilies = await Promise.all(
        availableFamilies.map(async (family) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('family_members')
            .select('*', { count: 'exact', head: true })
            .eq('family_id', family.id)
            .eq('status', 'active');

          // Get creator info
          const { data: creator } = await supabase
            .from('profiles')
            .select('email, user_metadata')
            .eq('id', family.created_by)
            .single();

          return {
            ...family,
            member_count: memberCount || 0,
            creator_name: creator?.user_metadata?.username || 
                         creator?.user_metadata?.full_name || 
                         creator?.email?.split('@')[0] || 
                         'Unknown',
            creator_email: creator?.email || 'Unknown'
          };
        })
      );

      return enhancedFamilies;
    } catch (error) {
      console.error('Error in getPublicFamilies:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const familyService = new FamilyService();
export default familyService;