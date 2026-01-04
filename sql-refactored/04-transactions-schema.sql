
-- =====================================================
-- CLEANUP EXISTING OBJECTS
-- =====================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can manage their own income categories" ON public.income_categories;
DROP POLICY IF EXISTS "Users can manage their own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;

-- Drop all existing triggers
DROP TRIGGER IF EXISTS accounts_updated_at ON public.accounts;
DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS auto_create_categories_trigger ON auth.users;
DROP TRIGGER IF EXISTS update_account_balance_trigger ON public.transactions;

-- Drop all existing functions
DROP FUNCTION IF EXISTS public.auto_create_categories_for_new_user();
DROP FUNCTION IF EXISTS public.update_account_balance();
DROP FUNCTION IF EXISTS public.create_transfer(UUID, UUID, DECIMAL, TEXT, DATE, UUID);
DROP FUNCTION IF EXISTS public.recalculate_account_balance(UUID);
DROP FUNCTION IF EXISTS public.create_default_categories(UUID);
DROP FUNCTION IF EXISTS public.populate_categories_for_existing_users();
DROP FUNCTION IF EXISTS public.user_has_default_categories(UUID);
DROP FUNCTION IF EXISTS public.ensure_user_categories(UUID);

-- Drop all existing views
DROP VIEW IF EXISTS public.transaction_details;
DROP VIEW IF EXISTS public.account_summary;

-- Drop all existing tables
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.income_categories CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;

-- =====================================================
-- 11-TRANSACTIONS-SCHEMA.SQL
-- =====================================================
-- Module: Transaction Management System
-- Purpose: Complete transaction tracking with accounts, categories, and transfers
-- Dependencies: 02-auth-schema.sql, 12-shared-schema.sql
-- Backend Service: transactionService.ts
-- Frontend Components: src/components/transactions/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: React frontend, Supabase backend
-- =====================================================

-- =====================================================
-- ACCOUNTS MANAGEMENT
-- =====================================================

-- Accounts table for managing user financial accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit', 'investment', 'cash', 'other')),
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    initial_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Account status and metadata
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
    is_default BOOLEAN DEFAULT false,
    color VARCHAR(7), -- Color field for UI customization
    description TEXT,
    
    -- Institution details (optional)
    institution_name TEXT,
    account_number_masked TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_balance CHECK (
        CASE 
            WHEN account_type = 'credit' THEN balance <= 0 
            ELSE true 
        END
    )
);

-- =====================================================
-- INCOME CATEGORIES
-- =====================================================

-- Income categories for transaction classification
CREATE TABLE IF NOT EXISTS public.income_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#4CAF50',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique category names per user
    UNIQUE(user_id, category_name)
);

-- =====================================================
-- EXPENSE CATEGORIES
-- =====================================================

-- Expense categories for transaction classification
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#F44336',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Budget tracking
    monthly_budget DECIMAL(12, 2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique category names per user
    UNIQUE(user_id, category_name)
);

-- =====================================================
-- CORE TRANSACTIONS TABLE
-- =====================================================

