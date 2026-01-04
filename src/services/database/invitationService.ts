import { supabase } from '../../utils/supabaseClient';

// Types for invitation operations
export interface FamilyInvitation {
  id: string;
  family_id: string;
  invited_by: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  message?: string;
  invitation_token: string;
  expires_at: string;
  created_at: string;
}

export interface InvitationData {
  family_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  message?: string;
}

export interface InvitationWithDetails extends FamilyInvitation {
  family_name?: string;
  inviter_name?: string;
  inviter_email?: string;
}

// Enhanced error classification system
export enum InvitationErrorType {
  USER_NOT_REGISTERED = 'USER_NOT_REGISTERED',
  USER_ALREADY_INVITED = 'USER_ALREADY_INVITED',
  USER_ALREADY_MEMBER = 'USER_ALREADY_MEMBER',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export interface ClassifiedError {
  type: InvitationErrorType;
  message: string;
  userMessage: string;
  canRetry: boolean;
  suggestedAction?: string;
}

class InvitationService {
  /**
   * Classify errors for better user experience
   */
  private classifyError(error: any): ClassifiedError {
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code;
    
    // User not registered patterns
    if (errorMessage.includes('not registered') || 
        errorMessage.includes('create an account') ||
        errorMessage.includes('User with this email address is not registered')) {
      return {
        type: InvitationErrorType.USER_NOT_REGISTERED,
        message: errorMessage,
        userMessage: 'This email address is not registered with BudgetMe. Please ask them to create an account first.',
        canRetry: false,
        suggestedAction: 'Ask the user to register at BudgetMe before sending an invitation.'
      };
    }
    
    // Already invited patterns
    if (errorMessage.includes('already invited') || 
        errorMessage.includes('already been sent')) {
      return {
        type: InvitationErrorType.USER_ALREADY_INVITED,
        message: errorMessage,
        userMessage: 'An invitation has already been sent to this email address.',
        canRetry: false,
        suggestedAction: 'Check your sent invitations or wait for the user to respond.'
      };
    }
    
    // Already member patterns
    if (errorMessage.includes('already part of a family') || 
        errorMessage.includes('already a member')) {
      return {
        type: InvitationErrorType.USER_ALREADY_MEMBER,
        message: errorMessage,
        userMessage: 'This user is already a member of another family. Users can only belong to one family at a time.',
        canRetry: false,
        suggestedAction: 'The user must leave their current family before joining yours.'
      };
    }
    
    // Permission errors
    if (errorMessage.includes('permission') || 
        errorMessage.includes('not authorized') || 
        errorMessage.includes('admin') ||
        errorCode === '42501') {
      return {
        type: InvitationErrorType.PERMISSION_DENIED,
        message: errorMessage,
        userMessage: 'You do not have permission to invite members to this family.',
        canRetry: false,
        suggestedAction: 'Contact a family admin to send invitations.'
      };
    }
    
    // Database function errors
    if (errorMessage.includes('function not found') || 
        errorCode === '42883') {
      return {
        type: InvitationErrorType.DATABASE_ERROR,
        message: errorMessage,
        userMessage: 'System configuration issue. Please contact support.',
        canRetry: true,
        suggestedAction: 'Try again in a few minutes or contact support if the issue persists.'
      };
    }
    
    // Verification failures
    if (errorMessage.includes('verification failed') || 
        errorMessage.includes('Unable to verify')) {
      return {
        type: InvitationErrorType.VERIFICATION_FAILED,
        message: errorMessage,
        userMessage: 'There was an issue verifying the user. Please check the email address and try again.',
        canRetry: true,
        suggestedAction: 'Double-check the email address and try again in a moment.'
      };
    }
    
    // Validation errors
    if (errorMessage.includes('invalid') || 
        errorMessage.includes('format') ||
        errorMessage.includes('validation')) {
      return {
        type: InvitationErrorType.VALIDATION_ERROR,
        message: errorMessage,
        userMessage: 'Please check your input and try again.',
        canRetry: true,
        suggestedAction: 'Verify the email format and all required fields.'
      };
    }
    
    // System/Server errors
    if (errorMessage.includes('Internal Server Error') || 
        errorMessage.includes('500') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network')) {
      return {
        type: InvitationErrorType.SYSTEM_ERROR,
        message: errorMessage,
        userMessage: 'A temporary system issue occurred. Please try again in a moment.',
        canRetry: true,
        suggestedAction: 'Wait a few minutes and try again. Contact support if the issue persists.'
      };
    }
    
    // Default classification
    return {
      type: InvitationErrorType.SYSTEM_ERROR,
      message: errorMessage,
      userMessage: `An unexpected error occurred: ${errorMessage}`,
      canRetry: true,
      suggestedAction: 'Try again or contact support if the issue persists.'
    };
  }
  /**
   * Generate a unique invitation token
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Send an invitation to join a family with enhanced error handling
   */
  async sendInvitation(data: InvitationData, inviterId: string): Promise<FamilyInvitation> {
    try {
      console.log('Starting enhanced invitation process:', { 
        familyId: data.family_id, 
        inviteeEmail: data.email, 
        inviterId, 
        role: data.role 
      });
      
      return await this.sendInvitationAttempt(data, inviterId);
    } catch (error) {
      console.error('Error in sendInvitation:', error);
      
      // Classify the error for better user experience
      const classifiedError = this.classifyError(error);
      console.log('Error classified as:', classifiedError);
      
      // Create an enhanced error with classification info
      const enhancedError = new Error(classifiedError.userMessage);
      (enhancedError as any).classification = classifiedError;
      (enhancedError as any).originalError = error;
      
      throw enhancedError;
    }
  }
  
