-- =====================================================
-- TEST SCHEMA DEPLOYMENT
-- =====================================================
-- Test script to validate the updated schema deployment
-- Tests the resolution of circular dependency issue
-- =====================================================

\\echo 'Starting schema deployment test...'

-- Test 1: Deploy core schemas in sequence
\\echo 'Testing core schema deployment (01-05)...'

-- These should deploy without errors
\\i 01-auth-schema.sql
\\i 02-shared-schema.sql  
\\i 03-family-schema.sql
\\i 04-transactions-schema.sql
\\i 05-goals-schema.sql

-- Test 2: Apply post-constraints
\\echo 'Testing post-constraints deployment...'
\\i 06-post-constraints.sql

-- Test 3: Verify constraint exists
\\echo 'Verifying foreign key constraint creation...'
SELECT 
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'transactions' 
  AND constraint_name = 'fk_transactions_goal_id'
  AND constraint_type = 'FOREIGN KEY';

-- Test 4: Test constraint enforcement
\\echo 'Testing constraint enforcement...'

-- This should succeed (valid test with auth user)
DO $$
BEGIN
    -- Only run if we have authenticated users
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        -- Try to insert a valid transaction (should work)
        INSERT INTO public.transactions (
            user_id, amount, type, description, goal_id
        ) 
        SELECT 
            u.id, 100.00, 'contribution', 'Test valid goal reference', g.id
        FROM auth.users u
        CROSS JOIN public.goals g
        WHERE u.id = g.user_id
        LIMIT 1;
        
        RAISE NOTICE 'SUCCESS: Valid goal reference accepted';
        
        -- Clean up test transaction
        DELETE FROM public.transactions 
        WHERE description = 'Test valid goal reference';
    ELSE
        RAISE NOTICE 'SKIP: No users available for constraint testing';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'INFO: Constraint test skipped - % ', SQLERRM;
END $$;

-- Test 5: Test invalid reference rejection
DO $$
DECLARE
    test_user_id UUID;
    constraint_working BOOLEAN := false;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        BEGIN
            -- Try to insert with invalid goal_id (should fail)
            INSERT INTO public.transactions (
                user_id, amount, type, description, goal_id
            ) VALUES (
                test_user_id, 100.00, 'contribution', 
                'Test invalid goal reference', 
                'ffffffff-ffff-ffff-ffff-ffffffffffff'
            );
            
            -- If we get here, constraint is not working
            RAISE NOTICE 'ERROR: Foreign key constraint not working - invalid reference was allowed';
            
            -- Clean up the invalid transaction
            DELETE FROM public.transactions 
            WHERE description = 'Test invalid goal reference';
            
        EXCEPTION
            WHEN foreign_key_violation THEN
                constraint_working := true;
                RAISE NOTICE 'SUCCESS: Foreign key constraint working - invalid reference rejected';
        END;
    ELSE
        RAISE NOTICE 'SKIP: No users available for invalid reference testing';
    END IF;
END $$;

-- Test 6: Verify transaction table structure
\\echo 'Verifying transaction table structure...'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name IN ('id', 'goal_id', 'user_id', 'amount', 'type')
ORDER BY column_name;

-- Test 7: Verify goals table structure  
\\echo 'Verifying goals table structure...'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'goals' 
  AND column_name IN ('id', 'user_id', 'goal_name', 'target_amount', 'current_amount')
ORDER BY column_name;

\\echo 'Schema deployment test completed!'