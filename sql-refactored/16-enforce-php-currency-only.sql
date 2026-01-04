-- =====================================================
-- 16-ENFORCE-PHP-CURRENCY-ONLY.SQL
-- =====================================================
-- Module: Currency Enforcement Migration
-- Purpose: Remove multi-currency support and enforce PHP as the only currency
-- Dependencies: All schema files with currency columns
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-11-18
-- =====================================================

-- Log migration start
DO $$
BEGIN
    RAISE NOTICE 'MIGRATION START: Enforcing PHP currency only across all tables';
    RAISE NOTICE 'Timestamp: %', now();
END $$;

-- =====================================================
-- STEP 1: UPDATE USER_SETTINGS TABLE
-- =====================================================

DO $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Step 1: Updating user_settings table...';
    
    -- Update all existing records to PHP
    UPDATE public.user_settings 
    SET default_currency = 'PHP' 
    WHERE default_currency != 'PHP';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % user_settings records to PHP', v_updated_count;
    
    -- Change default value to PHP
    ALTER TABLE public.user_settings 
        ALTER COLUMN default_currency SET DEFAULT 'PHP';
    
    -- Add check constraint to enforce PHP only
    ALTER TABLE public.user_settings 
        DROP CONSTRAINT IF EXISTS check_currency_php;
    
    ALTER TABLE public.user_settings 
        ADD CONSTRAINT check_currency_php CHECK (default_currency = 'PHP');
    
    RAISE NOTICE 'Added constraint: user_settings.default_currency must be PHP';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating user_settings: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 2: UPDATE ACCOUNTS TABLE
-- =====================================================

DO $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Step 2: Updating accounts table...';
    
    -- Update all existing records to PHP
    UPDATE public.accounts 
    SET currency = 'PHP' 
    WHERE currency != 'PHP';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % accounts records to PHP', v_updated_count;
    
    -- Change default value to PHP
    ALTER TABLE public.accounts 
        ALTER COLUMN currency SET DEFAULT 'PHP';
    
    -- Add check constraint to enforce PHP only
    ALTER TABLE public.accounts 
        DROP CONSTRAINT IF EXISTS check_account_currency_php;
    
    ALTER TABLE public.accounts 
        ADD CONSTRAINT check_account_currency_php CHECK (currency = 'PHP');
    
    RAISE NOTICE 'Added constraint: accounts.currency must be PHP';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating accounts: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 3: UPDATE BUDGETS TABLE
-- =====================================================

DO $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Step 3: Updating budgets table...';
    
    -- Update all existing records to PHP
    UPDATE public.budgets 
    SET currency = 'PHP' 
    WHERE currency != 'PHP';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % budgets records to PHP', v_updated_count;
    
    -- Change default value to PHP
    ALTER TABLE public.budgets 
        ALTER COLUMN currency SET DEFAULT 'PHP';
    
    -- Add check constraint to enforce PHP only
    ALTER TABLE public.budgets 
        DROP CONSTRAINT IF EXISTS check_budget_currency_php;
    
    ALTER TABLE public.budgets 
        ADD CONSTRAINT check_budget_currency_php CHECK (currency = 'PHP');
    
    RAISE NOTICE 'Added constraint: budgets.currency must be PHP';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating budgets: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 4: UPDATE GOALS TABLE
-- =====================================================

DO $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Step 4: Updating goals table...';
    
    -- Update all existing records to PHP
    UPDATE public.goals 
    SET currency = 'PHP' 
    WHERE currency != 'PHP';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % goals records to PHP', v_updated_count;
    
    -- Change default value to PHP
    ALTER TABLE public.goals 
        ALTER COLUMN currency SET DEFAULT 'PHP';
    
    -- Add check constraint to enforce PHP only
    ALTER TABLE public.goals 
        DROP CONSTRAINT IF EXISTS check_goal_currency_php;
    
    ALTER TABLE public.goals 
        ADD CONSTRAINT check_goal_currency_php CHECK (currency = 'PHP');
    
    RAISE NOTICE 'Added constraint: goals.currency must be PHP';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating goals: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 5: UPDATE FAMILIES TABLE
-- =====================================================

