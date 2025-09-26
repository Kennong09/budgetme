-- =====================================================
-- QUICK DEPLOY SCRIPT - BUDGETME SQL REFACTORING
-- =====================================================
-- Purpose: Single-command deployment of all refactored SQL modules
-- Usage: Run this script to deploy the complete refactored schema
-- Recommended for: Database reset, fresh installations
-- =====================================================

\echo '=============================================='
\echo 'BudgetMe SQL Refactoring - Quick Deploy'
\echo 'Starting deployment of refactored modules...'
\echo '=============================================='

-- Enable timing to monitor deployment progress
\timing on

-- =====================================================
-- PHASE 1: FOUNDATION MODULES (REQUIRED)
-- =====================================================

\echo ''
\echo 'PHASE 1: Deploying Foundation Modules...'
\echo '----------------------------------------'

\echo 'Deploying 01-auth-schema.sql (Authentication & Users)...'
\i 01-auth-schema.sql

\echo 'Deploying 02-shared-schema.sql (Shared Utilities)...'
\i 02-shared-schema.sql

-- =====================================================
-- PHASE 2: CORE FINANCIAL MODULES (REQUIRED)
-- =====================================================

\echo ''
\echo 'PHASE 2: Deploying Core Financial Modules...'
\echo '---------------------------------------------'

\echo 'Deploying 11-transactions-schema.sql (Transaction Management)...'
\i 11-transactions-schema.sql

\echo 'Deploying 03-budget-schema.sql (Budget Management)...'
\i 03-budget-schema.sql

\echo 'Deploying 07-goals-schema.sql (Goal Tracking)...'
\i 07-goals-schema.sql

-- =====================================================
-- PHASE 3: COLLABORATION MODULES (OPTIONAL)
-- =====================================================

\echo ''
\echo 'PHASE 3: Deploying Collaboration Modules...'
\echo '--------------------------------------------'

\echo 'Deploying 06-family-schema.sql (Family Collaboration)...'
\i 06-family-schema.sql

-- =====================================================
-- PHASE 4: ADVANCED FEATURES (OPTIONAL)
-- =====================================================

\echo ''
\echo 'PHASE 4: Deploying Advanced Feature Modules...'
\echo '-----------------------------------------------'

\echo 'Deploying 08-predictions-schema.sql (AI Predictions)...'
\i 08-predictions-schema.sql

\echo 'Deploying 10-settings-schema.sql (User Settings)...'
\i 10-settings-schema.sql

\echo 'Deploying 09-reports-schema.sql (Reports & Analytics)...'
\i 09-reports-schema.sql

-- =====================================================
-- PHASE 5: AI AND INTERACTION MODULES (OPTIONAL)
-- =====================================================

\echo ''
\echo 'PHASE 5: Deploying AI and Interaction Modules...'
\echo '-------------------------------------------------'

\echo 'Deploying 04-chatbot-schema.sql (AI Chatbot)...'
\i 04-chatbot-schema.sql

\echo 'Deploying 05-dashboard-schema.sql (Dashboard Widgets)...'
\i 05-dashboard-schema.sql

-- =====================================================
-- PHASE 6: ADMINISTRATION (OPTIONAL)
-- =====================================================

\echo ''
\echo 'PHASE 6: Deploying Administration Module...'
\echo '--------------------------------------------'

\echo 'Deploying 01-admin-schema.sql (Administration)...'
\i 01-admin-schema.sql

-- =====================================================
-- PHASE 7: POST-DEPLOYMENT SETUP
-- =====================================================

\echo ''
\echo 'PHASE 7: Post-Deployment Setup...'
\echo '----------------------------------'

-- Initialize default admin user (from original setup)
\echo 'Setting up default admin user...'
DO $$
DECLARE
    populate_result RECORD;
