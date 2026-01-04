-- Safe User Deletion Script
-- This script will delete a user and all their related data
-- Replace the email below with the user you want to delete

DO $$
DECLARE
  target_user_id UUID;
  user_email TEXT := 'kcpersonalacc@gmail.com';
BEGIN
  -- Get the user ID
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User % not found', user_email;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Deleting user: % (ID: %)', user_email, target_user_id;
  
  -- Delete in order of dependencies (leaf nodes first)
  
  -- 1. Delete AI and analytics data
  RAISE NOTICE 'Deleting AI and analytics data...';
  DELETE FROM ai_response_analytics WHERE message_id IN (SELECT id FROM chat_messages WHERE user_id = target_user_id);
  DELETE FROM chat_messages WHERE user_id = target_user_id;
  DELETE FROM chat_sessions WHERE user_id = target_user_id;
  DELETE FROM user_chat_preferences WHERE user_id = target_user_id;
  DELETE FROM ai_insights WHERE user_id = target_user_id;
  DELETE FROM prophet_predictions WHERE user_id = target_user_id;
  DELETE FROM prediction_requests WHERE user_id = target_user_id;
  DELETE FROM prediction_usage_limits WHERE user_id = target_user_id;
  
  -- 2. Delete dashboard data
  RAISE NOTICE 'Deleting dashboard data...';
  DELETE FROM user_widget_instances WHERE user_id = target_user_id;
  DELETE FROM dashboard_insights WHERE user_id = target_user_id;
  DELETE FROM dashboard_layouts WHERE user_id = target_user_id;
  DELETE FROM widget_data_cache WHERE user_id = target_user_id;
  
  -- 3. Delete budget data
  RAISE NOTICE 'Deleting budget data...';
  DELETE FROM budget_alerts WHERE user_id = target_user_id;
  DELETE FROM budget_categories WHERE budget_id IN (SELECT id FROM budgets WHERE user_id = target_user_id);
  DELETE FROM budgets WHERE user_id = target_user_id;
  
  -- 4. Delete goal data
  RAISE NOTICE 'Deleting goal data...';
  DELETE FROM goal_contributions WHERE user_id = target_user_id;
  DELETE FROM goals WHERE user_id = target_user_id;
  
  -- 5. Delete transactions (must be before accounts due to FK)
  RAISE NOTICE 'Deleting transactions...';
  DELETE FROM transactions WHERE user_id = target_user_id;
  
  -- 6. Delete categories and accounts
  RAISE NOTICE 'Deleting categories and accounts...';
  DELETE FROM income_categories WHERE user_id = target_user_id;
  DELETE FROM expense_categories WHERE user_id = target_user_id;
  DELETE FROM accounts WHERE user_id = target_user_id;
  
  -- 7. Delete family relationships
  RAISE NOTICE 'Deleting family relationships...';
  DELETE FROM family_members WHERE user_id = target_user_id;
  DELETE FROM family_invitations WHERE invited_by = target_user_id;
  DELETE FROM family_join_requests WHERE user_id = target_user_id;
  
  -- 8. Delete settings and preferences
  RAISE NOTICE 'Deleting settings and preferences...';
  DELETE FROM user_settings WHERE user_id = target_user_id;
  DELETE FROM user_preferences_cache WHERE user_id = target_user_id;
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- 9. Delete auth-related data
  RAISE NOTICE 'Deleting auth data...';
  DELETE FROM verification_tokens WHERE user_id = target_user_id;
  DELETE FROM user_sessions WHERE user_id = target_user_id;
  
  -- 10. Delete profile
  RAISE NOTICE 'Deleting profile...';
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- 11. Finally delete from auth.users
  RAISE NOTICE 'Deleting from auth.users...';
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RAISE NOTICE 'User % successfully deleted!', user_email;
  
END $$;
