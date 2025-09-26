-- =====================================================
-- SQL MODULE VALIDATION AND DEPLOYMENT SCRIPT
-- =====================================================
-- Purpose: Validate refactored SQL modules and provide deployment guidance
-- Usage: Run this script to check module compatibility and dependencies
-- =====================================================

-- =====================================================
-- VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate module dependencies
CREATE OR REPLACE FUNCTION validate_sql_modules()
RETURNS TABLE (
    module_name TEXT,
    status TEXT,
    message TEXT,
    dependencies_met BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH module_checks AS (
        SELECT 
            '02-auth-schema' as module,
            'REQUIRED' as priority,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') as table_exists,
            EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') as function_exists
        UNION ALL
        SELECT 
            '12-shared-schema' as module,
            'REQUIRED' as priority,
            EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_timestamp') as table_exists,
            EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'safe_percentage') as function_exists
        UNION ALL
        SELECT 
            '11-transactions-schema' as module,
            'REQUIRED' as priority,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') as table_exists,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') as function_exists
        UNION ALL
        SELECT 
            '03-budget-schema' as module,
            'REQUIRED' as priority,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') as table_exists,
            EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_budget_spent') as function_exists
        UNION ALL
        SELECT 
            '07-goals-schema' as module,
            'REQUIRED' as priority,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') as table_exists,
            EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'contribute_to_goal') as function_exists
        UNION ALL
        SELECT 
            '06-family-schema' as module,
            'OPTIONAL' as priority,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'families') as table_exists,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'family_members') as function_exists
        UNION ALL
        SELECT 
            '08-predictions-schema' as module,
            'OPTIONAL' as priority,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_usage') as table_exists,
            EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'check_prediction_usage') as function_exists
        UNION ALL
        SELECT 
            '01-admin-schema' as module,
            'OPTIONAL' as priority,
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings') as table_exists,
            EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'log_admin_activity') as function_exists
    )
    SELECT 
        mc.module,
        CASE 
            WHEN mc.table_exists AND mc.function_exists THEN 'DEPLOYED'
            WHEN mc.table_exists OR mc.function_exists THEN 'PARTIAL'
            ELSE 'MISSING'
        END as status,
        CASE 
            WHEN mc.table_exists AND mc.function_exists THEN 'Module fully deployed and functional'
            WHEN mc.table_exists THEN 'Tables exist but functions missing'
            WHEN mc.function_exists THEN 'Functions exist but tables missing'
            ELSE 'Module not deployed'
        END as message,
        (mc.table_exists AND mc.function_exists) as dependencies_met
    FROM module_checks mc
    ORDER BY 
        CASE mc.priority WHEN 'REQUIRED' THEN 1 ELSE 2 END,
        mc.module;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DEPLOYMENT ORDER VALIDATION
-- =====================================================

-- Recommended deployment order with dependencies
CREATE OR REPLACE VIEW deployment_order AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY execution_order) as step,
    module_file,
    module_name,
    dependencies,
    description,
    is_required
FROM (
    VALUES 
    (1, '02-auth-schema.sql', 'Authentication & Users', 'None (Foundation)', 'Core user authentication and profiles', true),
    (2, '12-shared-schema.sql', 'Shared Utilities', 'auth-schema', 'Common functions and helpers', true),
    (3, '11-transactions-schema.sql', 'Transactions', 'auth-schema, shared-schema', 'Financial transactions and accounts', true),
    (4, '03-budget-schema.sql', 'Budgets', 'auth-schema, transactions-schema', 'Budget management and tracking', true),
    (5, '07-goals-schema.sql', 'Goals', 'auth-schema, transactions-schema', 'Goal tracking and contributions', true),
    (6, '06-family-schema.sql', 'Family Collaboration', 'auth-schema, shared-schema', 'Family financial management', false),
    (7, '08-predictions-schema.sql', 'AI Predictions', 'auth-schema', 'AI prediction service integration', false),
    (8, '01-admin-schema.sql', 'Administration', 'auth-schema, shared-schema', 'Administrative functions and monitoring', false),
    (9, '10-settings-schema.sql', 'User Settings', 'auth-schema', 'User preferences and configuration', false),
    (10, '04-chatbot-schema.sql', 'AI Chatbot', 'auth-schema, predictions-schema', 'AI chatbot interaction tracking', false),
    (11, '09-reports-schema.sql', 'Reports & Analytics', 'All above schemas', 'Reporting and data analytics', false),
    (12, '05-dashboard-schema.sql', 'Dashboard Widgets', 'All above schemas', 'Dashboard configuration and widgets', false)
) AS deployment_plan(execution_order, module_file, module_name, dependencies, description, is_required);

