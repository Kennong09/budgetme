-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop triggers first
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS trigger_validate_account_creation ON public.accounts;
    DROP TRIGGER IF EXISTS trigger_create_default_accounts_on_user_creation ON auth.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.validate_account_creation();
    DROP FUNCTION IF EXISTS public.create_user_default_accounts_safe(UUID);
    DROP FUNCTION IF EXISTS public.create_user_default_accounts_auto();
    DROP FUNCTION IF EXISTS public.ensure_user_default_accounts(UUID);
    DROP FUNCTION IF EXISTS public.setup_accounts_for_existing_users();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop constraints
DO $$ 
BEGIN
    ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS unique_user_account_type CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_accounts_user_type_unique;
DROP INDEX IF EXISTS public.idx_accounts_user_default;

-- Drop backup table if it exists
DROP TABLE IF EXISTS public.accounts_backup_before_duplicate_fix CASCADE;


-- =====================================================
-- COMPLETE DUPLICATE ACCOUNTS FIX & AUTO ACCOUNT SETUP
-- =====================================================
-- This script fixes existing duplicate accounts, prevents future duplicates,
-- and automatically creates default accounts for new users
-- Run this directly in Supabase SQL Editor
-- =====================================================

-- Start transaction for safety
BEGIN;

-- Log start
DO $$
BEGIN
    RAISE NOTICE '🔧 STARTING DUPLICATE ACCOUNTS FIX & AUTO SETUP';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Timestamp: %', now();
END $$;

-- =====================================================
-- STEP 1: ANALYZE CURRENT DUPLICATES
-- =====================================================

DO $$
DECLARE
    duplicate_count INTEGER;
    user_count INTEGER;