BEGIN
    -- First, populate any missing profiles for existing users
    \echo 'Ensuring all existing users have profiles...'
    SELECT * INTO populate_result FROM public.populate_missing_profiles();
    
    IF populate_result.processed_count > 0 THEN
        RAISE NOTICE 'Profile population: % processed, % successful, % errors', 
            populate_result.processed_count, 
            populate_result.success_count, 
            populate_result.error_count;
    END IF;
    
    -- Ensure admin user exists with correct settings
    INSERT INTO public.profiles (id, email, role, full_name, is_active, email_verified)
    VALUES (
        '952a101d-d64d-42a8-89ce-cb4061aaaf5e'::uuid,
        'admin@gmail.com',
        'admin',
        'System Administrator',
        true,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        is_active = true,
        email_verified = true,
        updated_at = now();
    
    -- Initialize admin settings if not exists
    PERFORM public.initialize_user_settings('952a101d-d64d-42a8-89ce-cb4061aaaf5e');
    
    -- Create default categories for admin user
    PERFORM public.create_default_categories('952a101d-d64d-42a8-89ce-cb4061aaaf5e');
    
    -- Initialize prediction usage for admin user
    PERFORM public.initialize_prediction_usage('952a101d-d64d-42a8-89ce-cb4061aaaf5e');
    
    -- Initialize chat preferences for admin user
    PERFORM public.initialize_chat_preferences('952a101d-d64d-42a8-89ce-cb4061aaaf5e');
    
    -- Create default dashboard for admin user
    PERFORM public.create_default_dashboard('952a101d-d64d-42a8-89ce-cb4061aaaf5e');
    
    RAISE NOTICE 'Admin user setup completed successfully';
END $$;

-- Refresh materialized views
\echo 'Refreshing materialized views...'
SELECT public.refresh_financial_reports();

-- =====================================================
-- PHASE 7: DEPLOYMENT VALIDATION
-- =====================================================

\echo ''
\echo 'PHASE 7: Deployment Validation...'
\echo '----------------------------------'

-- Load validation functions
\i VALIDATION_AND_DEPLOYMENT.sql

-- Run validation checks
\echo 'Running module validation...'
SELECT 
    module_name,
    status,
    dependencies_met,
    message
FROM validate_sql_modules() 
ORDER BY 
    CASE status 
        WHEN 'DEPLOYED' THEN 1 
        WHEN 'PARTIAL' THEN 2 
        ELSE 3 
    END,
    module_name;

\echo ''
\echo 'Checking backend service compatibility...'
SELECT 
    service_name,
    compatibility_status,
    CASE 
        WHEN compatibility_status = 'COMPATIBLE' THEN '✅ Ready'
        ELSE '❌ Issues detected'
    END as status_indicator
FROM check_backend_compatibility()
ORDER BY compatibility_status DESC, service_name;

-- =====================================================
-- DEPLOYMENT SUMMARY
-- =====================================================

\echo ''
\echo '=============================================='
\echo 'DEPLOYMENT SUMMARY'
\echo '=============================================='

-- Get deployment statistics
DO $$
DECLARE
    v_table_count INTEGER;
    v_function_count INTEGER;
    v_view_count INTEGER;
    v_policy_count INTEGER;
    v_index_count INTEGER;
BEGIN
    -- Count deployed objects
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name IN (
        'profiles', 'user_sessions', 'verification_tokens',
        'accounts', 'transactions', 'income_categories', 'expense_categories',
        'budgets', 'budget_alerts', 'goals', 'goal_contributions',
        'families', 'family_members', 'family_invitations',
        'prediction_usage', 'prediction_results',
        'user_settings', 'admin_settings', 'feature_flags'
    );
    
    SELECT COUNT(*) INTO v_function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION';
    
    SELECT COUNT(*) INTO v_view_count
    FROM information_schema.views
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 DEPLOYMENT STATISTICS:';
    RAISE NOTICE '   • Tables created: %', v_table_count;
    RAISE NOTICE '   • Functions deployed: %', v_function_count;
    RAISE NOTICE '   • Views created: %', v_view_count;
    RAISE NOTICE '   • RLS policies: %', v_policy_count;
    RAISE NOTICE '   • Indexes created: %', v_index_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Core modules: Authentication, Transactions, Budgets, Goals';
    RAISE NOTICE '✅ Optional modules: Family, Predictions, Settings, Reports, Admin';
    RAISE NOTICE '✅ Default admin user: admin@gmail.com';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 DATABASE READY FOR APPLICATION STARTUP!';
    
END $$;

-- Display connection information
\echo ''
\echo 'Next Steps:'
\echo '1. Update your .env files with database connection details'
\echo '2. Restart your BudgetMe application'
\echo '3. Login with admin@gmail.com to verify functionality'
\echo '4. Create additional users through the application interface'
\echo ''

\echo '=============================================='
\echo 'DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉'
\echo 'Time to start your BudgetMe application!'
\echo '=============================================='

\timing off