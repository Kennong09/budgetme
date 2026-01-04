-- Migration: Add safe user deletion function
-- This function can be called from the Supabase Dashboard SQL Editor or from code

CREATE OR REPLACE FUNCTION delete_user_and_related_data(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_counts JSON;
BEGIN
  -- Store counts before deletion for reporting
  WITH deletion_stats AS (
    SELECT json_build_object(
      'profiles', (SELECT COUNT(*) FROM profiles WHERE id = target_user_id),
      'accounts', (SELECT COUNT(*) FROM accounts WHERE user_id = target_user_id),
      'transactions', (SELECT COUNT(*) FROM transactions WHERE user_id = target_user_id),
      'income_categories', (SELECT COUNT(*) FROM income_categories WHERE user_id = target_user_id),
      'expense_categories', (SELECT COUNT(*) FROM expense_categories WHERE user_id = target_user_id),
      'budgets', (SELECT COUNT(*) FROM budgets WHERE user_id = target_user_id),
      'goals', (SELECT COUNT(*) FROM goals WHERE user_id = target_user_id)
    ) as counts
  )
  SELECT counts INTO deleted_counts FROM deletion_stats;

  -- Delete in dependency order
  
  -- AI & Analytics
  DELETE FROM ai_response_analytics WHERE message_id IN (SELECT id FROM chat_messages WHERE user_id = target_user_id);
  DELETE FROM chat_messages WHERE user_id = target_user_id;
  DELETE FROM chat_sessions WHERE user_id = target_user_id;
  DELETE FROM user_chat_preferences WHERE user_id = target_user_id;
  DELETE FROM ai_insights WHERE user_id = target_user_id;
  DELETE FROM prophet_predictions WHERE user_id = target_user_id;
  DELETE FROM prediction_requests WHERE user_id = target_user_id;
  DELETE FROM prediction_usage_limits WHERE user_id = target_user_id;
  
  -- Dashboard
  DELETE FROM user_widget_instances WHERE user_id = target_user_id;
  DELETE FROM dashboard_insights WHERE user_id = target_user_id;
  DELETE FROM dashboard_layouts WHERE user_id = target_user_id;
  DELETE FROM widget_data_cache WHERE user_id = target_user_id;
  
  -- Budgets
  DELETE FROM budget_alerts WHERE user_id = target_user_id;
  DELETE FROM budget_categories WHERE budget_id IN (SELECT id FROM budgets WHERE user_id = target_user_id);
  DELETE FROM budgets WHERE user_id = target_user_id;
  
  -- Goals
  DELETE FROM goal_contributions WHERE user_id = target_user_id;
  DELETE FROM goals WHERE user_id = target_user_id;
  
  -- Transactions & Accounts
  DELETE FROM transactions WHERE user_id = target_user_id;
  DELETE FROM income_categories WHERE user_id = target_user_id;
  DELETE FROM expense_categories WHERE user_id = target_user_id;
  DELETE FROM accounts WHERE user_id = target_user_id;
  
  -- Family
  DELETE FROM family_members WHERE user_id = target_user_id;
  DELETE FROM family_invitations WHERE invited_by = target_user_id;
  DELETE FROM family_join_requests WHERE user_id = target_user_id;
  
  -- Settings
  DELETE FROM user_settings WHERE user_id = target_user_id;
  DELETE FROM user_preferences_cache WHERE user_id = target_user_id;
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- Auth
  DELETE FROM verification_tokens WHERE user_id = target_user_id;
  DELETE FROM user_sessions WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Finally delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'deleted_counts', deleted_counts,
    'message', 'User and all related data deleted successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'user_id', target_user_id,
    'error', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION delete_user_and_related_data(UUID) IS 
'Safely deletes a user and all their related data. Returns JSON with deletion statistics.';

-- Example usage:
-- SELECT delete_user_and_related_data('user-uuid-here');
-- Or by email:
-- SELECT delete_user_and_related_data((SELECT id FROM auth.users WHERE email = 'user@example.com'));
