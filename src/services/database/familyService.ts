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
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive' | 'removed';
  joined_at: string;
  created_at: string;
  updated_at: string;
  user?: any; // User profile data
  email?: string;
  full_name?: string;
  avatar_url?: string;
  invited_by?: string;
  invited_at?: string;
  // Additional member permissions
  can_create_goals?: boolean;
  can_view_budgets?: boolean;
  can_contribute_goals?: boolean;
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

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

class FamilyService {
  /**
   * Validate family creation data
   */
  private validateFamilyCreateData(data: FamilyCreateData): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validate family name
    if (!data.family_name || data.family_name.trim().length === 0) {
      errors.push({
        field: 'family_name',
        message: 'Family name is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (data.family_name.length < 3) {
      errors.push({
        field: 'family_name',
        message: 'Family name must be at least 3 characters long',
        code: 'MIN_LENGTH'
      });
    } else if (data.family_name.length > 255) {
      errors.push({
        field: 'family_name',
        message: 'Family name cannot exceed 255 characters',
        code: 'MAX_LENGTH'
      });
    } else if (!/^[a-zA-Z0-9\s-_'.]+$/.test(data.family_name)) {
      errors.push({
        field: 'family_name',
        message: 'Family name contains invalid characters',
        code: 'INVALID_CHARACTERS'
      });
    }
    
    // Validate description if provided
    if (data.description && data.description.length > 500) {
      errors.push({
        field: 'description',
        message: 'Description cannot exceed 500 characters',
        code: 'MAX_LENGTH'
      });
    }
    
    // Validate currency preference
    if (!data.currency_pref) {
      errors.push({
        field: 'currency_pref',
        message: 'Currency preference is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (!['PHP', 'USD', 'EUR', 'GBP', 'JPY'].includes(data.currency_pref)) {
      console.warn(`Unsupported currency: ${data.currency_pref}, defaulting to PHP`);
    }
    
    return errors;
  }
  
  /**
   * Validate family update data
   */
  private validateFamilyUpdateData(data: FamilyUpdateData): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validate family name if provided
    if (data.family_name !== undefined) {
      if (!data.family_name || data.family_name.trim().length === 0) {
        errors.push({
          field: 'family_name',
          message: 'Family name cannot be empty',
          code: 'REQUIRED_FIELD'
        });
      } else if (data.family_name.length < 3) {
        errors.push({
          field: 'family_name',
          message: 'Family name must be at least 3 characters long',
          code: 'MIN_LENGTH'
        });
      } else if (data.family_name.length > 255) {
        errors.push({
          field: 'family_name',
          message: 'Family name cannot exceed 255 characters',
          code: 'MAX_LENGTH'
        });
      }
    }
    
    // Validate description if provided
    if (data.description !== undefined && data.description && data.description.length > 500) {
      errors.push({
        field: 'description',
        message: 'Description cannot exceed 500 characters',
        code: 'MAX_LENGTH'
      });
    }
    
    return errors;
  }

  /**
   * Create a new family with the current user as admin
   */
  async createFamily(data: FamilyCreateData, userId: string): Promise<ValidationResult<Family>> {
    try {
      // Validate input data
      const validationErrors = this.validateFamilyCreateData(data);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors
        };
      }
      
      // Validate user ID
      if (!userId || userId.trim().length === 0) {
        return {
          success: false,
          errors: [{
            field: 'user_id',
            message: 'User ID is required',
            code: 'REQUIRED_FIELD'
          }]
        };
      }
      
      // Check if user already belongs to a family
      const existingMembership = await this.checkFamilyMembership(userId);
      if (existingMembership.is_member) {
        return {
          success: false,
          errors: [{
            field: 'user_id',
            message: 'User already belongs to a family',
            code: 'ALREADY_MEMBER'
          }]
        };
      }

      // Use the transaction-safe RPC function with enhanced error handling
      const { data: result, error } = await supabase.rpc('create_family_with_member', {
        p_family_name: data.family_name.trim(),
        p_description: data.description?.trim() || '',
        p_currency_pref: data.currency_pref || 'PHP',
        p_is_public: data.is_public || false,
        p_user_id: userId
      });

      if (error) {
        console.error('Database error in createFamily:', error);
        
        // Map database errors to user-friendly messages
        if (error.message?.includes('already a member')) {
          return {
            success: false,
            errors: [{
              field: 'user_id',
              message: 'User already belongs to a family',
              code: 'ALREADY_MEMBER'
            }]
          };
        }
        
        if (error.message?.includes('Family name')) {
          return {
            success: false,
            errors: [{
              field: 'family_name',
              message: error.message,
              code: 'VALIDATION_ERROR'
            }]
          };
        }
        
        return {
          success: false,
          errors: [{
            field: 'general',
            message: `Failed to create family: ${error.message}`,
            code: 'DATABASE_ERROR'
          }]
        };
      }

      // Ensure all required fields are present
      const family: Family = {
        ...result,
        updated_at: result.updated_at || result.created_at,
        is_public: result.is_public || false
      };
      
      return {
        success: true,
        data: family
      };
    } catch (error) {
      console.error('Error in createFamily:', error);
      return {
        success: false,
        errors: [{
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'UNKNOWN_ERROR'
        }]
      };
    }
  }

  /**
   * Update family details with validation
   */
  async updateFamily(familyId: string, data: FamilyUpdateData, userId: string): Promise<ValidationResult<Family>> {
    try {
      // Validate input data
      const validationErrors = this.validateFamilyUpdateData(data);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors
        };
      }
      
      // Validate required parameters
      if (!familyId || !userId) {
        return {
          success: false,
          errors: [{
            field: 'general',
            message: 'Family ID and User ID are required',
            code: 'REQUIRED_FIELD'
          }]
        };
      }
      
      // Check if user has permission to update family
      const family = await this.getFamilyById(familyId);
      if (!family) {
        return {
          success: false,
          errors: [{
            field: 'family_id',
            message: 'Family not found',
            code: 'NOT_FOUND'
          }]
        };
      }
      
      if (family.created_by !== userId) {
        return {
          success: false,
          errors: [{
            field: 'permission',
            message: 'Only family creator can update family details',
            code: 'PERMISSION_DENIED'
          }]
        };
      }
      
      // Prepare update data with sanitization
      const updateData: Record<string, any> = {
        ...Object.fromEntries(
          Object.entries(data).filter(([_, value]) => value !== undefined)
        ),
        updated_at: new Date().toISOString()
      };
      
      // Apply string trimming to text fields
      if ('family_name' in updateData && typeof updateData.family_name === 'string') {
        updateData.family_name = updateData.family_name.trim();
      }
      if ('description' in updateData && typeof updateData.description === 'string') {
        updateData.description = updateData.description.trim();
      }

      const { data: result, error } = await supabase
        .from('families')
        .update(updateData)
        .eq('id', familyId)
        .eq('created_by', userId) // Double-check permission at DB level
        .select()
        .single();

      if (error) {
        console.error('Database error in updateFamily:', error);
        
        if (error.code === 'PGRST116') {
          return {
            success: false,
            errors: [{
              field: 'permission',
              message: 'Family not found or permission denied',
              code: 'NOT_FOUND_OR_DENIED'
            }]
          };
        }
        
        return {
          success: false,
          errors: [{
            field: 'general',
            message: `Failed to update family: ${error.message}`,
            code: 'DATABASE_ERROR'
          }]
        };
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error in updateFamily:', error);
      return {
        success: false,
        errors: [{
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'UNKNOWN_ERROR'
        }]
      };
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
      // First, check if user has any active family membership
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_id, role, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (memberError) {
        // Check if it's just "no rows" error
        if (memberError.code === 'PGRST116') {
          return { is_member: false };
        }
        throw memberError;
      }

      if (!memberData) {
        return { is_member: false };
      }

      // Get family details separately to avoid join issues
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id, family_name, description, currency_pref')
        .eq('id', memberData.family_id)
        .single();

      if (familyError) {
        console.warn('Error fetching family details:', familyError);
      }

      // Get member count for the family
      const { count: memberCount } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', memberData.family_id)
        .eq('status', 'active');

      return {
        is_member: true,
        family_id: memberData.family_id,
        family_name: familyData?.family_name || 'Unknown Family',
        description: familyData?.description || '',
        currency_pref: familyData?.currency_pref || 'PHP',
        role: memberData.role,
        status: memberData.status,
        member_count: memberCount || 0
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
        .select('family_id, role, status')
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .eq('status', 'active')
        .single();

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          return { is_member: false };
        }
        throw memberError;
      }

      if (!memberData) {
        return { is_member: false };
      }

      // Get family details separately
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id, family_name, description, currency_pref')
        .eq('id', familyId)
        .single();

      if (familyError) {
        console.warn('Error fetching family details:', familyError);
      }

      return {
        is_member: true,
        family_id: memberData.family_id,
        family_name: familyData?.family_name || 'Unknown Family',
        description: familyData?.description || '',
        currency_pref: familyData?.currency_pref || 'PHP',
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
   * Remove a family member (enhanced with owner permissions)
   */
  async removeFamilyMember(familyId: string, userId: string, adminUserId: string): Promise<void> {
    try {
      // Get family and requesting user information
      const [familyResult, adminMemberResult] = await Promise.all([
        supabase
          .from('families')
          .select('created_by')
          .eq('id', familyId)
          .single(),
        supabase
          .from('family_members')
          .select('role')
          .eq('family_id', familyId)
          .eq('user_id', adminUserId)
          .eq('status', 'active')
          .single()
      ]);

      if (familyResult.error) {
        throw new Error('Family not found');
      }

      if (adminMemberResult.error) {
        throw new Error('You are not an active member of this family');
      }

      const isOwner = familyResult.data.created_by === adminUserId;
      const isAdmin = adminMemberResult.data.role === 'admin';

      // Check permissions: Only owners and admins can remove members
      if (!isOwner && !isAdmin) {
        throw new Error('Only family owners and admins can remove members');
      }

      // Prevent removing the family owner
      if (familyResult.data.created_by === userId) {
        throw new Error('Cannot remove the family owner. Transfer ownership first');
      }

      // Prevent self-removal (users should leave family instead)
      if (adminUserId === userId) {
        throw new Error('You cannot remove yourself. Use the leave family option instead');
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
   * Leave family (for current user)
   */
  async leaveFamily(familyId: string, userId: string): Promise<void> {
    try {
      // Get family and user information
      const [familyResult, memberResult] = await Promise.all([
        supabase
          .from('families')
          .select('created_by')
          .eq('id', familyId)
          .single(),
        supabase
          .from('family_members')
          .select('role, status')
          .eq('family_id', familyId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()
      ]);

      if (familyResult.error) {
        throw new Error('Family not found');
      }

      if (memberResult.error) {
        throw new Error('You are not an active member of this family');
      }

      // Prevent family owner from leaving (must transfer ownership first)
      if (familyResult.data.created_by === userId) {
        throw new Error('Family owners cannot leave the family. Transfer ownership to another member first');
      }

      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to leave family: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in leaveFamily:', error);
      throw error;
    }
  }

  /**
   * Update member features/permissions
   */
  async updateMemberFeatures(
    familyId: string,
    userId: string,
    features: {
      can_create_goals?: boolean;
      can_view_budgets?: boolean;
      can_contribute_goals?: boolean;
    },
    adminUserId: string
  ): Promise<void> {
    try {
      // Check if requesting user has permission (owner or admin)
      const permissions = await this.canManageRoles(familyId, adminUserId);
      if (!permissions.canManage) {
        throw new Error('Only family owners and admins can manage member features');
      }

      const { error } = await supabase
        .from('family_members')
        .update({
          ...features,
          updated_at: new Date().toISOString()
        })
        .eq('family_id', familyId)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        throw new Error(`Failed to update member features: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updateMemberFeatures:', error);
      throw error;
    }
  }

  /**
   * Update member role (enhanced with owner permissions)
   */
  async updateMemberRole(
    familyId: string, 
    userId: string, 
    newRole: string, 
    adminUserId: string
  ): Promise<void> {
    try {
      // Use the enhanced RPC function for role reassignment
      const { error } = await supabase.rpc('reassign_member_role', {
        p_family_id: familyId,
        p_member_user_id: userId,
        p_new_role: newRole,
        p_requesting_user_id: adminUserId
      });

      if (error) {
        console.error('RPC error in reassign_member_role:', error);
        throw new Error(`Failed to update member role: ${error.message}`);
      }
      
      console.log(`Successfully updated role for user ${userId} to ${newRole}`);
    } catch (error) {
      console.error('Error in updateMemberRole:', error);
      throw error;
    }
  }

  /**
   * Transfer family ownership to another member
   */
  async transferOwnership(
    familyId: string,
    newOwnerUserId: string,
    currentOwnerUserId: string
  ): Promise<void> {
    try {
      // Use the RPC function for ownership transfer
      const { error } = await supabase.rpc('transfer_family_ownership', {
        p_family_id: familyId,
        p_new_owner_user_id: newOwnerUserId,
        p_current_owner_user_id: currentOwnerUserId
      });

      if (error) {
        console.error('RPC error in transfer_family_ownership:', error);
        throw new Error(`Failed to transfer ownership: ${error.message}`);
      }
      
      console.log(`Successfully transferred ownership of family ${familyId} from ${currentOwnerUserId} to ${newOwnerUserId}`);
    } catch (error) {
      console.error('Error in transferOwnership:', error);
      throw error;
    }
  }

  /**
   * Check if user can manage roles (is owner or admin) with detailed restrictions
   */
  async canManageRoles(familyId: string, userId: string): Promise<{ canManage: boolean; isOwner: boolean; role?: string; restrictions?: string[] }> {
    try {
      // Get family and member information
      const [familyResult, memberResult] = await Promise.all([
        supabase
          .from('families')
          .select('created_by')
          .eq('id', familyId)
          .single(),
        supabase
          .from('family_members')
          .select('role, status')
          .eq('family_id', familyId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()
      ]);

      if (familyResult.error || memberResult.error) {
        return { canManage: false, isOwner: false };
      }

      const isOwner = familyResult.data.created_by === userId;
      const userRole = memberResult.data.role;
      const isAdmin = userRole === 'admin';
      const canManage = isOwner || isAdmin;

      // Define restrictions based on role
      const restrictions: string[] = [];
      
      if (userRole === 'member') {
        restrictions.push('Members cannot manage family roles');
        restrictions.push('Only owners and admins can assign roles');
      } else if (userRole === 'viewer') {
        restrictions.push('Viewers cannot manage family roles');
        restrictions.push('Only owners and admins can assign roles');
      } else if (isAdmin && !isOwner) {
        restrictions.push('Admin role cannot manage the family owner');
        restrictions.push('Cannot assign ownership or transfer ownership');
        restrictions.push('Can only manage admin, member, and viewer roles');
      }

      return {
        canManage,
        isOwner,
        role: userRole,
        restrictions: restrictions.length > 0 ? restrictions : undefined
      };
    } catch (error) {
      console.error('Error in canManageRoles:', error);
      return { canManage: false, isOwner: false };
    }
  }

  /**
   * Get all family members with user profiles
   */
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      // Get family members with more detailed selection
      const { data: members, error: membersError } = await supabase
        .from('family_members')
        .select(`
          id,
          family_id,
          user_id,
          role,
          status,
          can_create_goals,
          can_view_budgets,
          can_contribute_goals,
          invited_by,
          invited_at,
          joined_at,
          created_at,
          updated_at
        `)
        .eq('family_id', familyId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (membersError) {
        console.error('Error fetching family members:', membersError);
        throw new Error(`Failed to get family members: ${membersError.message}`);
      }

      if (!members || members.length === 0) {
        console.log('No active family members found for family:', familyId);
        return [];
      }

      console.log('Found family members:', members.length, 'for family:', familyId);

      // Get user profiles from profiles table
      const memberUserIds = members.map(member => member.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at, updated_at')
        .in('id', memberUserIds);

      if (profilesError) {
        console.warn('Error fetching user profiles:', profilesError);
        // Continue with basic member data
      }

      console.log('Found profiles:', profiles?.length || 0, 'for', memberUserIds.length, 'members');

      // Get current authenticated user to use their metadata for display (like sidebar does)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Combine member and profile data
      const enhancedMembers: FamilyMember[] = members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        
        // Use the same logic as sidebar for name display
        let displayName = 'Unknown User';
        let displayEmail = '';
        let displayAvatar = '';
        
        // If this is the current authenticated user, use their auth metadata (like sidebar)
        if (currentUser && member.user_id === currentUser.id) {
          displayName = currentUser.user_metadata?.full_name || 
                       currentUser.email?.split('@')[0] || 
                       "User";
          displayEmail = currentUser.email || '';
          displayAvatar = currentUser.user_metadata?.avatar_url || '../images/placeholder.png';
        } else {
          // For other users, use profile data with email fallback (same pattern as sidebar)
          displayName = profile?.full_name || 
                       profile?.email?.split('@')[0] || 
                       'Unknown User';
          displayEmail = profile?.email || '';
          displayAvatar = profile?.avatar_url || '../images/placeholder.png';
        }
        
        const enhancedMember: FamilyMember = {
          id: member.id,
          family_id: member.family_id,
          user_id: member.user_id,
          role: member.role as 'admin' | 'member' | 'viewer',
          status: member.status as 'active' | 'pending' | 'inactive' | 'removed',
          created_at: member.created_at,
          updated_at: member.updated_at || member.created_at,
          joined_at: member.joined_at || member.created_at,
          user: {
            id: member.user_id,
            email: displayEmail,
            created_at: profile?.created_at || member.created_at,
            updated_at: profile?.updated_at || profile?.created_at || member.updated_at || member.created_at,
            full_name: displayName,
            avatar_url: displayAvatar
          },
          email: displayEmail,
          full_name: displayName,
          avatar_url: displayAvatar,
          // Add additional fields from family_members table
          can_create_goals: member.can_create_goals,
          can_view_budgets: member.can_view_budgets,
          can_contribute_goals: member.can_contribute_goals,
          invited_by: member.invited_by,
          invited_at: member.invited_at
        };
        
        console.log('Enhanced member:', {
          id: enhancedMember.id,
          name: enhancedMember.full_name,
          role: enhancedMember.role,
          email: enhancedMember.email,
          isCurrentUser: currentUser && member.user_id === currentUser.id
        });
        
        return enhancedMember;
      });

      console.log('Returning', enhancedMembers.length, 'enhanced family members with proper name display');
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
      // Use direct queries only to avoid RPC function issues
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
            .select('email, full_name')
            .eq('id', family.created_by)
            .single();

          return {
            ...family,
            member_count: memberCount || 0,
            creator_name: creator?.full_name || 
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