DO $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Step 5: Updating families table...';
    
    -- Update all existing records to PHP
    UPDATE public.families 
    SET currency_pref = 'PHP' 
    WHERE currency_pref != 'PHP';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % families records to PHP', v_updated_count;
    
    -- Change default value to PHP
    ALTER TABLE public.families 
        ALTER COLUMN currency_pref SET DEFAULT 'PHP';
    
    -- Add check constraint to enforce PHP only
    ALTER TABLE public.families 
        DROP CONSTRAINT IF EXISTS check_family_currency_php;
    
    ALTER TABLE public.families 
        ADD CONSTRAINT check_family_currency_php CHECK (currency_pref = 'PHP');
    
    RAISE NOTICE 'Added constraint: families.currency_pref must be PHP';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating families: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 6: UPDATE CURRENCY VALIDATION FUNCTION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 6: Updating currency validation function...';
    
    -- Update is_valid_currency_code to only accept PHP
    CREATE OR REPLACE FUNCTION public.is_valid_currency_code(currency_code TEXT)
    RETURNS BOOLEAN AS $func$
    BEGIN
        -- Only PHP is valid now
        RETURN currency_code = 'PHP';
    END;
    $func$ LANGUAGE plpgsql IMMUTABLE;
    
    RAISE NOTICE 'Updated is_valid_currency_code function to only accept PHP';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating currency validation function: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 7: UPDATE FORMAT_CURRENCY FUNCTION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 7: Updating format_currency function...';
    
    -- Update format_currency to always use PHP
    CREATE OR REPLACE FUNCTION public.format_currency(
        amount DECIMAL,
        currency_code TEXT DEFAULT 'PHP',
        include_symbol BOOLEAN DEFAULT true
    )
    RETURNS TEXT AS $func$
    DECLARE
        formatted_amount TEXT;
    BEGIN
        -- Always format as PHP with 2 decimal places (centavo support)
        formatted_amount := to_char(amount, 'FM999,999,999,990.00');
        
        IF include_symbol THEN
            RETURN '₱' || formatted_amount;
        ELSE
            RETURN formatted_amount;
        END IF;
    END;
    $func$ LANGUAGE plpgsql IMMUTABLE;
    
    RAISE NOTICE 'Updated format_currency function to always use PHP (₱)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating format_currency function: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 8: UPDATE CONVERT_CURRENCY FUNCTION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 8: Updating convert_currency function...';
    
    -- Update convert_currency to always return the same amount (no conversion needed)
    CREATE OR REPLACE FUNCTION public.convert_currency(
        amount DECIMAL,
        from_currency TEXT,
        to_currency TEXT,
        rate DECIMAL DEFAULT 1.0
    )
    RETURNS DECIMAL AS $func$
    BEGIN
        -- Since we only support PHP, always return the original amount
        RETURN amount;
    END;
    $func$ LANGUAGE plpgsql IMMUTABLE;
    
    RAISE NOTICE 'Updated convert_currency function (no conversion needed for PHP-only)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating convert_currency function: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 9: UPDATE VIEWS THAT REFERENCE CURRENCY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 9: Refreshing views that reference currency...';
    
    -- Refresh transaction_details view
    CREATE OR REPLACE VIEW public.transaction_details AS
    SELECT
        t.id,
        t.user_id,
        t.date,
        t.amount,
        t.description,
        t.notes,
        t.type,
        t.category,
        t.status,
        t.tags,
        t.receipt_url,
        t.is_recurring,
        t.is_verified,
        t.created_at,
        t.updated_at,
        
        -- Account information
        a.account_name,
        a.account_type,
        'PHP' as account_currency,  -- Always PHP now
        
        -- Transfer account information
        ta.account_name as transfer_account_name,
        ta.account_type as transfer_account_type,
        
        -- Category information
        ic.category_name as income_category_name,
        ic.icon as income_category_icon,
        ic.color as income_category_color,
        ec.category_name as expense_category_name,
        ec.icon as expense_category_icon,
        ec.color as expense_category_color,
        
        -- Goal information
        g.goal_name,
        g.target_amount as goal_target_amount,
        g.current_amount as goal_current_amount,
        
        -- Formatted amounts (always PHP)
        public.format_currency(t.amount, 'PHP') as formatted_amount
        
    FROM public.transactions t
    LEFT JOIN public.accounts a ON t.account_id = a.id
    LEFT JOIN public.accounts ta ON t.transfer_account_id = ta.id
    LEFT JOIN public.income_categories ic ON t.income_category_id = ic.id
    LEFT JOIN public.expense_categories ec ON t.expense_category_id = ec.id
    LEFT JOIN public.goals g ON t.goal_id = g.id;
    
    RAISE NOTICE 'Refreshed transaction_details view';
    
    -- Refresh account_summary view
    CREATE OR REPLACE VIEW public.account_summary AS
    SELECT
        a.id,
        a.user_id,
        a.account_name,
        a.account_type,
        a.balance,
        a.initial_balance,
        'PHP' as currency,  -- Always PHP now
        a.status,
        a.is_default,
        a.created_at,
        
        -- Transaction counts
        COUNT(t.id) as transaction_count,
        COUNT(CASE WHEN t.type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN t.type = 'expense' THEN 1 END) as expense_count,
        COUNT(CASE WHEN t.type = 'transfer' THEN 1 END) as transfer_count,
        
        -- Amount totals
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as total_expenses,
        
        -- Formatted balance (always PHP)
        public.format_currency(a.balance, 'PHP') as formatted_balance
        
    FROM public.accounts a
    LEFT JOIN public.transactions t ON a.id = t.account_id
    GROUP BY a.id, a.user_id, a.account_name, a.account_type, a.balance, 
             a.initial_balance, a.status, a.is_default, a.created_at;
    
    RAISE NOTICE 'Refreshed account_summary view';
    
    -- Refresh budget_details view
    CREATE OR REPLACE VIEW public.budget_details AS
    SELECT
        b.id,
        b.user_id,
        b.budget_name,
        b.description,
        b.amount,
        b.spent,
        'PHP' as currency,  -- Always PHP now
        b.period,
        b.start_date,
        b.end_date,
        b.status,
        b.is_recurring,
        b.alert_threshold,
        b.alert_enabled,
        b.rollover_enabled,
        b.created_at,
        b.updated_at,
        
        -- Calculations
        (b.amount - b.spent) AS remaining,
        public.safe_percentage(b.spent, b.amount) AS percentage_used,
        
        -- Status indicators
        CASE
            WHEN b.spent >= b.amount THEN 'exceeded'
            WHEN public.safe_percentage(b.spent, b.amount) >= (b.alert_threshold * 100) THEN 'warning'
            WHEN public.safe_percentage(b.spent, b.amount) >= 50 THEN 'moderate'
            ELSE 'good'
        END AS status_indicator,
        
        -- Category information
        ec.category_name,
        ec.icon as category_icon,
        ec.color as category_color,
        COALESCE(ec.category_name, b.category_name) as display_category,
        
        -- Formatted amounts (always PHP)
        public.format_currency(b.amount, 'PHP') as formatted_amount,
        public.format_currency(b.spent, 'PHP') as formatted_spent,
        public.format_currency(b.amount - b.spent, 'PHP') as formatted_remaining,
        
        -- Period information
        CASE
            WHEN b.end_date < CURRENT_DATE THEN 'expired'
            WHEN b.start_date > CURRENT_DATE THEN 'future'
            ELSE 'active'
        END AS period_status,
        
        -- Days remaining
        GREATEST(0, b.end_date - CURRENT_DATE) AS days_remaining,
        
        -- Alert count
        (
            SELECT COUNT(*)
            FROM public.budget_alerts ba
            WHERE ba.budget_id = b.id AND ba.is_read = false
        ) AS unread_alerts
        
    FROM public.budgets b
    LEFT JOIN public.expense_categories ec ON b.category_id = ec.id;
    
    RAISE NOTICE 'Refreshed budget_details view';
    
    -- Refresh goal_details view
    CREATE OR REPLACE VIEW public.goal_details AS
    SELECT
        g.id,
        g.user_id,
        g.goal_name,
        g.description,
        g.target_amount,
        g.current_amount,
        'PHP' as currency,  -- Always PHP now
        g.target_date,
        g.priority,
        g.category,
        g.status,
        g.is_family_goal,
        g.created_at,
        g.updated_at,
        
        -- Calculations
        (g.target_amount - g.current_amount) AS remaining_amount,
        public.safe_percentage(g.current_amount, g.target_amount) AS percentage_complete,
        
        -- Status indicators
        CASE
            WHEN g.current_amount >= g.target_amount THEN 'completed'
            WHEN public.safe_percentage(g.current_amount, g.target_amount) >= 75 THEN 'near_completion'
            WHEN public.safe_percentage(g.current_amount, g.target_amount) >= 25 THEN 'in_progress'
            ELSE 'getting_started'
        END AS progress_status,
        
        -- Formatted amounts (always PHP)
        public.format_currency(g.target_amount, 'PHP') as formatted_target,
        public.format_currency(g.current_amount, 'PHP') as formatted_current,
        public.format_currency(g.target_amount - g.current_amount, 'PHP') as formatted_remaining,
        
        -- Contribution count
        (SELECT COUNT(*) FROM public.goal_contributions gc WHERE gc.goal_id = g.id) AS contribution_count
        
    FROM public.goals g;
    
    RAISE NOTICE 'Refreshed goal_details view';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error refreshing views: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- STEP 10: VERIFICATION
