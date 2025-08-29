import { supabase } from '../../utils/supabaseClient';

// Types for invitation operations
export interface FamilyInvitation {
  id: string;
  family_id: string;
  invited_by: string;
  invited_email: string;
  invited_user_id?: string;
  role: 'admin' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  message?: string;
  token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface InvitationData {
  family_id: string;
  invited_email: string;
  role: 'admin' | 'viewer';
  message?: string;
}

export interface InvitationWithDetails extends FamilyInvitation {
  family_name?: string;
  inviter_name?: string;
  inviter_email?: string;
}

class InvitationService {
  /**
   * Send an invitation to join a family
   */
  async sendInvitation(data: InvitationData, inviterId: string): Promise<FamilyInvitation> {
    try {
      // 1. Verify inviter has admin permissions
      const { data: inviterMember, error: inviterError } = await supabase
        .from('family_members')
        .select('role, status')
        .eq('family_id', data.family_id)
        .eq('user_id', inviterId)
        .eq('status', 'active')
        .single();

      if (inviterError || !inviterMember) {
        throw new Error('You are not a member of this family');
      }

      if (inviterMember.role !== 'admin') {
        throw new Error('Only family admins can send invitations');
      }

      // 2. Check if user with email exists
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', data.invited_email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw new Error('Error checking user existence');
      }

      // 3. If user exists, check if they're already in a family
      if (existingUser) {
        const { data: existingMembership, error: membershipError } = await supabase
          .from('family_members')
          .select('family_id, status')
          .eq('user_id', existingUser.id)
          .in('status', ['active', 'pending'])
          .limit(1);

        if (!membershipError && existingMembership && existingMembership.length > 0) {
          throw new Error('This user is already part of a family');
        }
      }

      // 4. Check for existing pending invitation
      const { data: existingInvitation, error: invitationError } = await supabase
        .from('family_invitations')
        .select('id, status')
        .eq('family_id', data.family_id)
        .eq('invited_email', data.invited_email)
        .eq('status', 'pending')
        .single();

      if (!invitationError && existingInvitation) {
        throw new Error('An invitation has already been sent to this email');
      }

      // 5. Create invitation record
      const { data: invitation, error: createError } = await supabase
        .from('family_invitations')
        .insert({
          family_id: data.family_id,
          invited_by: inviterId,
          invited_email: data.invited_email,
          invited_user_id: existingUser?.id || null,
          role: data.role,
          message: data.message || '',
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create invitation: ${createError.message}`);
      }

      // 6. Send notification (if user exists in system)
      if (existingUser) {
        try {
          await this.sendInvitationNotification(invitation, inviterId);
        } catch (notificationError) {
          console.warn('Failed to send invitation notification:', notificationError);
          // Don't fail the invitation creation if notification fails
        }
      }

      return invitation;
    } catch (error) {
      console.error('Error in sendInvitation:', error);
      throw error;
    }
  }

  /**
   * Accept a family invitation
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      // 1. Get invitation details and validate
      const { data: invitation, error: invitationError } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (invitationError || !invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('This invitation is no longer valid');
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('This invitation has expired');
      }

      // 2. Verify user email matches invitation
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      if (user.email !== invitation.invited_email) {
        throw new Error('Email mismatch - this invitation is not for your account');
      }

      // 3. Check if user is already in a family
      const { data: existingMembership, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

      if (!membershipError && existingMembership && existingMembership.length > 0) {
        throw new Error('You are already a member of a family');
      }

      // 4. Use RPC function to accept invitation atomically
      const { error: acceptError } = await supabase.rpc('accept_family_invitation', {
        p_invitation_id: invitationId,
        p_user_id: userId
      });

      if (acceptError) {
        throw new Error(`Failed to accept invitation: ${acceptError.message}`);
      }

      // 5. Send welcome notification
      try {
        await this.sendWelcomeNotification(invitation.family_id, userId);
      } catch (notificationError) {
        console.warn('Failed to send welcome notification:', notificationError);
        // Don't fail the acceptance if notification fails
      }
    } catch (error) {
      console.error('Error in acceptInvitation:', error);
      throw error;
    }
  }

  /**
   * Decline a family invitation
   */
  async declineInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      // 1. Verify invitation belongs to user
      const { data: invitation, error: invitationError } = await supabase
        .from('family_invitations')
        .select('invited_email, status')
        .eq('id', invitationId)
        .single();

      if (invitationError || !invitation) {
        throw new Error('Invitation not found');
      }

      // 2. Verify user email matches
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !user || user.email !== invitation.invited_email) {
        throw new Error('This invitation is not for your account');
      }

      if (invitation.status !== 'pending') {
        throw new Error('This invitation is no longer valid');
      }

      // 3. Update invitation status
      const { error: updateError } = await supabase
        .from('family_invitations')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) {
        throw new Error(`Failed to decline invitation: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Error in declineInvitation:', error);
      throw error;
    }
  }

  /**
   * Cancel an invitation (by inviter)
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      // 1. Verify user is the inviter or has admin permissions
      const { data: invitation, error: invitationError } = await supabase
        .from('family_invitations')
        .select('invited_by, family_id, status')
        .eq('id', invitationId)
        .single();

      if (invitationError || !invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('This invitation cannot be cancelled');
      }

      // Check if user is the inviter
      let canCancel = invitation.invited_by === userId;

      // If not the inviter, check if user is family admin
      if (!canCancel) {
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select('role')
          .eq('family_id', invitation.family_id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        canCancel = !memberError && memberData?.role === 'admin';
      }

      if (!canCancel) {
        throw new Error('You do not have permission to cancel this invitation');
      }

      // 2. Update invitation status
      const { error: updateError } = await supabase
        .from('family_invitations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) {
        throw new Error(`Failed to cancel invitation: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Error in cancelInvitation:', error);
      throw error;
    }
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId: string): Promise<InvitationWithDetails[]> {
    try {
      // Get user email
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return [];
      }

      // Get pending invitations for this email
      const { data: invitations, error: invitationsError } = await supabase
        .from('family_invitations')
        .select(`
          *,
          families (
            family_name
          )
        `)
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (invitationsError) {
        throw new Error(`Failed to get invitations: ${invitationsError.message}`);
      }

      if (!invitations || invitations.length === 0) {
        return [];
      }

      // Get inviter details
      const inviterIds = invitations.map(inv => inv.invited_by);
      const { data: inviters, error: invitersError } = await supabase
        .from('profiles')
        .select('id, email, user_metadata')
        .in('id', inviterIds);

      if (invitersError) {
        console.warn('Error fetching inviter details:', invitersError);
      }

      // Combine data
      const enhancedInvitations: InvitationWithDetails[] = invitations.map(invitation => {
        const inviter = inviters?.find(i => i.id === invitation.invited_by);
        return {
          ...invitation,
          family_name: (invitation.families as any)?.family_name,
          inviter_name: inviter?.user_metadata?.username || 
                       inviter?.user_metadata?.full_name || 
                       inviter?.email?.split('@')[0] || 
                       'Unknown',
          inviter_email: inviter?.email
        };
      });

      return enhancedInvitations;
    } catch (error) {
      console.error('Error in getPendingInvitations:', error);
      throw error;
    }
  }

  /**
   * Get sent invitations for a family
   */
  async getSentInvitations(familyId: string, userId: string): Promise<InvitationWithDetails[]> {
    try {
      // Verify user is family member
      const { data: member, error: memberError } = await supabase
        .from('family_members')
        .select('role')
        .eq('family_id', familyId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (memberError || !member) {
        throw new Error('You are not a member of this family');
      }

      // Get invitations for this family
      const { data: invitations, error: invitationsError } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (invitationsError) {
        throw new Error(`Failed to get invitations: ${invitationsError.message}`);
      }

      if (!invitations || invitations.length === 0) {
        return [];
      }

      // Get inviter details
      const inviterIds = Array.from(new Set(invitations.map(inv => inv.invited_by)));
      const { data: inviters, error: invitersError } = await supabase
        .from('profiles')
        .select('id, email, user_metadata')
        .in('id', inviterIds);

      if (invitersError) {
        console.warn('Error fetching inviter details:', invitersError);
      }

      // Combine data
      const enhancedInvitations: InvitationWithDetails[] = invitations.map(invitation => {
        const inviter = inviters?.find(i => i.id === invitation.invited_by);
        return {
          ...invitation,
          inviter_name: inviter?.user_metadata?.username || 
                       inviter?.user_metadata?.full_name || 
                       inviter?.email?.split('@')[0] || 
                       'Unknown',
          inviter_email: inviter?.email
        };
      });

      return enhancedInvitations;
    } catch (error) {
      console.error('Error in getSentInvitations:', error);
      throw error;
    }
  }

  /**
   * Get invitation by token (for email links)
   */
  async getInvitationByToken(token: string): Promise<InvitationWithDetails | null> {
    try {
      const { data: invitation, error } = await supabase
        .from('family_invitations')
        .select(`
          *,
          families (
            family_name
          )
        `)
        .eq('token', token)
        .single();

      if (error || !invitation) {
        return null;
      }

      // Get inviter details
      const { data: inviter } = await supabase
        .from('profiles')
        .select('email, user_metadata')
        .eq('id', invitation.invited_by)
        .single();

      return {
        ...invitation,
        family_name: (invitation.families as any)?.family_name,
        inviter_name: inviter?.user_metadata?.username || 
                     inviter?.user_metadata?.full_name || 
                     inviter?.email?.split('@')[0] || 
                     'Unknown',
        inviter_email: inviter?.email
      };
    } catch (error) {
      console.error('Error in getInvitationByToken:', error);
      return null;
    }
  }

  /**
   * Cleanup expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('family_invitations')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        throw new Error(`Failed to cleanup expired invitations: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in cleanupExpiredInvitations:', error);
      throw error;
    }
  }

  /**
   * Send invitation notification (placeholder for future implementation)
   */
  private async sendInvitationNotification(invitation: FamilyInvitation, inviterId: string): Promise<void> {
    // TODO: Implement email notification or in-app notification
    // For now, this is a placeholder
    console.log('Invitation notification would be sent here:', {
      invitationId: invitation.id,
      invitedEmail: invitation.invited_email,
      inviterId
    });
  }

  /**
   * Send welcome notification (placeholder for future implementation)
   */
  private async sendWelcomeNotification(familyId: string, userId: string): Promise<void> {
    // TODO: Implement welcome notification
    // For now, this is a placeholder
    console.log('Welcome notification would be sent here:', {
      familyId,
      userId
    });
  }
}

// Export singleton instance
export const invitationService = new InvitationService();
export default invitationService;