  private async sendInvitationAttempt(data: InvitationData, inviterId: string): Promise<FamilyInvitation> {
    try {
      
      // 1. Verify inviter has admin permissions or is family owner
      const { data: inviterMember, error: inviterError } = await supabase
        .from('family_members')
        .select('role, status')
        .eq('family_id', data.family_id)
        .eq('user_id', inviterId)
        .eq('status', 'active')
        .single();

      // Check if user is family owner if not a member or not an admin
      let canInvite = false;
      if (!inviterError && inviterMember && inviterMember.role === 'admin') {
        canInvite = true;
      } else {
        // Check if user is family owner
        const { data: family, error: familyError } = await supabase
          .from('families')
          .select('created_by')
          .eq('id', data.family_id)
          .single();
        
        if (!familyError && family && family.created_by === inviterId) {
          canInvite = true;
        }
      }

      if (!canInvite) {
        throw new Error('Only family admins and owners can send invitations');
      }

      // 2. Enhanced user verification with fallback mechanism
      console.log('Starting enhanced user verification for email:', data.email);
      
      let existingUser = null;
      let verificationMethod = 'unknown';
      
      // Step 1: Primary RPC verification with enhanced error handling
      try {
        console.log('Step 1: Attempting RPC verification...');
        const { data: userCheckResult, error: rpcError } = await supabase
          .rpc('check_user_exists_by_email', {
            user_email: data.email.trim().toLowerCase() // Normalize email
          });
        
        console.log('RPC user check response:', { 
          userCheckResult, 
          rpcError,
          hasData: !!userCheckResult,
          isArray: Array.isArray(userCheckResult),
          length: userCheckResult?.length
        });
        
        if (rpcError) {
          console.warn('RPC user check failed, will try fallback:', {
            error: rpcError,
            message: rpcError.message,
            code: rpcError.code
          });
          
          // Don't throw immediately, try fallback first
          if (rpcError.code === '42883') {
            console.log('RPC function not found, using fallback verification');
          } else if (rpcError.code === '42501') {
            console.log('RPC permission error, using fallback verification');
          } else {
            console.log('RPC error, using fallback verification:', rpcError.message);
          }
        } else if (userCheckResult && Array.isArray(userCheckResult) && userCheckResult.length > 0) {
          const userResult = userCheckResult[0];
          console.log('Parsed RPC user result:', userResult);
          
          if (userResult && userResult.user_exists && userResult.user_id && userResult.email) {
            existingUser = {
              id: userResult.user_id,
              email: userResult.email,
              full_name: userResult.full_name,
              email_confirmed: userResult.email_confirmed
            };
            verificationMethod = 'rpc_success';
            console.log('User verified via RPC:', existingUser);
          } else {
            console.log('RPC returned user_exists=false, trying fallback verification');
          }
        } else {
          console.log('RPC returned invalid format, trying fallback verification');
        }
      } catch (rpcError) {
        console.warn('RPC verification threw exception, trying fallback:', rpcError);
      }
      
      // Step 2: Fallback verification using direct query
      if (!existingUser) {
        console.log('Step 2: Attempting fallback direct query verification...');
        try {
          // First try to get user from profiles table
          const { data: profileUser, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, email_verified')
            .ilike('email', data.email.trim())
            .single();
          
          if (!profileError && profileUser) {
            existingUser = {
              id: profileUser.id,
              email: profileUser.email,
              full_name: profileUser.full_name,
              email_confirmed: profileUser.email_verified
            };
            verificationMethod = 'fallback_profiles';
            console.log('User verified via profiles fallback:', existingUser);
          } else {
            console.log('Profile lookup failed, trying auth.users (this requires admin access):', profileError?.message);
            
            // Note: Direct auth.users query may fail due to RLS, but worth trying
            // This is mainly for debugging and won't work in production without proper permissions
            console.log('Fallback verification could not access auth.users directly due to RLS policies');
          }
        } catch (fallbackError) {
          console.warn('Fallback verification failed:', fallbackError);
        }
      }
      
      // Step 3: Final validation and error handling
      if (!existingUser) {
        console.error('All verification methods failed for email:', data.email);
        console.log('Verification summary:', {
          email: data.email,
          normalizedEmail: data.email.trim().toLowerCase(),
          rpcAttempted: true,
          fallbackAttempted: true,
          verificationMethod: 'none'
        });
        
        throw new Error('User with this email address is not registered. Please ask them to create an account first.');
      }
      
      // Step 4: Additional validation of found user
      if (!existingUser.id || !existingUser.email) {
        console.error('User data incomplete after verification:', existingUser);
        throw new Error('User data incomplete. Please contact support.');
      }
      
      console.log('User verification complete:', {
        userId: existingUser.id,
        email: existingUser.email,
        verificationMethod,
        emailConfirmed: existingUser.email_confirmed
      });
      
      console.log('Found user for invitation:', { 
        userId: existingUser.id, 
        email: existingUser.email 
      });

      // 3. Check if they're already in a family using a simple approach
      let membershipCheck;
      try {
        membershipCheck = await supabase
          .from('family_members')
          .select('family_id, status')
          .eq('user_id', existingUser.id)
          .in('status', ['active', 'pending']);
        
        console.log('Membership check result:', membershipCheck);
        
        if (membershipCheck.error) {
          console.warn('Membership check error (continuing anyway):', membershipCheck.error);
        } else if (membershipCheck.data && membershipCheck.data.length > 0) {
          console.log('User already has family membership:', membershipCheck.data[0]);
          throw new Error('This user is already part of a family');
        }
      } catch (membershipError) {
        if (membershipError.message === 'This user is already part of a family') {
          throw membershipError; // Re-throw business logic errors
        }
        console.warn('Membership check failed, but continuing with invitation:', membershipError);
        // Continue with invitation process even if membership check fails
      }

      // 4. Check for existing pending invitation
      let invitationCheck;
      try {
        invitationCheck = await supabase
          .from('family_invitations')
          .select('id, status')
          .eq('family_id', data.family_id)
          .ilike('email', data.email)
          .eq('status', 'pending');
        
        console.log('Invitation check result:', invitationCheck);
        
        if (invitationCheck.error) {
          console.warn('Invitation check error (continuing anyway):', invitationCheck.error);
        } else if (invitationCheck.data && invitationCheck.data.length > 0) {
          console.log('Found existing pending invitation:', invitationCheck.data[0]);
          throw new Error('An invitation has already been sent to this email');
        }
      } catch (invitationError) {
        if (invitationError.message === 'An invitation has already been sent to this email') {
          throw invitationError; // Re-throw business logic errors
        }
        console.warn('Invitation check failed, but continuing:', invitationError);
        // Continue with invitation creation even if check fails
      }
      
      console.log('No existing invitation found, proceeding to create new invitation');

      // 5. Create invitation record
      const { data: invitation, error: createError } = await supabase
        .from('family_invitations')
        .insert({
          family_id: data.family_id,
          invited_by: inviterId,
          email: data.email,
          role: data.role,
          message: data.message || '',
          invitation_token: this.generateToken(),
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create invitation:', createError);
        throw new Error(`Failed to create invitation: ${createError.message}`);
      }

      console.log('Invitation created successfully:', { 
        invitationId: invitation.id, 
        email: invitation.email, 
        familyId: invitation.family_id 
      });

      // Invitation created successfully - no notification system

      return invitation;
    } catch (error) {
      console.error('Error in sendInvitationAttempt:', error);
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

      if (user.email !== invitation.email) {
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
        p_invitation_token: invitation.invitation_token,
        p_user_id: userId
      });

      if (acceptError) {
        throw new Error(`Failed to accept invitation: ${acceptError.message}`);
      }

      // Invitation accepted successfully - no notification system
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
        .select('email, status')
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

      if (userError || !user || user.email !== invitation.email) {
        throw new Error('This invitation is not for your account');
      }

      if (invitation.status !== 'pending') {
        throw new Error('This invitation is no longer valid');
      }

      // 3. Update invitation status
      const { error: updateError } = await supabase
        .from('family_invitations')
        .update({
          status: 'declined'
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
          status: 'cancelled'
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
        .eq('email', user.email)
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
        .select('id, email, full_name')
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
          inviter_name: inviter?.full_name || 
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
        .select('id, email, full_name')
        .in('id', inviterIds);

      if (invitersError) {
        console.warn('Error fetching inviter details:', invitersError);
      }

      // Combine data
      const enhancedInvitations: InvitationWithDetails[] = invitations.map(invitation => {
        const inviter = inviters?.find(i => i.id === invitation.invited_by);
        return {
          ...invitation,
          inviter_name: inviter?.full_name || 
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
        .eq('invitation_token', token)
        .single();

      if (error || !invitation) {
        return null;
      }

      // Get inviter details
      const { data: inviter } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', invitation.invited_by)
        .single();

      return {
        ...invitation,
        family_name: (invitation.families as any)?.family_name,
        inviter_name: inviter?.full_name || 
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

}

// Export singleton instance
export const invitationService = new InvitationService();
export default invitationService;