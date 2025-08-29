import { supabase } from '../../utils/supabaseClient';

// Types for join request operations
export interface FamilyJoinRequest {
  id: string;
  family_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface JoinRequestWithDetails extends FamilyJoinRequest {
  family_name?: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
}

export interface CreateJoinRequestData {
  family_id: string;
  message?: string;
}

class JoinRequestService {
  /**
   * Create a join request for a public family
   */
  async createJoinRequest(data: CreateJoinRequestData, userId: string): Promise<FamilyJoinRequest> {
    try {
      // 1. Verify family exists and is public
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('id, family_name, is_public')
        .eq('id', data.family_id)
        .single();

      if (familyError || !family) {
        throw new Error('Family not found');
      }

      if (!family.is_public) {
        throw new Error('This family is not accepting join requests');
      }

      // 2. Check if user is already a member of any family
      const { data: existingMembership, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id, status')
        .eq('user_id', userId)
        .in('status', ['active', 'pending'])
        .limit(1);

      if (!membershipError && existingMembership && existingMembership.length > 0) {
        throw new Error('You are already a member of a family');
      }

      // 3. Check for existing pending request
      const { data: existingRequest, error: requestError } = await supabase
        .from('family_join_requests')
        .select('id, status')
        .eq('family_id', data.family_id)
        .eq('user_id', userId)
        .single();

      if (!requestError && existingRequest) {
        if (existingRequest.status === 'pending') {
          throw new Error('You already have a pending request to join this family');
        } else if (existingRequest.status === 'approved') {
          throw new Error('You are already approved to join this family');
        }
      }

      // 4. Create join request
      const { data: request, error: createError } = await supabase
        .from('family_join_requests')
        .insert({
          family_id: data.family_id,
          user_id: userId,
          status: 'pending',
          message: data.message || ''
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create join request: ${createError.message}`);
      }

      // 5. Notify family admins (placeholder for future implementation)
      try {
        await this.notifyFamilyAdmins(data.family_id, userId);
      } catch (notificationError) {
        console.warn('Failed to notify family admins:', notificationError);
        // Don't fail the request creation if notification fails
      }

      return request;
    } catch (error) {
      console.error('Error in createJoinRequest:', error);
      throw error;
    }
  }

  /**
   * Approve a join request (by family admin)
   */
  async approveJoinRequest(requestId: string, adminUserId: string, role: string = 'viewer'): Promise<void> {
    try {
      // 1. Get request details
      const { data: request, error: requestError } = await supabase
        .from('family_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        throw new Error('Join request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('This request has already been processed');
      }

      // 2. Verify admin has permission
      const { data: adminMember, error: adminError } = await supabase
        .from('family_members')
        .select('role, status')
        .eq('family_id', request.family_id)
        .eq('user_id', adminUserId)
        .eq('status', 'active')
        .single();

      if (adminError || !adminMember || adminMember.role !== 'admin') {
        throw new Error('Only family admins can approve join requests');
      }

      // 3. Check if user is still eligible (not in another family)
      const { data: existingMembership, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', request.user_id)
        .eq('status', 'active')
        .limit(1);

      if (!membershipError && existingMembership && existingMembership.length > 0) {
        // Update request to denied since user is already in a family
        await supabase
          .from('family_join_requests')
          .update({
            status: 'denied',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        throw new Error('User is already a member of another family');
      }

      // 4. Use RPC function to approve atomically
      const { error: approveError } = await supabase.rpc('approve_join_request', {
        p_request_id: requestId,
        p_role: role
      });

      if (approveError) {
        throw new Error(`Failed to approve join request: ${approveError.message}`);
      }

      // 5. Send approval notification
      try {
        await this.sendApprovalNotification(request.family_id, request.user_id);
      } catch (notificationError) {
        console.warn('Failed to send approval notification:', notificationError);
        // Don't fail the approval if notification fails
      }
    } catch (error) {
      console.error('Error in approveJoinRequest:', error);
      throw error;
    }
  }

  /**
   * Deny a join request (by family admin)
   */
  async denyJoinRequest(requestId: string, adminUserId: string): Promise<void> {
    try {
      // 1. Get request details
      const { data: request, error: requestError } = await supabase
        .from('family_join_requests')
        .select('family_id, user_id, status')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        throw new Error('Join request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('This request has already been processed');
      }

      // 2. Verify admin has permission
      const { data: adminMember, error: adminError } = await supabase
        .from('family_members')
        .select('role')
        .eq('family_id', request.family_id)
        .eq('user_id', adminUserId)
        .eq('status', 'active')
        .single();

      if (adminError || !adminMember || adminMember.role !== 'admin') {
        throw new Error('Only family admins can deny join requests');
      }

      // 3. Update request status
      const { error: updateError } = await supabase
        .from('family_join_requests')
        .update({
          status: 'denied',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        throw new Error(`Failed to deny join request: ${updateError.message}`);
      }

      // 4. Send denial notification
      try {
        await this.sendDenialNotification(request.family_id, request.user_id);
      } catch (notificationError) {
        console.warn('Failed to send denial notification:', notificationError);
        // Don't fail the denial if notification fails
      }
    } catch (error) {
      console.error('Error in denyJoinRequest:', error);
      throw error;
    }
  }

  /**
   * Cancel a join request (by the requester)
   */
  async cancelJoinRequest(requestId: string, userId: string): Promise<void> {
    try {
      // 1. Verify request belongs to user
      const { data: request, error: requestError } = await supabase
        .from('family_join_requests')
        .select('user_id, status')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        throw new Error('Join request not found');
      }

      if (request.user_id !== userId) {
        throw new Error('You can only cancel your own join requests');
      }

      if (request.status !== 'pending') {
        throw new Error('This request cannot be cancelled');
      }

      // 2. Update request status
      const { error: updateError } = await supabase
        .from('family_join_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        throw new Error(`Failed to cancel join request: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Error in cancelJoinRequest:', error);
      throw error;
    }
  }

  /**
   * Get join requests for a family (for family admins)
   */
  async getFamilyJoinRequests(familyId: string, adminUserId: string): Promise<JoinRequestWithDetails[]> {
    try {
      // 1. Verify user is family admin
      const { data: adminMember, error: adminError } = await supabase
        .from('family_members')
        .select('role')
        .eq('family_id', familyId)
        .eq('user_id', adminUserId)
        .eq('status', 'active')
        .single();

      if (adminError || !adminMember || adminMember.role !== 'admin') {
        throw new Error('Only family admins can view join requests');
      }

      // 2. Get join requests
      const { data: requests, error: requestsError } = await supabase
        .from('family_join_requests')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (requestsError) {
        throw new Error(`Failed to get join requests: ${requestsError.message}`);
      }

      if (!requests || requests.length === 0) {
        return [];
      }

      // 3. Get user details for each request
      const userIds = requests.map(req => req.user_id);
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, user_metadata')
        .in('id', userIds);

      if (usersError) {
        console.warn('Error fetching user details:', usersError);
      }

      // 4. Get family name
      const { data: family } = await supabase
        .from('families')
        .select('family_name')
        .eq('id', familyId)
        .single();

      // 5. Combine data
      const enhancedRequests: JoinRequestWithDetails[] = requests.map(request => {
        const user = users?.find(u => u.id === request.user_id);
        return {
          ...request,
          family_name: family?.family_name,
          user_name: user?.user_metadata?.username || 
                    user?.user_metadata?.full_name || 
                    user?.email?.split('@')[0] || 
                    'Unknown',
          user_email: user?.email,
          user_avatar: user?.user_metadata?.avatar_url
        };
      });

      return enhancedRequests;
    } catch (error) {
      console.error('Error in getFamilyJoinRequests:', error);
      throw error;
    }
  }

  /**
   * Get join requests by user (for user's dashboard)
   */
  async getUserJoinRequests(userId: string): Promise<JoinRequestWithDetails[]> {
    try {
      // 1. Get user's join requests
      const { data: requests, error: requestsError } = await supabase
        .from('family_join_requests')
        .select(`
          *,
          families (
            family_name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (requestsError) {
        throw new Error(`Failed to get join requests: ${requestsError.message}`);
      }

      if (!requests || requests.length === 0) {
        return [];
      }

      // 2. Transform data
      const enhancedRequests: JoinRequestWithDetails[] = requests.map(request => ({
        ...request,
        family_name: (request.families as any)?.family_name
      }));

      return enhancedRequests;
    } catch (error) {
      console.error('Error in getUserJoinRequests:', error);
      throw error;
    }
  }

  /**
   * Get pending join requests count for a family
   */
  async getPendingRequestsCount(familyId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('family_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .eq('status', 'pending');

      if (error) {
        console.warn('Error getting pending requests count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getPendingRequestsCount:', error);
      return 0;
    }
  }

  /**
   * Cleanup old join requests
   */
  async cleanupOldRequests(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('family_join_requests')
        .delete()
        .in('status', ['denied', 'cancelled'])
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        throw new Error(`Failed to cleanup old requests: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in cleanupOldRequests:', error);
      throw error;
    }
  }

  /**
   * Notify family admins about new join request (placeholder)
   */
  private async notifyFamilyAdmins(familyId: string, requesterId: string): Promise<void> {
    // TODO: Implement notification system
    console.log('Family admin notification would be sent here:', {
      familyId,
      requesterId
    });
  }

  /**
   * Send approval notification (placeholder)
   */
  private async sendApprovalNotification(familyId: string, userId: string): Promise<void> {
    // TODO: Implement notification system
    console.log('Approval notification would be sent here:', {
      familyId,
      userId
    });
  }

  /**
   * Send denial notification (placeholder)
   */
  private async sendDenialNotification(familyId: string, userId: string): Promise<void> {
    // TODO: Implement notification system
    console.log('Denial notification would be sent here:', {
      familyId,
      userId
    });
  }
}

// Export singleton instance
export const joinRequestService = new JoinRequestService();
export default joinRequestService;