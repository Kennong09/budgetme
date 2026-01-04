import { supabase } from '../../utils/supabaseClient';

export interface GoalContributionAuditData {
  contribution_id: string;
  goal_id: string;
  goal_name: string;
  account_id: string;
  account_name?: string;
  transaction_id?: string;
  amount: number;
  contribution_type: 'manual' | 'automatic' | 'transfer';
  notes?: string;
  contribution_date: string;
  [key: string]: any;
}

export interface GoalContributionUpdateData {
  old_values: Partial<GoalContributionAuditData>;
  new_values: Partial<GoalContributionAuditData>;
  changes: Record<string, { old: any; new: any }>;
}

export class GoalContributionAuditService {
  
  /**
   * Log goal contribution creation activity
   */
  static async logContributionCreated(
    userId: string,
    contributionData: GoalContributionAuditData,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    
    try {
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'goal_contribution_created',
          activity_description: `Goal contribution made: ₱${contributionData.amount.toFixed(2)} to "${contributionData.goal_name}"${contributionData.notes ? ` - ${contributionData.notes}` : ''}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          metadata: {
            contribution_id: contributionData.contribution_id,
            goal_id: contributionData.goal_id,
            goal_name: contributionData.goal_name,
            account_id: contributionData.account_id,
            account_name: contributionData.account_name,
            transaction_id: contributionData.transaction_id,
            amount: contributionData.amount,
            contribution_type: contributionData.contribution_type,
            notes: contributionData.notes,
            contribution_date: contributionData.contribution_date,
            created_via: 'goal_contribution_form'
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging goal contribution creation:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging goal contribution creation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log goal contribution update activity
   */
  static async logContributionUpdated(
    userId: string,
    contributionId: string,
    updateData: GoalContributionUpdateData,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    
    try {
      // Build change description
      const changesList = Object.entries(updateData.changes).map(([field, change]) => {
        const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (field === 'amount') {
          return `${fieldLabel}: ₱${change.old} → ₱${change.new}`;
        }
        return `${fieldLabel}: "${change.old}" → "${change.new}"`;
      });
      
      const changesText = changesList.join(', ');
      const goalName = updateData.new_values.goal_name || updateData.old_values.goal_name;
      
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'goal_contribution_updated',
          activity_description: `Goal contribution to "${goalName}" updated: ${changesText}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          metadata: {
            contribution_id: contributionId,
            goal_id: updateData.new_values.goal_id || updateData.old_values.goal_id,
            goal_name: goalName,
            account_id: updateData.new_values.account_id || updateData.old_values.account_id,
            account_name: updateData.new_values.account_name || updateData.old_values.account_name,
            old_values: updateData.old_values,
            new_values: updateData.new_values,
            changes: updateData.changes,
            updated_via: 'goal_contribution_form'
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging goal contribution update:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging goal contribution update:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log goal contribution deletion activity
   */
  static async logContributionDeleted(
    userId: string,
    contributionData: GoalContributionAuditData,
    reason?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    
    try {
      const { error } = await supabase
        .from('system_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'goal_contribution_deleted',
          activity_description: `Goal contribution deleted: ₱${contributionData.amount.toFixed(2)} to "${contributionData.goal_name}"${reason ? ` (${reason})` : ''}`,
          ip_address: ipAddress || null,
          user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          metadata: {
            contribution_id: contributionData.contribution_id,
            goal_id: contributionData.goal_id,
            goal_name: contributionData.goal_name,
            account_id: contributionData.account_id,
            account_name: contributionData.account_name,
            transaction_id: contributionData.transaction_id,
            amount: contributionData.amount,
            contribution_type: contributionData.contribution_type,
            notes: contributionData.notes,
            contribution_date: contributionData.contribution_date,
            deletion_reason: reason,
            deleted_via: 'goal_contribution_interface'
          },
          severity: 'info',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging goal contribution deletion:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception logging goal contribution deletion:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get goal contribution-related audit history for a specific account
   */
  static async getContributionHistory(
    userId: string,
    accountId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      goalId?: string;
    } = {}
  ): Promise<{ 
    success: boolean; 
    data?: any[]; 
    totalCount?: number;
    error?: string 
  }> {
    
    try {
      const { 
        limit = 50, 
        offset = 0, 
        startDate, 
        endDate, 
        goalId
      } = options;

      let query = supabase
        .from('system_activity_log')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .in('activity_type', ['goal_contribution_created', 'goal_contribution_updated', 'goal_contribution_deleted'])
        .contains('metadata', { account_id: accountId })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (goalId) {
        query = query.contains('metadata', { goal_id: goalId });
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching goal contribution history:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: data || [], 
        totalCount: count || 0 
      };
    } catch (error) {
      console.error('Exception fetching goal contribution history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Utility method to extract contribution data from various sources
   */
  static extractContributionAuditData(
    contribution: any,
    goal?: any,
    account?: any,
    transaction?: any
  ): GoalContributionAuditData {
    return {
      contribution_id: contribution.id,
      goal_id: contribution.goal_id || goal?.id,
      goal_name: goal?.goal_name || 'Unknown Goal',
      account_id: contribution.source_account_id || account?.id,
      account_name: account?.account_name,
      transaction_id: contribution.transaction_id || transaction?.id,
      amount: contribution.amount,
      contribution_type: contribution.contribution_type || 'manual',
      notes: contribution.notes,
      contribution_date: contribution.contribution_date || contribution.created_at
    };
  }
}
