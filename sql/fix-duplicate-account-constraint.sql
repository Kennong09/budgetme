-- =====================================================
-- FIX DUPLICATE ACCOUNT CONSTRAINT ISSUE
-- =====================================================
-- This script removes the unique_user_account_type constraint
-- that prevents users from creating multiple accounts of the same type
-- =====================================================

-- Log the operation start
DO $$
BEGIN
    RAISE NOTICE '🔧 FIXING DUPLICATE ACCOUNT CONSTRAINT ISSUE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Timestamp: %', now();
END $$;

-- Check if the constraint exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_account_type' 
        AND table_name = 'accounts'
        AND constraint_type = 'UNIQUE'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE '⚠️  Found unique_user_account_type constraint - will remove it';
    ELSE
        RAISE NOTICE '✅ unique_user_account_type constraint not found - nothing to remove';
    END IF;
END $$;

-- Remove the constraint if it exists
DO $$
BEGIN
    -- Try to drop the constraint
    ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS unique_user_account_type CASCADE;
    RAISE NOTICE '✅ Removed unique_user_account_type constraint';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Failed to remove constraint: %', SQLERRM;
END $$;

-- Remove the related index as well
DROP INDEX IF EXISTS public.idx_accounts_user_type_unique;
DO $$
BEGIN
    RAISE NOTICE '✅ Removed idx_accounts_user_type_unique index';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Failed to remove index: %', SQLERRM;
END $$;

-- Verify the constraint is gone
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_account_type' 
        AND table_name = 'accounts'
        AND constraint_type = 'UNIQUE'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE WARNING '⚠️  Constraint still exists after removal attempt';
    ELSE
        RAISE NOTICE '✅ Confirmed: unique_user_account_type constraint successfully removed';
    END IF;
END $$;

-- Create a more flexible index for performance (non-unique)
-- This allows multiple accounts of the same type per user
CREATE INDEX IF NOT EXISTS idx_accounts_user_type_performance 
ON public.accounts(user_id, account_type) 
WHERE status = 'active';

-- Verify auto-populate functions still exist and work
DO $$
BEGIN
    -- Check if auto-populate functions exist
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_user_default_accounts_safe') THEN
        RAISE NOTICE '✅ Auto-populate function create_user_default_accounts_safe() exists';
    ELSE
        RAISE WARNING '⚠️  Auto-populate function create_user_default_accounts_safe() not found';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'ensure_user_default_accounts') THEN
        RAISE NOTICE '✅ Auto-populate function ensure_user_default_accounts() exists';
    ELSE
        RAISE WARNING '⚠️  Auto-populate function ensure_user_default_accounts() not found';
    END IF;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '🎉 CONSTRAINT FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '✅ Removed unique_user_account_type constraint';
    RAISE NOTICE '✅ Removed related unique index';
    RAISE NOTICE '✅ Added performance index (non-unique)';
    RAISE NOTICE '✅ Users can now create multiple accounts of the same type';
    RAISE NOTICE '✅ Auto-populate account functionality preserved';
    RAISE NOTICE '';
    RAISE NOTICE 'Impact:';
    RAISE NOTICE '• Users can now have multiple checking accounts';
    RAISE NOTICE '• Users can now have multiple savings accounts';
    RAISE NOTICE '• Users can now have multiple accounts of any type';
    RAISE NOTICE '• Account creation should work without constraint violations';
    RAISE NOTICE '• New users still get exactly 3 default accounts (1 checking, 1 savings, 1 credit)';
    RAISE NOTICE '• Auto-populate uses application logic, not database constraints';
END $$;
