-- =====================================================
-- SCHEMA DEPLOYMENT VALIDATION SCRIPT
-- =====================================================
-- Purpose: Validate that all database objects are properly recreated after DROP operations
-- Usage: Run this script after deploying all schema files to verify completeness
-- Dependencies: All schema files (05-15) must be deployed
-- =====================================================

-- Start validation
DO $$
BEGIN
    RAISE NOTICE '🔍 STARTING SCHEMA DEPLOYMENT VALIDATION';
    RAISE NOTICE '=====================================';
    RAISE NOTICE 'Timestamp: %', now();
END $$;

-- =====================================================
-- TABLE VALIDATION
-- =====================================================

DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'goals', 'goal_contributions',
        'budgets', 'budget_alerts', 'budget_categories',
        'admin_settings', 'system_activity_log', 'user_roles', 'admin_notifications',
        'chat_sessions', 'chat_messages', 'ai_response_analytics', 'user_chat_preferences', 'conversation_topics',
        'dashboard_layouts', 'dashboard_widgets', 'user_widget_instances', 'widget_data_cache', 'dashboard_insights',
        'prediction_requests', 'prophet_predictions', 'ai_insights', 'prediction_usage_limits',
        'user_settings', 'application_settings', 'feature_flags', 'user_preferences_cache',
    ];
    missing_tables TEXT[] := '{}';
    table_name TEXT;
    table_exists BOOLEAN;
    total_expected INTEGER;
    total_found INTEGER := 0;
BEGIN
    total_expected := array_length(expected_tables, 1);
    
    RAISE NOTICE '📊 VALIDATING TABLES (%s expected)', total_expected;
    
    FOREACH table_name IN ARRAY expected_tables LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) INTO table_exists;
        
        IF table_exists THEN
            total_found := total_found + 1;
        ELSE
            missing_tables := missing_tables || table_name;
            RAISE WARNING '❌ Missing table: %', table_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) = 0 THEN
        RAISE NOTICE '✅ All tables found: %/%', total_found, total_expected;
    ELSE
        RAISE NOTICE '⚠️  Tables found: %/% (% missing)', total_found, total_expected, array_length(missing_tables, 1);
        RAISE NOTICE '   Missing: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- =====================================================
-- FUNCTION VALIDATION
-- =====================================================

DO $$
DECLARE
    expected_functions TEXT[] := ARRAY[
        'update_goal_progress', 'contribute_to_goal',
        'update_budget_spent', 'check_budget_alerts', 'create_period_budget', 'rollover_budget', 
        'sanitize_budget_name', 'validate_budget_name', 'create_sample_budgets',
        'is_admin_user', 'add_admin_user', 'remove_admin_user', 'log_admin_activity', 
        'get_admin_setting', 'set_admin_setting', 'manage_user_role', 'create_admin_notification',
        'start_chat_session', 'add_chat_message', 'end_chat_session', 'initialize_chat_preferences', 'get_chat_analytics',
        'create_default_dashboard', 'get_widget_data', 'invalidate_widget_cache', 'cleanup_widget_cache',
        'can_make_prediction_request', 'increment_prediction_usage', 'log_prediction_request', 
        'update_request_status', 'store_prophet_prediction', 'store_ai_insights', 
        'get_cached_prophet_prediction', 'cleanup_expired_predictions',
        'refresh_financial_reports', 'get_user_financial_report',
        'initialize_user_settings', 'get_user_setting', 'update_user_setting', 
        'is_feature_enabled', 'get_user_preferences',
        'validate_account_creation', 'create_user_default_accounts_safe', 'ensure_user_default_accounts', 'setup_accounts_for_existing_users'
    ];
    missing_functions TEXT[] := '{}';
    function_name TEXT;
    function_exists BOOLEAN;
    total_expected INTEGER;
    total_found INTEGER := 0;