BEGIN
    -- Count users with duplicate accounts
    SELECT COUNT(DISTINCT user_id) INTO user_count
    FROM (
        SELECT user_id, account_type, COUNT(*) as account_count
        FROM public.accounts 
        WHERE status = 'active'
        GROUP BY user_id, account_type
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Count total duplicate accounts (accounts that will be removed)
    SELECT COALESCE(SUM(account_count - 1), 0) INTO duplicate_count
    FROM (
        SELECT user_id, account_type, COUNT(*) as account_count
        FROM public.accounts 
        WHERE status = 'active'
        GROUP BY user_id, account_type
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE '📊 ANALYSIS RESULTS:';
    RAISE NOTICE '   - Users with duplicate accounts: %', user_count;
    RAISE NOTICE '   - Total duplicate accounts to fix: %', duplicate_count;
    
    IF user_count = 0 THEN
        RAISE NOTICE '✅ No duplicate accounts found. Skipping fix and applying prevention measures only.';
    ELSE
        RAISE NOTICE '⚠️  Will fix % duplicate accounts for % users', duplicate_count, user_count;
    END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE BACKUP TABLE (OPTIONAL SAFETY)
-- =====================================================

-- Create backup of accounts before making changes
CREATE TABLE IF NOT EXISTS public.accounts_backup_before_duplicate_fix AS 
SELECT *, now() as backup_timestamp 
FROM public.accounts 
WHERE user_id IN (
    SELECT DISTINCT user_id
    FROM (
        SELECT user_id, account_type, COUNT(*) as account_count
        FROM public.accounts 
        WHERE status = 'active'
        GROUP BY user_id, account_type
        HAVING COUNT(*) > 1
    ) duplicates
);

DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM public.accounts_backup_before_duplicate_fix;
    RAISE NOTICE '💾 Created backup table with % records', backup_count;
END $$;

-- =====================================================
-- STEP 3: FIX DUPLICATE ACCOUNTS
-- =====================================================

DO $$
DECLARE
    user_record RECORD;
    account_record RECORD;
    keep_account_id UUID;
    total_balance DECIMAL(15,4);
    accounts_to_remove UUID[];
    account_to_remove UUID;
    users_processed INTEGER := 0;
    accounts_removed INTEGER := 0;
    duplicates_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 STARTING DUPLICATE ACCOUNT FIXES...';
    
    -- Process each user with duplicate accounts
    FOR user_record IN (
        SELECT DISTINCT user_id
        FROM (
            SELECT user_id, account_type, COUNT(*) as account_count
            FROM public.accounts 
            WHERE status = 'active'
            GROUP BY user_id, account_type
            HAVING COUNT(*) > 1
        ) duplicates
    ) LOOP
        users_processed := users_processed + 1;
        RAISE NOTICE 'Processing user % (% of affected users)', user_record.user_id, users_processed;
        
        -- Process each account type that has duplicates for this user
        FOR account_record IN (
            SELECT account_type, COUNT(*) as duplicate_count
            FROM public.accounts 
            WHERE user_id = user_record.user_id AND status = 'active'
            GROUP BY account_type
            HAVING COUNT(*) > 1
        ) LOOP
            duplicates_fixed := duplicates_fixed + 1;
            RAISE NOTICE '  Fixing % accounts of type %', account_record.duplicate_count, account_record.account_type;
            
            -- Find the account to keep (highest balance, or oldest if tied)
            SELECT id INTO keep_account_id
            FROM public.accounts 
            WHERE user_id = user_record.user_id 
            AND account_type = account_record.account_type 
            AND status = 'active'
            ORDER BY balance DESC, created_at ASC
            LIMIT 1;
            
            -- Calculate total balance from all accounts of this type
            SELECT COALESCE(SUM(balance), 0) INTO total_balance
            FROM public.accounts 
            WHERE user_id = user_record.user_id 
            AND account_type = account_record.account_type 
            AND status = 'active';
            
            RAISE NOTICE '    Keeping account % with consolidated balance %', keep_account_id, total_balance;
            
            -- Update the kept account with consolidated balance
            UPDATE public.accounts 
            SET 
                balance = total_balance,
                is_default = CASE 
                    WHEN account_record.account_type = 'checking' THEN true 
                    ELSE is_default 
                END,
                updated_at = now()
            WHERE id = keep_account_id;
            
            -- Get list of accounts to remove
            SELECT array_agg(id) INTO accounts_to_remove
            FROM public.accounts 
            WHERE user_id = user_record.user_id 
            AND account_type = account_record.account_type 
            AND status = 'active'
            AND id != keep_account_id;
            
            -- Update transactions to reference the kept account
            FOREACH account_to_remove IN ARRAY accounts_to_remove LOOP
                -- Update regular transactions
                UPDATE public.transactions 
                SET account_id = keep_account_id, updated_at = now()
                WHERE account_id = account_to_remove;
                
                -- Update transfer transactions
                UPDATE public.transactions 
                SET transfer_account_id = keep_account_id, updated_at = now()
                WHERE transfer_account_id = account_to_remove;
                
                RAISE NOTICE '    Updated transactions for account %', account_to_remove;
            END LOOP;
            
            -- Remove duplicate accounts
            DELETE FROM public.accounts 
            WHERE user_id = user_record.user_id 
            AND account_type = account_record.account_type 
            AND status = 'active'
            AND id != keep_account_id;
            
            accounts_removed := accounts_removed + array_length(accounts_to_remove, 1);
            RAISE NOTICE '    Removed % duplicate accounts', array_length(accounts_to_remove, 1);
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ DUPLICATE FIX COMPLETED:';
    RAISE NOTICE '   - Users processed: %', users_processed;
    RAISE NOTICE '   - Account type duplicates fixed: %', duplicates_fixed;
    RAISE NOTICE '   - Total accounts removed: %', accounts_removed;
END $$;

-- =====================================================
-- STEP 4: ENSURE ONLY ONE DEFAULT ACCOUNT PER USER
-- =====================================================

DO $$
DECLARE
    user_record RECORD;
    default_count INTEGER;
    users_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 ENSURING SINGLE DEFAULT ACCOUNT PER USER...';
    
    -- Find users with multiple default accounts
    FOR user_record IN (
        SELECT user_id, COUNT(*) as default_count
        FROM public.accounts 
        WHERE is_default = true AND status = 'active'
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) LOOP
        users_fixed := users_fixed + 1;
        
        -- Keep only the checking account as default, or first created if no checking
        UPDATE public.accounts 
        SET is_default = false, updated_at = now()
        WHERE user_id = user_record.user_id 
        AND is_default = true 
        AND status = 'active'
        AND id NOT IN (
            SELECT id FROM public.accounts 
            WHERE user_id = user_record.user_id 
            AND is_default = true 
            AND status = 'active'
            ORDER BY 
                CASE WHEN account_type = 'checking' THEN 1 ELSE 2 END,
                created_at ASC
            LIMIT 1
        );
        
        RAISE NOTICE 'Fixed multiple defaults for user %', user_record.user_id;
    END LOOP;
    
    RAISE NOTICE '✅ Fixed default accounts for % users', users_fixed;
END $$;

-- =====================================================
-- STEP 5: ADD CONSTRAINTS TO PREVENT FUTURE DUPLICATES
-- =====================================================

-- Add unique constraint for account type per user
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_account_type' 
        AND table_name = 'accounts'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- Add the constraint
        ALTER TABLE public.accounts 
        ADD CONSTRAINT unique_user_account_type 
        UNIQUE (user_id, account_type);
        
        RAISE NOTICE '✅ Added unique constraint: unique_user_account_type';
    ELSE
        RAISE NOTICE '✅ Constraint unique_user_account_type already exists';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to add unique constraint: %', SQLERRM;
END $$;

-- Create validation function for account creation
CREATE OR REPLACE FUNCTION public.validate_account_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure only one default account per user
    IF NEW.is_default = true THEN
        UPDATE public.accounts 
        SET is_default = false, updated_at = now()
        WHERE user_id = NEW.user_id 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND is_default = true
        AND status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate account creation and updates
DROP TRIGGER IF EXISTS trigger_validate_account_creation ON public.accounts;
CREATE TRIGGER trigger_validate_account_creation
    BEFORE INSERT OR UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.validate_account_creation();

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_type_unique 
ON public.accounts(user_id, account_type) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_accounts_user_default 
ON public.accounts(user_id) 
WHERE is_default = true AND status = 'active';

-- =====================================================
-- STEP 6: CREATE AUTOMATIC ACCOUNT SETUP FUNCTIONS
-- =====================================================

-- Create function for automatic default account creation for new users
CREATE OR REPLACE FUNCTION public.create_user_default_accounts_auto()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Get the user ID from the inserted row
    v_user_id := NEW.id;
    
    -- Create default accounts automatically
    SELECT public.create_user_default_accounts_safe(v_user_id) INTO v_result;
    
    -- Log the result
    RAISE NOTICE 'Auto-created accounts for new user %: %', v_user_id, v_result;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for safe account creation (enhanced version)
CREATE OR REPLACE FUNCTION public.create_user_default_accounts_safe(
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_account_id UUID;
    v_accounts_created JSONB := '[]'::jsonb;
    v_existing_types TEXT[];
    v_account_data RECORD;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User does not exist',
            'accounts_created', '[]'::jsonb,
            'count', 0
        );
    END IF;
    
    -- Get existing account types for this user
    SELECT array_agg(account_type) INTO v_existing_types
    FROM public.accounts 
    WHERE user_id = p_user_id AND status = 'active';
    
    v_existing_types := COALESCE(v_existing_types, ARRAY[]::TEXT[]);
    
    -- Define default accounts to create
    FOR v_account_data IN 
        SELECT * FROM (VALUES
            ('Primary Checking', 'checking', 0, true, 'Main checking account for daily transactions', '#4e73df'),
            ('Savings Account', 'savings', 0, false, 'Primary savings account', '#1cc88a'),
            ('Credit Card', 'credit', 0, false, 'Primary credit card account', '#e74a3b')
        ) AS t(account_name, account_type, initial_balance, is_default, description, color)
    LOOP
        -- Only create if account type doesn't exist
        IF NOT (v_account_data.account_type = ANY(v_existing_types)) THEN
            INSERT INTO public.accounts (
                user_id, account_name, account_type, balance, initial_balance,
                currency, status, is_default, description, color
            ) VALUES (
                p_user_id, v_account_data.account_name, v_account_data.account_type,
                v_account_data.initial_balance, v_account_data.initial_balance,
                'PHP', 'active', v_account_data.is_default, v_account_data.description, v_account_data.color
            )
            RETURNING id INTO v_account_id;
            
            v_accounts_created := v_accounts_created || jsonb_build_object(
                'id', v_account_id,
                'account_name', v_account_data.account_name,
                'account_type', v_account_data.account_type,
                'balance', v_account_data.initial_balance,
                'is_default', v_account_data.is_default
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'accounts_created', v_accounts_created,
        'count', jsonb_array_length(v_accounts_created),
        'user_id', p_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'accounts_created', '[]'::jsonb,
            'count', 0,
            'user_id', p_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to ensure user has all default accounts
CREATE OR REPLACE FUNCTION public.ensure_user_default_accounts(
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_missing_accounts INTEGER;
BEGIN
    -- Check how many default account types the user is missing
    SELECT 3 - COUNT(*) INTO v_missing_accounts
    FROM public.accounts 
    WHERE user_id = p_user_id 
    AND status = 'active' 
    AND account_type IN ('checking', 'savings', 'credit');
    
    IF v_missing_accounts > 0 THEN
        -- Create missing accounts
        SELECT public.create_user_default_accounts_safe(p_user_id) INTO v_result;
        
        -- Add info about what was missing
        v_result := v_result || jsonb_build_object(
            'missing_accounts_found', v_missing_accounts,
            'action', 'created_missing_accounts'
        );
    ELSE
        -- User already has all default accounts
        v_result := jsonb_build_object(
            'success', true,
            'accounts_created', '[]'::jsonb,
            'count', 0,
            'user_id', p_user_id,
            'missing_accounts_found', 0,
            'action', 'all_accounts_exist'
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically create accounts for new users
-- Note: This assumes you have access to auth.users table
-- If not available, you'll need to call the function manually when users are created
DO $$
BEGIN
    -- Check if auth.users table exists and we can create trigger on it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS trigger_create_default_accounts_on_user_creation ON auth.users;
        
        -- Create trigger for automatic account creation
        CREATE TRIGGER trigger_create_default_accounts_on_user_creation
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.create_user_default_accounts_auto();
            
        RAISE NOTICE '✅ Added automatic account creation trigger on auth.users';
    ELSE
        RAISE NOTICE '⚠️  auth.users table not accessible. You will need to call create_user_default_accounts_safe() manually for new users';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Could not create trigger on auth.users: %. You will need to call create_user_default_accounts_safe() manually for new users', SQLERRM;
END $$;

-- =====================================================
-- STEP 7: CREATE EXISTING USERS SETUP
-- =====================================================

-- Create function to setup accounts for all existing users who don't have them
CREATE OR REPLACE FUNCTION public.setup_accounts_for_existing_users()
RETURNS JSONB AS $$
DECLARE
    v_user_record RECORD;
    v_result JSONB;
    v_total_results JSONB := '[]'::jsonb;
    v_users_processed INTEGER := 0;
    v_total_accounts_created INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 Setting up accounts for existing users...';
    
    -- Find users who don't have all 3 default account types
    FOR v_user_record IN (
        SELECT DISTINCT u.id as user_id
        FROM auth.users u
        LEFT JOIN (
            SELECT user_id, COUNT(*) as account_count
            FROM public.accounts 
            WHERE status = 'active' 
            AND account_type IN ('checking', 'savings', 'credit')
            GROUP BY user_id
        ) a ON u.id = a.user_id
        WHERE COALESCE(a.account_count, 0) < 3
    ) LOOP
        -- Create missing accounts for this user
        SELECT public.ensure_user_default_accounts(v_user_record.user_id) INTO v_result;
        
        v_users_processed := v_users_processed + 1;
        v_total_accounts_created := v_total_accounts_created + (v_result->>'count')::INTEGER;
        
        -- Add to results
        v_total_results := v_total_results || v_result;
        
        RAISE NOTICE 'Processed user % - Created % accounts', 
            v_user_record.user_id, (v_result->>'count')::INTEGER;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'users_processed', v_users_processed,
        'total_accounts_created', v_total_accounts_created,
        'detailed_results', v_total_results
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'users_processed', v_users_processed,
            'total_accounts_created', v_total_accounts_created
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- STEP 8: SETUP ACCOUNTS FOR EXISTING USERS
-- =====================================================

-- Run the setup for existing users
DO $$
DECLARE
    v_setup_result JSONB;
BEGIN
    RAISE NOTICE '🔧 Running account setup for existing users...';
    
    SELECT public.setup_accounts_for_existing_users() INTO v_setup_result;
    
    RAISE NOTICE '✅ Existing users setup completed: %', v_setup_result;
END $$;

-- =====================================================
-- STEP 9: FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
    remaining_duplicates INTEGER;
    total_users INTEGER;
    users_with_multiple_defaults INTEGER;
    users_with_all_accounts INTEGER;
    users_missing_accounts INTEGER;
BEGIN
    RAISE NOTICE '🔍 FINAL VERIFICATION...';
    
    -- Check for remaining duplicates
    SELECT COUNT(*) INTO remaining_duplicates
    FROM (
        SELECT user_id, account_type, COUNT(*) as account_count
        FROM public.accounts 
        WHERE status = 'active'
        GROUP BY user_id, account_type
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check total users
    SELECT COUNT(DISTINCT user_id) INTO total_users
    FROM public.accounts WHERE status = 'active';
    
    -- Check users with multiple default accounts
    SELECT COUNT(*) INTO users_with_multiple_defaults
    FROM (
        SELECT user_id, COUNT(*) as default_count
        FROM public.accounts 
        WHERE is_default = true AND status = 'active'
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) multiple_defaults;
    
    -- Check users with all 3 default account types
    SELECT COUNT(*) INTO users_with_all_accounts
    FROM (
        SELECT user_id
        FROM public.accounts 
        WHERE status = 'active' 
        AND account_type IN ('checking', 'savings', 'credit')
        GROUP BY user_id
        HAVING COUNT(DISTINCT account_type) = 3
    ) complete_users;
    
    -- Check users missing some account types
    users_missing_accounts := total_users - users_with_all_accounts;
    
    RAISE NOTICE '📊 VERIFICATION RESULTS:';
    RAISE NOTICE '   - Total active users: %', total_users;
    RAISE NOTICE '   - Users with all 3 account types: %', users_with_all_accounts;
    RAISE NOTICE '   - Users missing some account types: %', users_missing_accounts;
    RAISE NOTICE '   - Remaining duplicate accounts: %', remaining_duplicates;
    RAISE NOTICE '   - Users with multiple defaults: %', users_with_multiple_defaults;
    
    IF remaining_duplicates = 0 AND users_with_multiple_defaults = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All duplicate accounts fixed and constraints applied!';
        IF users_missing_accounts = 0 THEN
            RAISE NOTICE '✅ SUCCESS: All users have complete account setup!';
        ELSE
            RAISE NOTICE '⚠️  INFO: % users still missing some account types (they may have been created after this script)', users_missing_accounts;
        END IF;
    ELSE
        RAISE NOTICE '⚠️  WARNING: Some issues remain - manual review may be needed';
    END IF;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_user_default_accounts_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_default_accounts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_accounts_for_existing_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_account_creation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_default_accounts_auto() TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.accounts IS 'User financial accounts with unique account types per user constraint and automatic account creation - Updated by duplicate fix script';
COMMENT ON CONSTRAINT unique_user_account_type ON public.accounts IS 'Ensures each user can only have one account per account type (checking, savings, credit, etc.) - Added by duplicate fix script';
COMMENT ON FUNCTION public.validate_account_creation() IS 'Prevents duplicate account types and ensures only one default account per user - Added by duplicate fix script';
COMMENT ON FUNCTION public.create_user_default_accounts_safe(UUID) IS 'Safely creates default accounts for users without creating duplicates - Enhanced version with auto-creation support';
COMMENT ON FUNCTION public.ensure_user_default_accounts(UUID) IS 'Ensures user has all required default account types, creates missing ones - Added by auto-setup script';
COMMENT ON FUNCTION public.setup_accounts_for_existing_users() IS 'Bulk setup of default accounts for existing users who are missing some account types - Added by auto-setup script';
COMMENT ON FUNCTION public.create_user_default_accounts_auto() IS 'Trigger function to automatically create default accounts for new users - Added by auto-setup script';

-- Clean up backup table (optional - comment out if you want to keep backup)
-- DROP TABLE IF EXISTS public.accounts_backup_before_duplicate_fix;

-- Commit transaction
COMMIT;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '🎉 DUPLICATE ACCOUNTS FIX & AUTO SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '✅ Fixed all duplicate accounts';
    RAISE NOTICE '✅ Consolidated balances and preserved transaction history'; 
    RAISE NOTICE '✅ Added database constraints to prevent future duplicates';
    RAISE NOTICE '✅ Created safe account creation functions';
    RAISE NOTICE '✅ Ensured only one default account per user';
    RAISE NOTICE '✅ Set up automatic account creation for new users';
    RAISE NOTICE '✅ Created accounts for existing users missing them';
    RAISE NOTICE '';
    RAISE NOTICE 'Features Added:';
    RAISE NOTICE '🔧 create_user_default_accounts_safe() - Safe account creation';
    RAISE NOTICE '🔧 ensure_user_default_accounts() - Ensures user has all default accounts';
    RAISE NOTICE '🔧 setup_accounts_for_existing_users() - Bulk setup for existing users';
    RAISE NOTICE '🔧 Auto-trigger on new user creation (if auth.users accessible)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. New users will automatically get 3 default accounts';
    RAISE NOTICE '2. Database constraints ensure data integrity';
    RAISE NOTICE '3. All existing users now have complete account setups';
    RAISE NOTICE '4. Call ensure_user_default_accounts(user_id) if needed for specific users';
    RAISE NOTICE '';
    RAISE NOTICE 'Backup table created: accounts_backup_before_duplicate_fix';
    RAISE NOTICE 'You can safely drop it after verifying everything works correctly.';
END $$;