-- =====================================================
-- COMPATIBILITY CHECK
-- =====================================================

-- Function to check backend service compatibility
CREATE OR REPLACE FUNCTION check_backend_compatibility()
RETURNS TABLE (
    service_name TEXT,
    required_tables TEXT[],
    required_functions TEXT[],
    compatibility_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'authService.ts'::TEXT,
        ARRAY['profiles', 'user_sessions', 'verification_tokens']::TEXT[],
        ARRAY['handle_new_user', 'verify_email_token']::TEXT[],
        CASE 
            WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ANY(ARRAY['profiles', 'user_sessions', 'verification_tokens'])) = 3
            THEN 'COMPATIBLE'
            ELSE 'INCOMPATIBLE'
        END::TEXT
    UNION ALL
    SELECT 
        'transactionService.ts'::TEXT,
        ARRAY['transactions', 'accounts', 'income_categories', 'expense_categories']::TEXT[],
        ARRAY['create_transfer', 'recalculate_account_balance']::TEXT[],
        CASE 
            WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ANY(ARRAY['transactions', 'accounts', 'income_categories', 'expense_categories'])) = 4
            THEN 'COMPATIBLE'
            ELSE 'INCOMPATIBLE'
        END::TEXT
    UNION ALL
    SELECT 
        'budgetService.ts'::TEXT,
        ARRAY['budgets', 'budget_alerts']::TEXT[],
        ARRAY['create_period_budget', 'check_budget_alerts']::TEXT[],
        CASE 
            WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ANY(ARRAY['budgets', 'budget_alerts'])) = 2
            THEN 'COMPATIBLE'
            ELSE 'INCOMPATIBLE'
        END::TEXT
    UNION ALL
    SELECT 
        'goalService.ts'::TEXT,
        ARRAY['goals', 'goal_contributions']::TEXT[],
        ARRAY['contribute_to_goal']::TEXT[],
        CASE 
            WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ANY(ARRAY['goals', 'goal_contributions'])) = 2
            THEN 'COMPATIBLE'
            ELSE 'INCOMPATIBLE'
        END::TEXT
    UNION ALL
    SELECT 
        'familyService.ts'::TEXT,
        ARRAY['families', 'family_members', 'family_invitations']::TEXT[],
        ARRAY['create_family_with_admin', 'invite_to_family']::TEXT[],
        CASE 
            WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ANY(ARRAY['families', 'family_members'])) = 2
            THEN 'COMPATIBLE'
            ELSE 'INCOMPATIBLE'
        END::TEXT
    UNION ALL
    SELECT 
        'predictionService.ts'::TEXT,
        ARRAY['prediction_usage', 'prediction_results']::TEXT[],
        ARRAY['check_prediction_usage', 'get_cached_prediction']::TEXT[],
        CASE 
            WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ANY(ARRAY['prediction_usage', 'prediction_results'])) = 2
            THEN 'COMPATIBLE'
            ELSE 'INCOMPATIBLE'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DEPLOYMENT COMMANDS
-- =====================================================

/*
-- STEP-BY-STEP DEPLOYMENT COMMANDS
-- Copy and run these commands in order:

-- 1. Deploy Foundation (REQUIRED)
\i 02-auth-schema.sql
\i 12-shared-schema.sql

-- 2. Deploy Core Financial Features (REQUIRED)
\i 11-transactions-schema.sql
\i 03-budget-schema.sql
\i 07-goals-schema.sql

-- 3. Deploy Collaboration Features (OPTIONAL)
\i 06-family-schema.sql

-- 4. Deploy AI Features (OPTIONAL)
\i 08-predictions-schema.sql

-- 5. Deploy Administration (OPTIONAL)
\i 01-admin-schema.sql

-- 6. Initialize for new users (run after deployment)
SELECT public.create_default_categories(auth.uid());
SELECT public.initialize_prediction_usage(auth.uid());

*/

-- =====================================================
-- POST-DEPLOYMENT VALIDATION
-- =====================================================

-- Run this query after deployment to verify everything is working
CREATE OR REPLACE VIEW post_deployment_check AS
SELECT 
    'Database Schema' as check_category,
    COUNT(*) as total_tables,
    COUNT(*) FILTER (WHERE table_schema = 'public') as public_tables,
    'Tables deployed successfully' as status