BEGIN
    total_expected := array_length(expected_functions, 1);
    
    RAISE NOTICE '📊 VALIDATING FUNCTIONS (%s expected)', total_expected;
    
    FOREACH function_name IN ARRAY expected_functions LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = function_name
            AND routine_type = 'FUNCTION'
        ) INTO function_exists;
        
        IF function_exists THEN
            total_found := total_found + 1;
        ELSE
            missing_functions := missing_functions || function_name;
            RAISE WARNING '❌ Missing function: %', function_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) = 0 THEN
        RAISE NOTICE '✅ All functions found: %/%', total_found, total_expected;
    ELSE
        RAISE NOTICE '⚠️  Functions found: %/% (% missing)', total_found, total_expected, array_length(missing_functions, 1);
        RAISE NOTICE '   Missing: %', array_to_string(missing_functions, ', ');
    END IF;
END $$;

-- =====================================================
-- VIEW VALIDATION
-- =====================================================

DO $$
DECLARE
    expected_views TEXT[] := ARRAY[
        'goal_details',
        'budget_details', 'budget_category_summary',
        'admin_dashboard_summary',
        'recent_chat_sessions',
        'user_dashboard_overview',
        'prediction_usage_analytics', 'recent_prediction_activity',
        'monthly_transaction_summary', 'budget_performance_analysis', 'goal_progress_tracking', 
        'family_financial_overview', 'spending_insights',
        'user_settings_summary'
    ];
    expected_materialized_views TEXT[] := ARRAY[
        'user_financial_summary'
    ];
    missing_views TEXT[] := '{}';
    missing_mv TEXT[] := '{}';
    view_name TEXT;
    view_exists BOOLEAN;
    mv_exists BOOLEAN;
    total_views_expected INTEGER;
    total_mv_expected INTEGER;
    total_views_found INTEGER := 0;
    total_mv_found INTEGER := 0;
BEGIN
    total_views_expected := array_length(expected_views, 1);
    total_mv_expected := array_length(expected_materialized_views, 1);
    
    RAISE NOTICE '📊 VALIDATING VIEWS (%s regular + %s materialized)', total_views_expected, total_mv_expected;
    
    -- Check regular views
    FOREACH view_name IN ARRAY expected_views LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = view_name
        ) INTO view_exists;
        
        IF view_exists THEN
            total_views_found := total_views_found + 1;
        ELSE
            missing_views := missing_views || view_name;
            RAISE WARNING '❌ Missing view: %', view_name;
        END IF;
    END LOOP;
    
    -- Check materialized views
    FOREACH view_name IN ARRAY expected_materialized_views LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_matviews 
            WHERE schemaname = 'public' 
            AND matviewname = view_name
        ) INTO mv_exists;
        
        IF mv_exists THEN
            total_mv_found := total_mv_found + 1;
        ELSE
            missing_mv := missing_mv || view_name;
            RAISE WARNING '❌ Missing materialized view: %', view_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_views, 1) = 0 AND array_length(missing_mv, 1) = 0 THEN
        RAISE NOTICE '✅ All views found: %/% regular, %/% materialized', 
            total_views_found, total_views_expected, total_mv_found, total_mv_expected;
    ELSE
        RAISE NOTICE '⚠️  Views found: %/% regular, %/% materialized', 
            total_views_found, total_views_expected, total_mv_found, total_mv_expected;
        IF array_length(missing_views, 1) > 0 THEN
            RAISE NOTICE '   Missing views: %', array_to_string(missing_views, ', ');
        END IF;
        IF array_length(missing_mv, 1) > 0 THEN
            RAISE NOTICE '   Missing materialized views: %', array_to_string(missing_mv, ', ');
        END IF;
    END IF;
END $$;

-- =====================================================
-- POLICY VALIDATION
-- =====================================================