-- =====================================================

DO $$
DECLARE
    v_user_settings_count INTEGER;
    v_accounts_count INTEGER;
    v_budgets_count INTEGER;
    v_goals_count INTEGER;
    v_families_count INTEGER;
    v_total_non_php INTEGER := 0;
BEGIN
    RAISE NOTICE 'Step 10: Verifying migration...';
    
    -- Check user_settings
    SELECT COUNT(*) INTO v_user_settings_count 
    FROM public.user_settings 
    WHERE default_currency != 'PHP';
    
    -- Check accounts
    SELECT COUNT(*) INTO v_accounts_count 
    FROM public.accounts 
    WHERE currency != 'PHP';
    
    -- Check budgets
    SELECT COUNT(*) INTO v_budgets_count 
    FROM public.budgets 
    WHERE currency != 'PHP';
    
    -- Check goals
    SELECT COUNT(*) INTO v_goals_count 
    FROM public.goals 
    WHERE currency != 'PHP';
    
    -- Check families
    SELECT COUNT(*) INTO v_families_count 
    FROM public.families 
    WHERE currency_pref != 'PHP';
    
    v_total_non_php := v_user_settings_count + v_accounts_count + v_budgets_count + v_goals_count + v_families_count;
    
    IF v_total_non_php > 0 THEN
        RAISE WARNING 'Verification FAILED: Found % records with non-PHP currency', v_total_non_php;
        RAISE WARNING '  user_settings: %', v_user_settings_count;
        RAISE WARNING '  accounts: %', v_accounts_count;
        RAISE WARNING '  budgets: %', v_budgets_count;
        RAISE WARNING '  goals: %', v_goals_count;
        RAISE WARNING '  families: %', v_families_count;
    ELSE
        RAISE NOTICE 'Verification PASSED: All records use PHP currency';
        RAISE NOTICE '  ✓ user_settings: All records use PHP';
        RAISE NOTICE '  ✓ accounts: All records use PHP';
        RAISE NOTICE '  ✓ budgets: All records use PHP';
        RAISE NOTICE '  ✓ goals: All records use PHP';
        RAISE NOTICE '  ✓ families: All records use PHP';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error during verification: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETE: PHP Currency Enforcement';
    RAISE NOTICE 'All currency fields now default to PHP';
    RAISE NOTICE 'All existing records updated to PHP';
    RAISE NOTICE 'Check constraints added to prevent non-PHP values';
    RAISE NOTICE 'Currency functions updated for PHP-only support';
    RAISE NOTICE 'Timestamp: %', now();
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON CONSTRAINT check_currency_php ON public.user_settings IS 'Enforces PHP as the only valid currency';
COMMENT ON CONSTRAINT check_account_currency_php ON public.accounts IS 'Enforces PHP as the only valid currency';
COMMENT ON CONSTRAINT check_budget_currency_php ON public.budgets IS 'Enforces PHP as the only valid currency';
COMMENT ON CONSTRAINT check_goal_currency_php ON public.goals IS 'Enforces PHP as the only valid currency';
COMMENT ON CONSTRAINT check_family_currency_php ON public.families IS 'Enforces PHP as the only valid currency';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
