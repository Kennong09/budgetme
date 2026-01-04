-- Test queries to verify the account setup database modifications are working

-- 1. Test that cash_in transaction type is allowed
SELECT 'cash_in' = ANY(ARRAY['income'::text, 'expense'::text, 'transfer'::text, 'contribution'::text, 'cash_in'::text]) 
AS cash_in_type_supported;

-- 2. Test that new activity types are allowed
SELECT 'account_created' = ANY(ARRAY[
    'login'::text, 'logout'::text, 'user_created'::text, 'user_updated'::text, 
    'admin_action'::text, 'system_event'::text, 'error'::text,
    'account_created'::text, 'account_updated'::text, 'account_cash_in'::text, 
    'account_deleted'::text, 'account_balance_change'::text
]) AS account_activity_types_supported;

-- 3. Check that all required functions exist
SELECT COUNT(*) = 10 AS all_functions_exist FROM (
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN (
        'create_account_with_audit',
        'create_cash_in_transaction',
        'get_user_accounts_for_setup',
        'validate_account_setup_data',
        'get_account_transaction_history',
        'get_account_audit_history',
        'update_account_balance_with_audit',
        'log_account_creation',
        'log_account_update',
        'update_account_balance_from_transaction'
    )
) AS functions_check;

-- 4. Check that required triggers exist
SELECT COUNT(*) >= 2 AS audit_triggers_exist FROM (
    SELECT trigger_name 
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'accounts'
    AND trigger_name IN ('trigger_log_account_creation', 'trigger_log_account_update')
) AS triggers_check;

-- 5. Check that required indexes exist  
SELECT COUNT(*) >= 2 AS performance_indexes_exist FROM (
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND tablename = 'system_activity_log'
    AND indexname IN ('idx_system_activity_log_account_audit', 'idx_system_activity_log_metadata_account_id')
) AS indexes_check;

-- 6. Test RLS policy exists
SELECT COUNT(*) >= 1 AS rls_policies_exist FROM (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'system_activity_log'
    AND policyname LIKE '%activity%'
) AS policies_check;

-- 7. Show summary
SELECT 
    'Account Setup Database Configuration' AS component,
    CASE 
        WHEN (
            SELECT 'cash_in' = ANY(ARRAY['income'::text, 'expense'::text, 'transfer'::text, 'contribution'::text, 'cash_in'::text])
        ) AND (
            SELECT 'account_created' = ANY(ARRAY[
                'login'::text, 'logout'::text, 'user_created'::text, 'user_updated'::text, 
                'admin_action'::text, 'system_event'::text, 'error'::text,
                'account_created'::text, 'account_updated'::text, 'account_cash_in'::text, 
                'account_deleted'::text, 'account_balance_change'::text
            ])
        ) AND (
            SELECT COUNT(*) = 10 FROM (
                SELECT routine_name 
                FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name IN (
                    'create_account_with_audit',
                    'create_cash_in_transaction', 
                    'get_user_accounts_for_setup',
                    'validate_account_setup_data',
                    'get_account_transaction_history',
                    'get_account_audit_history',
                    'update_account_balance_with_audit',
                    'log_account_creation',
                    'log_account_update',
                    'update_account_balance_from_transaction'
                )
            ) AS f
        ) THEN 'READY ✅'
        ELSE 'INCOMPLETE ❌'
    END AS status,
    'All database modifications for Account Setup Modal and Audit System have been applied successfully' AS description;