DO $$
DECLARE
    rls_tables TEXT[] := ARRAY[
        'goals', 'goal_contributions',
        'budgets', 'budget_alerts', 'budget_categories',
        'admin_settings', 'system_activity_log', 'user_roles', 'admin_notifications',
        'chat_sessions', 'chat_messages', 'ai_response_analytics', 'user_chat_preferences', 'conversation_topics',
        'dashboard_layouts', 'dashboard_widgets', 'user_widget_instances', 'widget_data_cache', 'dashboard_insights',
        'prediction_requests', 'prophet_predictions', 'ai_insights', 'prediction_usage_limits',
        'user_settings', 'application_settings', 'feature_flags', 'user_preferences_cache',
        'user_notifications', 'notification_preferences', 'notification_delivery_log'
    ];
    table_name TEXT;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    total_expected INTEGER;
    total_rls_enabled INTEGER := 0;
    total_policies INTEGER := 0;
BEGIN
    total_expected := array_length(rls_tables, 1);
    
    RAISE NOTICE '📊 VALIDATING RLS AND POLICIES (%s tables expected)', total_expected;
    
    FOREACH table_name IN ARRAY rls_tables LOOP
        -- Check if RLS is enabled
        SELECT rowsecurity INTO rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = table_name;
        
        IF rls_enabled THEN
            total_rls_enabled := total_rls_enabled + 1;
        ELSE
            RAISE WARNING '❌ RLS not enabled on table: %', table_name;
        END IF;
        
        -- Count policies
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = table_name;
        
        total_policies := total_policies + policy_count;
        
        IF policy_count = 0 THEN
            RAISE WARNING '⚠️  No policies found for table: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ RLS enabled on %/% tables', total_rls_enabled, total_expected;
    RAISE NOTICE '✅ Total policies found: %', total_policies;
END $$;

-- =====================================================
-- CONSTRAINT VALIDATION
-- =====================================================

DO $$
DECLARE
    constraint_count INTEGER;
    fk_count INTEGER;
    unique_count INTEGER;
    check_count INTEGER;
BEGIN
    RAISE NOTICE '📊 VALIDATING CONSTRAINTS';
    
    -- Count foreign key constraints
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY';
    
    -- Count unique constraints
    SELECT COUNT(*) INTO unique_count
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_type = 'UNIQUE';
    
    -- Count check constraints
    SELECT COUNT(*) INTO check_count
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_type = 'CHECK';
    
    constraint_count := fk_count + unique_count + check_count;
    
    RAISE NOTICE '✅ Constraints found: % total (% FK, % unique, % check)', 
        constraint_count, fk_count, unique_count, check_count;
    
    -- Check for specific important constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_transactions_goal_id' 
        AND table_name = 'transactions'
    ) THEN
        RAISE NOTICE '✅ Critical constraint found: fk_transactions_goal_id';
    ELSE
        RAISE WARNING '❌ Missing critical constraint: fk_transactions_goal_id';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_account_type' 
        AND table_name = 'accounts'
    ) THEN
        RAISE NOTICE '✅ Critical constraint found: unique_user_account_type';
    ELSE
        RAISE WARNING '❌ Missing critical constraint: unique_user_account_type';
    END IF;
END $$;

-- =====================================================
-- INDEX VALIDATION
-- =====================================================

DO $$
DECLARE
    index_count INTEGER;
    partial_index_count INTEGER;
    unique_index_count INTEGER;
BEGIN
    RAISE NOTICE '📊 VALIDATING INDEXES';
    
    -- Count all indexes (excluding system indexes)
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- Count partial indexes
    SELECT COUNT(*) INTO partial_index_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexdef LIKE '%WHERE%';
    
    -- Count unique indexes
    SELECT COUNT(*) INTO unique_index_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexdef LIKE '%UNIQUE%';
    
    RAISE NOTICE '✅ Indexes found: % total (% partial, % unique)', 
        index_count, partial_index_count, unique_index_count;
    
    IF index_count < 50 THEN
        RAISE WARNING '⚠️  Low index count detected - expected 50+ indexes';
    END IF;
END $$;

-- =====================================================
-- TRIGGER VALIDATION
-- =====================================================

DO $$
DECLARE
    trigger_count INTEGER;
    update_triggers INTEGER;