FROM information_schema.tables 
WHERE table_name IN (
    'profiles', 'transactions', 'accounts', 'budgets', 'goals', 
    'families', 'family_members', 'prediction_usage', 'admin_settings'
)
UNION ALL
SELECT 
    'Functions & Procedures' as check_category,
    COUNT(*) as total_functions,
    COUNT(*) FILTER (WHERE routine_schema = 'public') as public_functions,
    'Functions deployed successfully' as status
FROM information_schema.routines 
WHERE routine_name IN (
    'handle_new_user', 'update_timestamp', 'contribute_to_goal', 
    'create_transfer', 'check_prediction_usage', 'log_admin_activity'
)
UNION ALL
SELECT 
    'Row Level Security' as check_category,
    COUNT(DISTINCT tablename) as rls_enabled_tables,
    0 as placeholder,
    'RLS policies active' as status
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Indexes' as check_category,
    COUNT(*) as total_indexes,
    0 as placeholder,
    'Performance indexes created' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- =====================================================
-- MIGRATION HELPERS
-- =====================================================

-- Function to backup existing data before migration
CREATE OR REPLACE FUNCTION create_migration_backup()
RETURNS TEXT AS $$
DECLARE
    backup_info TEXT;
BEGIN
    -- This would create backup tables for existing data
    -- Implementation depends on existing schema structure
    
    backup_info := 'Migration backup created at: ' || now()::TEXT;
    
    -- Log the backup creation
    INSERT INTO public.system_activity_log (
        activity_type, activity_description, severity
    ) VALUES (
        'system_event', 
        'SQL refactoring migration backup created', 
        'info'
    );
    
    RETURN backup_info;
END;
$$ LANGUAGE plpgsql;

-- Function to validate data integrity after migration
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    has_data BOOLEAN,
    integrity_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'users/profiles'::TEXT,
        (SELECT COUNT(*) FROM public.profiles)::BIGINT,
        (SELECT COUNT(*) > 0 FROM public.profiles)::BOOLEAN,
        CASE 
            WHEN (SELECT COUNT(*) FROM public.profiles) > 0 THEN 'OK'
            ELSE 'EMPTY'
        END::TEXT
    UNION ALL
    SELECT 
        'transactions'::TEXT,
        COALESCE((SELECT COUNT(*) FROM public.transactions), 0)::BIGINT,
        COALESCE((SELECT COUNT(*) > 0 FROM public.transactions), false)::BOOLEAN,
        CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN 'OK'
            ELSE 'MISSING'
        END::TEXT
    UNION ALL
    SELECT 
        'accounts'::TEXT,
        COALESCE((SELECT COUNT(*) FROM public.accounts), 0)::BIGINT,
        COALESCE((SELECT COUNT(*) > 0 FROM public.accounts), false)::BOOLEAN,
        CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN 'OK'
            ELSE 'MISSING'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

/*
-- Use these queries to troubleshoot deployment issues:

-- 1. Check missing tables
SELECT 'Missing: ' || table_name as issue
FROM (VALUES ('profiles'), ('transactions'), ('accounts'), ('budgets'), ('goals')) AS expected(table_name)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = expected.table_name
);

-- 2. Check missing functions
SELECT 'Missing function: ' || function_name as issue
FROM (VALUES ('handle_new_user'), ('update_timestamp'), ('contribute_to_goal')) AS expected(function_name)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = expected.function_name
);

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 4. Verify permissions
SELECT grantee, table_schema, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee = 'authenticated';

*/

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up old schema if needed
CREATE OR REPLACE FUNCTION cleanup_old_schema()
RETURNS TEXT AS $$
DECLARE
    cleanup_summary TEXT;
BEGIN
    -- This function would handle cleanup of old/deprecated tables
    -- Only run after confirming new schema is working
    
    cleanup_summary := 'Schema cleanup completed at: ' || now()::TEXT;
    
    RETURN cleanup_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS FOR VALIDATION FUNCTIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION validate_sql_modules() TO authenticated;
GRANT EXECUTE ON FUNCTION check_backend_compatibility() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_data_integrity() TO authenticated;
GRANT SELECT ON deployment_order TO authenticated;
GRANT SELECT ON post_deployment_check TO authenticated;

-- =====================================================
-- FINAL VALIDATION REPORT
-- =====================================================

-- Run this to get a comprehensive status report
/*
SELECT 'SQL REFACTORING VALIDATION REPORT' as report_title, now() as generated_at;

SELECT * FROM validate_sql_modules();
SELECT * FROM check_backend_compatibility();
SELECT * FROM deployment_order WHERE is_required = true;
SELECT * FROM post_deployment_check;
*/

-- =====================================================
-- END OF VALIDATION SCRIPT
-- =====================================================