-- Main transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction details
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    notes TEXT,
    
    -- Transaction type and classification
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'contribution')),
    category TEXT, -- Generic category for backward compatibility
    
    -- Foreign key relationships
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    income_category_id UUID REFERENCES public.income_categories(id) ON DELETE SET NULL,
    expense_category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    
    -- Transfer tracking
    transfer_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    
    -- Metadata
    tags TEXT[],
    receipt_url TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern JSONB,
    
    -- Status tracking
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    is_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_category_assignment CHECK (
        CASE 
            WHEN type = 'income' THEN income_category_id IS NOT NULL
            WHEN type = 'expense' THEN expense_category_id IS NOT NULL
            WHEN type = 'transfer' THEN transfer_account_id IS NOT NULL
            ELSE true
        END
    ),
    
    CONSTRAINT no_self_transfer CHECK (account_id != transfer_account_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Account indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_default ON public.accounts(user_id, is_default) WHERE is_default = true;

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_income_categories_user_id ON public.income_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_income_categories_active ON public.income_categories(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON public.expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON public.expense_categories(user_id, is_active) WHERE is_active = true;

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_income_category ON public.transactions(income_category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_expense_category ON public.transactions(expense_category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON public.transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Account policies
CREATE POLICY "Users can manage their own accounts"
    ON public.accounts FOR ALL
    USING (auth.uid() = user_id);

-- Income category policies
CREATE POLICY "Users can manage their own income categories"
    ON public.income_categories FOR ALL
    USING (auth.uid() = user_id);

-- Expense category policies
CREATE POLICY "Users can manage their own expense categories"
    ON public.expense_categories FOR ALL
    USING (auth.uid() = user_id);

-- Transaction policies
CREATE POLICY "Users can manage their own transactions"
    ON public.transactions FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp triggers
CREATE TRIGGER accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Trigger to automatically create default categories for new users
CREATE OR REPLACE FUNCTION public.auto_create_categories_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default categories when user first appears in any auth-related action
    PERFORM public.create_default_categories(NEW.id);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to create default categories for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to auth.users table
CREATE TRIGGER auto_create_categories_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_categories_for_new_user();

-- =====================================================
-- TRANSACTION MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to update account balance when transactions change
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        -- Update primary account
        IF NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + CASE
                WHEN NEW.type = 'income' THEN NEW.amount
                WHEN NEW.type = 'expense' THEN -NEW.amount
                WHEN NEW.type = 'transfer' THEN -NEW.amount
                ELSE 0
            END
            WHERE id = NEW.account_id;
        END IF;
        
        -- Update transfer account for transfers
        IF NEW.type = 'transfer' AND NEW.transfer_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + NEW.amount
            WHERE id = NEW.transfer_account_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Reverse old transaction effects
        IF OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - CASE
                WHEN OLD.type = 'income' THEN OLD.amount
                WHEN OLD.type = 'expense' THEN -OLD.amount
                WHEN OLD.type = 'transfer' THEN -OLD.amount
                ELSE 0
            END
            WHERE id = OLD.account_id;
        END IF;
        
        IF OLD.type = 'transfer' AND OLD.transfer_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - OLD.amount
            WHERE id = OLD.transfer_account_id;
        END IF;
        
        -- Apply new transaction effects
        IF NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + CASE
                WHEN NEW.type = 'income' THEN NEW.amount
                WHEN NEW.type = 'expense' THEN -NEW.amount
                WHEN NEW.type = 'transfer' THEN -NEW.amount
                ELSE 0
            END
            WHERE id = NEW.account_id;
        END IF;
        
        IF NEW.type = 'transfer' AND NEW.transfer_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + NEW.amount
            WHERE id = NEW.transfer_account_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        -- Reverse transaction effects
        IF OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - CASE
                WHEN OLD.type = 'income' THEN OLD.amount
                WHEN OLD.type = 'expense' THEN -OLD.amount
                WHEN OLD.type = 'transfer' THEN -OLD.amount
                ELSE 0
            END
            WHERE id = OLD.account_id;
        END IF;
        
        IF OLD.type = 'transfer' AND OLD.transfer_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - OLD.amount
            WHERE id = OLD.transfer_account_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger
CREATE TRIGGER update_account_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- Function to create transfer transaction pair
CREATE OR REPLACE FUNCTION public.create_transfer(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_date DATE DEFAULT CURRENT_DATE,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
    v_from_transaction_id UUID;
    v_to_transaction_id UUID;
    v_from_account RECORD;
    v_to_account RECORD;
BEGIN
    -- Validate accounts exist and belong to user
    SELECT * INTO v_from_account FROM public.accounts 
    WHERE id = p_from_account_id AND user_id = p_user_id;
    
    SELECT * INTO v_to_account FROM public.accounts 
    WHERE id = p_to_account_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'One or both accounts not found or do not belong to user';
    END IF;
    
    -- Check sufficient balance
    IF v_from_account.balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance in source account';
    END IF;
    
    -- Create outgoing transaction
    INSERT INTO public.transactions (
        user_id, date, amount, description, type,
        account_id, transfer_account_id
    ) VALUES (
        p_user_id, p_date, p_amount, p_description, 'transfer',
        p_from_account_id, p_to_account_id
    ) RETURNING id INTO v_from_transaction_id;
    
    -- Create incoming transaction
    INSERT INTO public.transactions (
        user_id, date, amount, description, type,
        account_id, transfer_account_id, linked_transaction_id
    ) VALUES (
        p_user_id, p_date, p_amount, p_description, 'transfer',
        p_to_account_id, p_from_account_id, v_from_transaction_id
    ) RETURNING id INTO v_to_transaction_id;
    
    -- Link the transactions
    UPDATE public.transactions
    SET linked_transaction_id = v_to_transaction_id
    WHERE id = v_from_transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'from_transaction_id', v_from_transaction_id,
        'to_transaction_id', v_to_transaction_id,
        'amount', p_amount,
        'from_account', v_from_account.account_name,
        'to_account', v_to_account.account_name
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate account balance
CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_calculated_balance DECIMAL := 0;
    v_initial_balance DECIMAL;
    v_account_type TEXT;
BEGIN
    -- Get account details
    SELECT initial_balance, account_type 
    INTO v_initial_balance, v_account_type
    FROM public.accounts 
    WHERE id = p_account_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found';
    END IF;
    
    -- Calculate balance from transactions
    SELECT 
        v_initial_balance + COALESCE(SUM(
            CASE
                WHEN type = 'income' THEN amount
                WHEN type = 'expense' THEN -amount
                WHEN type = 'transfer' AND account_id = p_account_id THEN -amount
                WHEN type = 'transfer' AND transfer_account_id = p_account_id THEN amount
                ELSE 0
            END
        ), 0)
    INTO v_calculated_balance
    FROM public.transactions
    WHERE (account_id = p_account_id OR transfer_account_id = p_account_id)
    AND status = 'completed';
    
    -- Update account balance
    UPDATE public.accounts
    SET balance = v_calculated_balance,
        updated_at = now()
    WHERE id = p_account_id;
    
    RETURN v_calculated_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONVENIENCE VIEWS
-- =====================================================
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
    a.currency as account_currency,
    
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
    
    -- Formatted amounts
    public.format_currency(t.amount, COALESCE(a.currency, 'USD')) as formatted_amount
    
FROM public.transactions t
LEFT JOIN public.accounts a ON t.account_id = a.id
LEFT JOIN public.accounts ta ON t.transfer_account_id = ta.id
LEFT JOIN public.income_categories ic ON t.income_category_id = ic.id
LEFT JOIN public.expense_categories ec ON t.expense_category_id = ec.id
LEFT JOIN public.goals g ON t.goal_id = g.id;

-- Account summary view
CREATE OR REPLACE VIEW public.account_summary AS
SELECT
    a.id,
    a.user_id,
    a.account_name,
    a.account_type,
    a.balance,
    a.initial_balance,
    a.currency,
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
    
    -- Formatted balance
    public.format_currency(a.balance, a.currency) as formatted_balance
    
FROM public.accounts a
LEFT JOIN public.transactions t ON a.id = t.account_id
GROUP BY a.id, a.user_id, a.account_name, a.account_type, a.balance, 
         a.initial_balance, a.currency, a.status, a.is_default, a.created_at;

-- =====================================================
-- AUTOMATED CATEGORY MANAGEMENT
-- =====================================================

-- Enhanced function to create default categories for users
CREATE OR REPLACE FUNCTION public.create_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Create default income categories
    INSERT INTO public.income_categories (user_id, category_name, icon, color, is_default, description) VALUES
    (p_user_id, 'Salary', '💰', '#4CAF50', true, 'Regular employment income'),
    (p_user_id, 'Freelance', '💻', '#2196F3', true, 'Freelance and contract work'),
    (p_user_id, 'Investment Returns', '📈', '#FF9800', true, 'Dividends, interest, and capital gains'),
    (p_user_id, 'Rental Income', '🏠', '#8BC34A', true, 'Income from rental properties'),
    (p_user_id, 'Business Income', '🏢', '#9C27B0', true, 'Income from business operations'),
    (p_user_id, 'Side Hustle', '🚀', '#FF5722', true, 'Income from side projects and gigs'),
    (p_user_id, 'Gifts & Bonuses', '🎁', '#E91E63', true, 'Unexpected income and bonuses'),
    (p_user_id, 'Other Income', '💵', '#607D8B', true, 'Miscellaneous income sources')
    ON CONFLICT (user_id, category_name) DO NOTHING;
    
    -- Create default expense categories
    INSERT INTO public.expense_categories (user_id, category_name, icon, color, is_default, description, monthly_budget) VALUES
    (p_user_id, 'Housing', '🏠', '#F44336', true, 'Rent, mortgage, and housing costs', 1200.00),
    (p_user_id, 'Transportation', '🚗', '#2196F3', true, 'Car payments, gas, public transport', 400.00),
    (p_user_id, 'Food & Dining', '🍽️', '#FF9800', true, 'Restaurants and dining out', 300.00),
    (p_user_id, 'Groceries', '🛒', '#4CAF50', true, 'Food and household supplies', 500.00),
    (p_user_id, 'Utilities', '💡', '#FFEB3B', true, 'Electricity, water, gas, internet', 200.00),
    (p_user_id, 'Healthcare', '⚕️', '#E91E63', true, 'Medical expenses and insurance', 150.00),
    (p_user_id, 'Entertainment', '🎬', '#9C27B0', true, 'Movies, games, subscriptions', 100.00),
    (p_user_id, 'Shopping', '🛍️', '#FF5722', true, 'Clothing and personal items', 200.00),
    (p_user_id, 'Education', '📚', '#3F51B5', true, 'Books, courses, and learning', 100.00),
    (p_user_id, 'Insurance', '🛡️', '#607D8B', true, 'Life, auto, and other insurance', 300.00),
    (p_user_id, 'Personal Care', '💅', '#795548', true, 'Haircuts, cosmetics, spa', 75.00),
    (p_user_id, 'Travel', '✈️', '#00BCD4', true, 'Vacation and travel expenses', 200.00),
    (p_user_id, 'Gifts & Donations', '🎁', '#E91E63', true, 'Gifts and charitable giving', 100.00),
    (p_user_id, 'Investments', '💰', '#4CAF50', true, 'Investment contributions', 500.00),
    (p_user_id, 'Debt Payments', '💳', '#F44336', true, 'Credit cards and loan payments', 300.00),
    (p_user_id, 'Other Expenses', '💸', '#9E9E9E', true, 'Miscellaneous expenses', 100.00)
    ON CONFLICT (user_id, category_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure all existing users have default categories
CREATE OR REPLACE FUNCTION public.populate_categories_for_existing_users()
RETURNS JSONB AS $$
DECLARE
    user_record RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
    error_details TEXT[] := '{}';
BEGIN
    -- Loop through all existing users in auth.users
    FOR user_record IN 
        SELECT id FROM auth.users 
        WHERE id NOT IN (
            SELECT DISTINCT user_id FROM public.income_categories 
            WHERE is_default = true
        )
    LOOP
        BEGIN
            -- Create default categories for this user
            PERFORM public.create_default_categories(user_record.id);
            processed_count := processed_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                error_details := array_append(error_details, 
                    format('User %s: %s', user_record.id, SQLERRM));
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'processed_users', processed_count,
        'error_count', error_count,
        'errors', error_details,
        'message', format('Processed %s users with %s errors', processed_count, error_count)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'processed_users', processed_count,
            'error_count', error_count
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has default categories
CREATE OR REPLACE FUNCTION public.user_has_default_categories(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    income_count INTEGER;
    expense_count INTEGER;
BEGIN
    -- Count default categories for the user
    SELECT COUNT(*) INTO income_count 
    FROM public.income_categories 
    WHERE user_id = p_user_id AND is_default = true;
    
    SELECT COUNT(*) INTO expense_count 
    FROM public.expense_categories 
    WHERE user_id = p_user_id AND is_default = true;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'has_income_categories', income_count > 0,
        'has_expense_categories', expense_count > 0,
        'income_count', income_count,
        'expense_count', expense_count,
        'is_fully_setup', income_count > 0 AND expense_count > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure categories exist for a specific user (manual trigger)
CREATE OR REPLACE FUNCTION public.ensure_user_categories(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
    category_status JSONB;
BEGIN
    -- Check current status
    SELECT public.user_has_default_categories(p_user_id) INTO category_status;
    
    -- Create categories if missing
    IF (category_status->>'is_fully_setup')::boolean = false THEN
        PERFORM public.create_default_categories(p_user_id);
        
        -- Get updated status
        SELECT public.user_has_default_categories(p_user_id) INTO category_status;
        
        RETURN jsonb_build_object(
            'success', true,
            'action', 'created_categories',
            'status', category_status
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'action', 'already_exists',
            'status', category_status
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'user_id', p_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;

-- Grant permissions on views
GRANT SELECT ON public.transaction_details TO authenticated;
GRANT SELECT ON public.account_summary TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.create_transfer(UUID, UUID, DECIMAL, TEXT, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_account_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_categories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.populate_categories_for_existing_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_default_categories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_categories(UUID) TO authenticated;

-- Grant permissions for automatic category creation

GRANT EXECUTE ON FUNCTION public.auto_create_categories_for_new_user() TO authenticated;