BEGIN
    RAISE NOTICE '📊 VALIDATING TRIGGERS';
    
    -- Count all triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
    
    -- Count update timestamp triggers
    SELECT COUNT(*) INTO update_triggers
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%updated_at%';
    
    RAISE NOTICE '✅ Triggers found: % total (% update timestamp triggers)', 
        trigger_count, update_triggers;
    
    IF trigger_count < 10 THEN
        RAISE WARNING '⚠️  Low trigger count detected - expected 10+ triggers';
    END IF;
END $$;

-- =====================================================
-- GRANT VALIDATION
-- =====================================================

DO $$
DECLARE
    table_grants INTEGER;
    function_grants INTEGER;
    view_grants INTEGER;
BEGIN
    RAISE NOTICE '📊 VALIDATING GRANTS';
    
    -- Count table grants to authenticated role
    SELECT COUNT(DISTINCT table_name) INTO table_grants
    FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
    AND grantee = 'authenticated';
    
    -- Count function grants to authenticated role
    SELECT COUNT(DISTINCT routine_name) INTO function_grants
    FROM information_schema.routine_privileges 
    WHERE routine_schema = 'public' 
    AND grantee = 'authenticated';
    
    -- Count view grants (views appear in table_privileges)
    SELECT COUNT(DISTINCT table_name) INTO view_grants
    FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
    AND grantee = 'authenticated'
    AND table_name IN (
        SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    );
    
    RAISE NOTICE '✅ Grants found: % tables, % functions, % views to authenticated role', 
        table_grants, function_grants, view_grants;
END $$;

-- =====================================================
-- DEPENDENCY VALIDATION
-- =====================================================

DO $$
DECLARE
    circular_deps INTEGER;
BEGIN
    RAISE NOTICE '📊 VALIDATING DEPENDENCIES';
    
    -- Check for circular dependencies (this is a simplified check)
    SELECT COUNT(*) INTO circular_deps
    FROM information_schema.table_constraints tc1
    JOIN information_schema.table_constraints tc2 ON tc1.table_name = tc2.constraint_name
    WHERE tc1.constraint_type = 'FOREIGN KEY' 
    AND tc2.constraint_type = 'FOREIGN KEY'
    AND tc1.constraint_schema = 'public'
    AND tc2.constraint_schema = 'public';
    
    IF circular_deps = 0 THEN
        RAISE NOTICE '✅ No obvious circular dependencies detected';
    ELSE
        RAISE WARNING '⚠️  Potential circular dependencies detected: %', circular_deps;
    END IF;
END $$;

-- =====================================================
-- FINAL VALIDATION SUMMARY
-- =====================================================

DO $$
DECLARE
    total_objects INTEGER;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '📋 FINAL VALIDATION SUMMARY';
    RAISE NOTICE '==========================';
    
    -- Count total database objects
    SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') +
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') +
        (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public') +
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') +
        (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public') +
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') +
        (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public')
    INTO total_objects;
    
    -- Simple error detection based on expected minimums
    IF (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') < 25 THEN
        error_count := error_count + 1;
    END IF;
    
    IF (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') < 30 THEN
        error_count := error_count + 1;
    END IF;
    
    IF (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') < 10 THEN
        error_count := error_count + 1;
    END IF;
    
    RAISE NOTICE 'Total database objects: %', total_objects;
    RAISE NOTICE 'Validation errors detected: %', error_count;
    
    IF error_count = 0 THEN
        RAISE NOTICE '🎉 SCHEMA DEPLOYMENT VALIDATION COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '✅ All expected database objects appear to be present and properly configured.';
        RAISE NOTICE '✅ Schema deployment is ready for use.';
    ELSE
        RAISE NOTICE '⚠️  SCHEMA DEPLOYMENT VALIDATION COMPLETED WITH WARNINGS!';
        RAISE NOTICE '⚠️  % validation errors detected - please review the output above.', error_count;
        RAISE NOTICE '⚠️  Some objects may be missing or improperly configured.';
    END IF;
    
    RAISE NOTICE '==========================';
    RAISE NOTICE 'Validation completed at: %', now();
END $$;