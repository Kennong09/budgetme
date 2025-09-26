-- =====================================================
-- SCHEMA VALIDATION AND DEPLOYMENT SCRIPT
-- =====================================================
-- Purpose: Validate sequential execution of SQL schema files
-- Usage: Execute this script on a clean PostgreSQL database
-- =====================================================

\echo '=== Starting SQL Schema Validation ==='
\echo '=== Testing Sequential Execution Order ==='

-- Set error handling
\set ON_ERROR_STOP on
\timing on

-- Create a validation log table to track progress
CREATE TABLE IF NOT EXISTS validation_log (
    id SERIAL PRIMARY KEY,
    step_name TEXT NOT NULL,
    file_name TEXT,
    execution_time TIMESTAMP DEFAULT now(),
    status TEXT DEFAULT 'started',
    error_message TEXT,
    tables_created INTEGER DEFAULT 0,
    functions_created INTEGER DEFAULT 0,
    views_created INTEGER DEFAULT 0
);

-- Function to log validation steps
CREATE OR REPLACE FUNCTION log_validation_step(
    p_step_name TEXT,
    p_file_name TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'completed',
    p_error TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO validation_log (step_name, file_name, status, error_message)
    VALUES (p_step_name, p_file_name, p_status, p_error);
END;
$$ LANGUAGE plpgsql;

-- Log start of validation
SELECT log_validation_step('Schema Validation Started', NULL, 'started');

\echo '=== Step 1: Foundation - Auth Schema ==='
SELECT log_validation_step('Auth Schema', '01-auth-schema.sql', 'started');
\i 01-auth-schema.sql
SELECT log_validation_step('Auth Schema', '01-auth-schema.sql', 'completed');

\echo '=== Step 2: Shared Utilities ==='
SELECT log_validation_step('Shared Schema', '02-shared-schema.sql', 'started');
\i 02-shared-schema.sql
SELECT log_validation_step('Shared Schema', '02-shared-schema.sql', 'completed');

\echo '=== Step 3: Family Management ==='
SELECT log_validation_step('Family Schema', '03-family-schema.sql', 'started');
\i 03-family-schema.sql
SELECT log_validation_step('Family Schema', '03-family-schema.sql', 'completed');

\echo '=== Step 4: Transactions and Accounts ==='
SELECT log_validation_step('Transactions Schema', '04-transactions-schema.sql', 'started');
\i 04-transactions-schema.sql
SELECT log_validation_step('Transactions Schema', '04-transactions-schema.sql', 'completed');

\echo '=== Step 5: Goals Management ==='
SELECT log_validation_step('Goals Schema', '05-goals-schema.sql', 'started');
\i 05-goals-schema.sql
SELECT log_validation_step('Goals Schema', '05-goals-schema.sql', 'completed');

\echo '=== Step 6: Budget Management ==='
SELECT log_validation_step('Budget Schema', '06-budget-schema.sql', 'started');
\i 06-budget-schema.sql
SELECT log_validation_step('Budget Schema', '06-budget-schema.sql', 'completed');

\echo '=== Step 7: Admin Features ==='
SELECT log_validation_step('Admin Schema', '07-admin-schema.sql', 'started');
\i 07-admin-schema.sql
SELECT log_validation_step('Admin Schema', '07-admin-schema.sql', 'completed');

\echo '=== Step 8: Chatbot Features ==='
SELECT log_validation_step('Chatbot Schema', '08-chatbot-schema.sql', 'started');
\i 08-chatbot-schema.sql
SELECT log_validation_step('Chatbot Schema', '08-chatbot-schema.sql', 'completed');

\echo '=== Step 9: Dashboard Views ==='
SELECT log_validation_step('Dashboard Schema', '09-dashboard-schema.sql', 'started');
\i 09-dashboard-schema.sql
SELECT log_validation_step('Dashboard Schema', '09-dashboard-schema.sql', 'completed');

\echo '=== Step 10: Predictions ==='
SELECT log_validation_step('Predictions Schema', '10-predictions-schema.sql', 'started');
\i 10-predictions-schema.sql
SELECT log_validation_step('Predictions Schema', '10-predictions-schema.sql', 'completed');

\echo '=== Step 11: Reports ==='
SELECT log_validation_step('Reports Schema', '11-reports-schema.sql', 'started');
\i 11-reports-schema.sql
SELECT log_validation_step('Reports Schema', '11-reports-schema.sql', 'completed');

\echo '=== Step 12: Settings ==='
SELECT log_validation_step('Settings Schema', '12-settings-schema.sql', 'started');
\i 12-settings-schema.sql
SELECT log_validation_step('Settings Schema', '12-settings-schema.sql', 'completed');

-- =====================================================
-- VALIDATION CHECKS
-- =====================================================

\echo '=== Running Validation Checks ==='

-- Check 1: Verify all critical tables exist
SELECT log_validation_step('Table Existence Check', NULL, 'started');

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
    required_tables TEXT[] := ARRAY[
        'profiles', 'families', 'family_members', 'accounts', 'transactions',
        'income_categories', 'expense_categories', 'goals', 'goal_contributions',
        'budgets', 'budget_alerts'
    ];
BEGIN
    FOREACH table_name IN ARRAY required_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing critical tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'All critical tables exist: %', array_to_string(required_tables, ', ');
END $$;

SELECT log_validation_step('Table Existence Check', NULL, 'completed');

-- Check 2: Verify foreign key constraints
SELECT log_validation_step('Foreign Key Validation', NULL, 'started');

DO $$
DECLARE
    fk_count INTEGER;
    expected_fks TEXT[] := ARRAY[
        'transactions.goal_id -> goals.id',
        'goals.family_id -> families.id',
        'goals.user_id -> auth.users.id',
        'budgets.category_id -> expense_categories.id',
        'transactions.account_id -> accounts.id'
    ];
BEGIN
    -- Count foreign key constraints on critical relationships
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (
        (tc.table_name = 'transactions' AND kcu.column_name = 'goal_id') OR
        (tc.table_name = 'goals' AND kcu.column_name = 'family_id') OR
        (tc.table_name = 'budgets' AND kcu.column_name = 'category_id')
    );
    
    IF fk_count < 3 THEN
        RAISE EXCEPTION 'Critical foreign key constraints missing. Found: %, Expected: >= 3', fk_count;
    END IF;
    
    RAISE NOTICE 'Foreign key constraints validated. Found: %', fk_count;
END $$;

SELECT log_validation_step('Foreign Key Validation', NULL, 'completed');

-- Check 3: Verify RLS policies
SELECT log_validation_step('RLS Policy Check', NULL, 'started');

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    IF policy_count < 10 THEN
        RAISE EXCEPTION 'Insufficient RLS policies. Found: %, Expected: >= 10', policy_count;
    END IF;
    
    RAISE NOTICE 'RLS policies validated. Found: %', policy_count;
END $$;

SELECT log_validation_step('RLS Policy Check', NULL, 'completed');

-- Check 4: Verify essential functions exist
SELECT log_validation_step('Function Validation', NULL, 'started');

DO $$
DECLARE
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    function_name TEXT;
    required_functions TEXT[] := ARRAY[
        'update_timestamp', 'handle_new_user', 'create_family_with_admin',
        'update_account_balance', 'contribute_to_goal', 'create_transfer'
    ];
BEGIN
    FOREACH function_name IN ARRAY required_functions LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' AND routine_name = function_name
        ) THEN
            missing_functions := array_append(missing_functions, function_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE EXCEPTION 'Missing critical functions: %', array_to_string(missing_functions, ', ');
    END IF;
    
    RAISE NOTICE 'All critical functions exist: %', array_to_string(required_functions, ', ');
END $$;

SELECT log_validation_step('Function Validation', NULL, 'completed');

-- =====================================================
-- VALIDATION SUMMARY
-- =====================================================

\echo '=== Validation Summary ==='

-- Update final status
SELECT log_validation_step('Schema Validation Completed', NULL, 'completed');

-- Display validation results
SELECT 
    step_name,
    file_name,
    status,
    execution_time,
    CASE WHEN error_message IS NOT NULL THEN error_message ELSE 'Success' END as result
FROM validation_log 
ORDER BY id;

-- Display table counts
\echo '=== Database Object Summary ==='
SELECT 
    'Tables' as object_type,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'Views' as object_type,
    COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'Functions' as object_type,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public'
UNION ALL
SELECT 
    'Foreign Keys' as object_type,
    COUNT(*) as count
FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'
UNION ALL
SELECT 
    'RLS Policies' as object_type,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public';

\echo '=== Schema Validation Complete ==='
\echo 'All schemas have been successfully deployed in correct dependency order!'
\echo 'Database is ready for application use.'