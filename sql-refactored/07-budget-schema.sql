-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own budgets" ON public.budgets;
    DROP POLICY IF EXISTS "Users can manage their own budget alerts" ON public.budget_alerts;
    DROP POLICY IF EXISTS "Users can manage their own budget categories" ON public.budget_categories;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS budgets_updated_at ON public.budgets;
    DROP TRIGGER IF EXISTS update_budget_spent_trigger ON public.transactions;
    DROP TRIGGER IF EXISTS budget_name_sanitization_trigger ON public.budgets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.update_budget_spent();
    DROP FUNCTION IF EXISTS public.check_budget_alerts(UUID);
    DROP FUNCTION IF EXISTS public.create_period_budget(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, DATE);
    DROP FUNCTION IF EXISTS public.rollover_budget(UUID);
    DROP FUNCTION IF EXISTS public.sanitize_budget_name(TEXT);
    DROP FUNCTION IF EXISTS public.validate_budget_name(TEXT);
    DROP FUNCTION IF EXISTS public.sanitize_budget_name_trigger();
    DROP FUNCTION IF EXISTS public.create_sample_budgets(UUID);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views
DROP VIEW IF EXISTS public.budget_details CASCADE;
DROP VIEW IF EXISTS public.budget_category_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_budgets_user_id;
DROP INDEX IF EXISTS public.idx_budgets_category_id;
DROP INDEX IF EXISTS public.idx_budgets_period;
DROP INDEX IF EXISTS public.idx_budgets_status;
DROP INDEX IF EXISTS public.idx_budgets_start_date;
DROP INDEX IF EXISTS public.idx_budgets_end_date;
DROP INDEX IF EXISTS public.idx_budgets_date_range;
DROP INDEX IF EXISTS public.idx_budgets_active;
DROP INDEX IF EXISTS public.idx_budget_alerts_budget_id;
DROP INDEX IF EXISTS public.idx_budget_alerts_user_id;
DROP INDEX IF EXISTS public.idx_budget_alerts_type;
DROP INDEX IF EXISTS public.idx_budget_alerts_unread;
DROP INDEX IF EXISTS public.idx_budget_alerts_triggered_at;
DROP INDEX IF EXISTS public.idx_budget_categories_budget_id;
DROP INDEX IF EXISTS public.idx_budget_categories_category_id;

-- Drop tables
DROP TABLE IF EXISTS public.budget_categories CASCADE;
DROP TABLE IF EXISTS public.budget_alerts CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;

-- =====================================================
-- 06-BUDGET-SCHEMA.SQL
-- =====================================================
-- Module: Budget Management System
-- Purpose: Budget creation, tracking, and automatic spending monitoring
-- Dependencies: 01-auth-schema.sql, 02-shared-schema.sql, 04-transactions-schema.sql
-- Backend Service: budgetService.ts
-- Frontend Components: src/components/budget/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: CreateBudget.tsx, BudgetList.tsx
-- =====================================================

-- =====================================================
-- CORE BUDGETS TABLE
-- =====================================================

-- Main budgets table with enhanced features
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Budget identification
    budget_name TEXT NOT NULL,
    description TEXT,
    
    -- Financial details with centavo precision
    amount DECIMAL(15, 4) NOT NULL CHECK (amount > 0),
    spent DECIMAL(15, 4) DEFAULT 0 NOT NULL CHECK (spent >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Period configuration
    period TEXT NOT NULL CHECK (period IN ('week', 'month', 'quarter', 'year', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Category relationship (flexible - can be expense category or custom)
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    category_name TEXT, -- Fallback for custom categories
    
    -- Status and configuration
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern JSONB DEFAULT '{}'::jsonb,
    
    -- Alert configuration
    alert_threshold DECIMAL(3, 2) DEFAULT 0.80 CHECK (alert_threshold BETWEEN 0 AND 1),
    alert_enabled BOOLEAN DEFAULT true,
    last_alert_sent TIMESTAMPTZ,
    
    -- Rollover configuration
    rollover_enabled BOOLEAN DEFAULT false,
    rollover_amount DECIMAL(15, 4) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT category_reference CHECK (
        category_id IS NOT NULL OR category_name IS NOT NULL
    )
);

-- =====================================================
-- BUDGET ALERTS TABLE
-- =====================================================

-- Table to track budget alerts and notifications
CREATE TABLE IF NOT EXISTS public.budget_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold', 'exceeded', 'weekly_summary', 'monthly_summary')),
    alert_level TEXT NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    
    -- Alert data
    triggered_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    threshold_percentage DECIMAL(5, 2),
    amount_spent DECIMAL(15, 4),
    budget_amount DECIMAL(15, 4),
    
    -- Delivery status
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- BUDGET CATEGORIES RELATIONSHIP
-- =====================================================

-- Many-to-many relationship for budgets that span multiple categories
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE NOT NULL,
    allocation_percentage DECIMAL(5, 2) DEFAULT 100.00 CHECK (allocation_percentage BETWEEN 0 AND 100),
    
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique budget-category pairs
    UNIQUE(budget_id, category_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Budget indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON public.budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_start_date ON public.budgets(start_date);
CREATE INDEX IF NOT EXISTS idx_budgets_end_date ON public.budgets(end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_date_range ON public.budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON public.budgets(user_id, status) WHERE status = 'active';

-- Alert indexes
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget_id ON public.budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON public.budget_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_type ON public.budget_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_unread ON public.budget_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_budget_alerts_triggered_at ON public.budget_alerts(triggered_at);

-- Budget categories indexes
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id ON public.budget_categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_category_id ON public.budget_categories(category_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Budget policies
CREATE POLICY "Users can manage their own budgets"
    ON public.budgets FOR ALL
    USING (auth.uid() = user_id);

-- Budget alert policies
CREATE POLICY "Users can manage their own budget alerts"
    ON public.budget_alerts FOR ALL
    USING (auth.uid() = user_id);

-- Budget categories policies
CREATE POLICY "Users can manage their own budget categories"
    ON public.budget_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets b
            WHERE b.id = budget_categories.budget_id
            AND b.user_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE TRIGGER budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================
-- CENTAVO PRECISION VALIDATION CONSTRAINTS
-- =====================================================

-- Fix threshold_percentage precision for percentage values up to 100%
DO $$
BEGIN
    -- Update threshold_percentage field to support values up to 999.99
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budget_alerts' 
        AND column_name = 'threshold_percentage'
        AND numeric_precision = 3
    ) THEN
        ALTER TABLE public.budget_alerts 
        ALTER COLUMN threshold_percentage TYPE DECIMAL(5, 2);
        
        RAISE NOTICE 'Updated budget_alerts.threshold_percentage to DECIMAL(5,2) to support percentage values up to 100%%';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to update threshold_percentage precision: %', SQLERRM;
END $$;

-- Add validation constraints for centavo precision (2 decimal places)
DO $$
BEGIN
    -- Add budget amount precision constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_budget_amount_precision' 
        AND table_name = 'budgets'
    ) THEN
        ALTER TABLE public.budgets 
        ADD CONSTRAINT check_budget_amount_precision 
        CHECK (amount = ROUND(amount, 4) AND spent = ROUND(spent, 4));
    END IF;
    
    -- Add alert amount precision constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_alert_amount_precision' 
        AND table_name = 'budget_alerts'
    ) THEN
        ALTER TABLE public.budget_alerts 
        ADD CONSTRAINT check_alert_amount_precision 
        CHECK (amount_spent = ROUND(amount_spent, 4) AND budget_amount = ROUND(budget_amount, 4));
    END IF;
END $$;

-- =====================================================
-- HELPER FUNCTIONS FOR SAFE BUDGET OPERATIONS
-- =====================================================

-- Function to safely validate budget names
CREATE OR REPLACE FUNCTION public.validate_budget_name(budget_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check for format string injection characters
    IF budget_name ~ '[%\*]' THEN
        RETURN FALSE;
    END IF;
    
    -- Check length
    IF LENGTH(budget_name) = 0 OR LENGTH(budget_name) > 100 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to sanitize budget names for safe storage
CREATE OR REPLACE FUNCTION public.sanitize_budget_name(budget_name TEXT)
RETURNS TEXT AS $$
BEGIN
    IF budget_name IS NULL THEN
        RETURN '';
    END IF;
    
    -- Replace problematic characters
    RETURN TRIM(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(budget_name, '[%]', 'percent', 'g'),
                '[*]', '', 'g'
            ),
            '\.', ' ', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add trigger to sanitize budget names on insert/update
CREATE OR REPLACE FUNCTION public.sanitize_budget_name_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Sanitize budget name to prevent format string injection
    NEW.budget_name := public.sanitize_budget_name(NEW.budget_name);
    
    -- Validate budget name
    IF NOT public.validate_budget_name(NEW.budget_name) THEN
        RAISE EXCEPTION 'Invalid budget name: contains prohibited characters or exceeds length limit';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS budget_name_sanitization_trigger ON public.budgets;

-- Create new trigger
CREATE TRIGGER budget_name_sanitization_trigger
    BEFORE INSERT OR UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.sanitize_budget_name_trigger();

-- =====================================================
-- BUDGET MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to update budget spent amount when transactions occur
CREATE OR REPLACE FUNCTION public.update_budget_spent()
RETURNS TRIGGER AS $$
DECLARE
    v_budget_record RECORD;
    v_amount_change DECIMAL;
    v_transaction_date DATE;
BEGIN
    -- Determine the transaction date and amount change
    IF TG_OP = 'INSERT' THEN
        v_transaction_date := NEW.date;
        v_amount_change := CASE WHEN NEW.type = 'expense' THEN NEW.amount ELSE 0 END;
    ELSIF TG_OP = 'UPDATE' THEN
        v_transaction_date := NEW.date;
        -- Calculate net change in expense amount
        v_amount_change := 
            CASE WHEN NEW.type = 'expense' THEN NEW.amount ELSE 0 END -
            CASE WHEN OLD.type = 'expense' THEN OLD.amount ELSE 0 END;
    ELSIF TG_OP = 'DELETE' THEN
        v_transaction_date := OLD.date;
        v_amount_change := CASE WHEN OLD.type = 'expense' THEN -OLD.amount ELSE 0 END;
    END IF;
    
    -- Only process if there's an expense amount change
    IF v_amount_change != 0 THEN
        -- Find applicable budgets for this transaction
        FOR v_budget_record IN
            SELECT b.* FROM public.budgets b
            WHERE b.user_id = COALESCE(NEW.user_id, OLD.user_id)
            AND b.status = 'active'
            AND v_transaction_date BETWEEN b.start_date AND b.end_date
            AND (
                -- Direct category match
                b.category_id = COALESCE(NEW.expense_category_id, OLD.expense_category_id)
                OR
                -- Multi-category budget match
                EXISTS (
                    SELECT 1 FROM public.budget_categories bc
                    WHERE bc.budget_id = b.id
                    AND bc.category_id = COALESCE(NEW.expense_category_id, OLD.expense_category_id)
                )
            )
        LOOP
            -- Update the budget spent amount
            UPDATE public.budgets
            SET spent = GREATEST(0, spent + v_amount_change),
                updated_at = now()
            WHERE id = v_budget_record.id;
            
            -- Check if alert should be triggered
            PERFORM public.check_budget_alerts(v_budget_record.id);
        END LOOP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the budget update trigger
CREATE TRIGGER update_budget_spent_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_budget_spent();

-- Function to check and create budget alerts
CREATE OR REPLACE FUNCTION public.check_budget_alerts(p_budget_id UUID)
RETURNS VOID AS $$
DECLARE
    v_budget RECORD;
    v_percentage DECIMAL;
    v_alert_type TEXT;
    v_alert_level TEXT;
    v_message TEXT;
    v_should_alert BOOLEAN := false;
BEGIN
    -- Get budget details
    SELECT * INTO v_budget FROM public.budgets WHERE id = p_budget_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate spending percentage
    v_percentage := public.safe_percentage(v_budget.spent, v_budget.amount);
    
    -- Determine alert conditions
    IF v_percentage >= 100 THEN
        v_alert_type := 'exceeded';
        v_alert_level := 'critical';
        -- SAFE: Use concatenation instead of format() to prevent injection
        v_message := 'Budget "' || v_budget.budget_name || '" has been exceeded! Spent: ' ||
                    public.format_currency(v_budget.spent, v_budget.currency) || ' of ' ||
                    public.format_currency(v_budget.amount, v_budget.currency) || ' (' ||
                    v_percentage::TEXT || '%)';
        v_should_alert := true;
    ELSIF v_percentage >= (v_budget.alert_threshold * 100) THEN
        v_alert_type := 'threshold';
        v_alert_level := 'warning';
        -- SAFE: Use concatenation instead of format() to prevent injection
        v_message := 'Budget "' || v_budget.budget_name || '" is at ' ||
                    v_percentage::TEXT || '% of limit. Spent: ' ||
                    public.format_currency(v_budget.spent, v_budget.currency) || ' of ' ||
                    public.format_currency(v_budget.amount, v_budget.currency);
        v_should_alert := true;
    END IF;
    
    -- Create alert if conditions are met and alerts are enabled
    IF v_should_alert AND v_budget.alert_enabled THEN
        -- Check if similar alert was sent recently (avoid spam)
        IF NOT EXISTS (
            SELECT 1 FROM public.budget_alerts
            WHERE budget_id = p_budget_id
            AND alert_type = v_alert_type
            AND triggered_at > now() - INTERVAL '1 hour'
        ) THEN
            INSERT INTO public.budget_alerts (
                budget_id,
                user_id,
                alert_type,
                alert_level,
                message,
                threshold_percentage,
                amount_spent,
                budget_amount
            ) VALUES (
                p_budget_id,
                v_budget.user_id,
                v_alert_type,
                v_alert_level,
                v_message,
                v_percentage,
                v_budget.spent,
                v_budget.amount
            );
            
            -- Update last alert sent timestamp
            UPDATE public.budgets
            SET last_alert_sent = now()
            WHERE id = p_budget_id;
            
            -- Send notification
            PERFORM public.send_notification(
                'budget_alert',
                jsonb_build_object(
                    'budget_id', p_budget_id,
                    'user_id', v_budget.user_id,
                    'alert_type', v_alert_type,
                    'alert_level', v_alert_level,
                    'message', v_message
                )::TEXT
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create budget for a specific period
CREATE OR REPLACE FUNCTION public.create_period_budget(
    p_user_id UUID,
    p_budget_name TEXT,
    p_amount DECIMAL,
    p_period TEXT,
    p_category_id UUID DEFAULT NULL,
    p_category_name TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_budget_id UUID;
    v_period_dates RECORD;
    v_calculated_start_date DATE;
BEGIN
    -- Determine start date
    v_calculated_start_date := COALESCE(p_start_date, CURRENT_DATE);
    
    -- Get period dates
    SELECT * INTO v_period_dates
    FROM public.get_period_dates(p_period, v_calculated_start_date);
    
    -- Create the budget
    INSERT INTO public.budgets (
        user_id,
        budget_name,
        amount,
        period,
        start_date,
        end_date,
        category_id,
        category_name
    ) VALUES (
        p_user_id,
        p_budget_name,
        p_amount,
        p_period,
        v_period_dates.start_date,
        v_period_dates.end_date,
        p_category_id,
        p_category_name
    ) RETURNING id INTO v_budget_id;
    
    -- If category_id is provided, also add to budget_categories for consistency
    IF p_category_id IS NOT NULL THEN
        INSERT INTO public.budget_categories (budget_id, category_id)
        VALUES (v_budget_id, p_category_id);
    END IF;
    
    RETURN v_budget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rollover budget to next period
CREATE OR REPLACE FUNCTION public.rollover_budget(p_budget_id UUID)
RETURNS UUID AS $$
DECLARE
    v_old_budget RECORD;
    v_new_budget_id UUID;
    v_period_dates RECORD;
    v_rollover_amount DECIMAL;
BEGIN
    -- Get the current budget
    SELECT * INTO v_old_budget FROM public.budgets WHERE id = p_budget_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Budget not found';
    END IF;
    
    -- Check if rollover is enabled
    IF NOT v_old_budget.rollover_enabled THEN
        RAISE EXCEPTION 'Rollover not enabled for this budget';
    END IF;
    
    -- Calculate rollover amount
    v_rollover_amount := GREATEST(0, v_old_budget.amount - v_old_budget.spent);
    
    -- Get next period dates
    SELECT * INTO v_period_dates
    FROM public.get_period_dates(v_old_budget.period, v_old_budget.end_date + INTERVAL '1 day');
    
    -- Create new budget for next period
    INSERT INTO public.budgets (
        user_id,
        budget_name,
        amount,
        spent,
        currency,
        period,
        start_date,
        end_date,
        category_id,
        category_name,
        alert_threshold,
        alert_enabled,
        rollover_enabled,
        is_recurring
    ) VALUES (
        v_old_budget.user_id,
        v_old_budget.budget_name,
        v_old_budget.amount + CASE WHEN v_old_budget.rollover_enabled THEN v_rollover_amount ELSE 0 END,
        0,
        v_old_budget.currency,
        v_old_budget.period,
        v_period_dates.start_date,
        v_period_dates.end_date,
        v_old_budget.category_id,
        v_old_budget.category_name,
        v_old_budget.alert_threshold,
        v_old_budget.alert_enabled,
        v_old_budget.rollover_enabled,
        v_old_budget.is_recurring
    ) RETURNING id INTO v_new_budget_id;
    
    -- Copy category relationships
    INSERT INTO public.budget_categories (budget_id, category_id, allocation_percentage)
    SELECT v_new_budget_id, category_id, allocation_percentage
    FROM public.budget_categories
    WHERE budget_id = p_budget_id;
    
    -- Mark old budget as completed
    UPDATE public.budgets
    SET status = 'completed',
        updated_at = now()
    WHERE id = p_budget_id;
    
    RETURN v_new_budget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONVENIENCE VIEWS
-- =====================================================

-- Enhanced budget details view
CREATE OR REPLACE VIEW public.budget_details AS
SELECT
    b.id,
    b.user_id,
    b.budget_name,
    b.description,
    b.amount,
    b.spent,
    b.currency,
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
    
    -- Formatted amounts
    public.format_currency(b.amount, b.currency) as formatted_amount,
    public.format_currency(b.spent, b.currency) as formatted_spent,
    public.format_currency(b.amount - b.spent, b.currency) as formatted_remaining,
    
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

-- Budget summary by category view
CREATE OR REPLACE VIEW public.budget_category_summary AS
SELECT
    ec.id as category_id,
    ec.category_name,
    ec.icon,
    ec.color,
    ec.user_id,
    
    -- Budget totals
    COUNT(b.id) as budget_count,
    COALESCE(SUM(b.amount), 0) as total_budgeted,
    COALESCE(SUM(b.spent), 0) as total_spent,
    COALESCE(SUM(b.amount - b.spent), 0) as total_remaining,
    
    -- Averages
    COALESCE(AVG(public.safe_percentage(b.spent, b.amount)), 0) as avg_percentage_used,
    
    -- Status counts
    COUNT(CASE WHEN b.status = 'active' THEN 1 END) as active_budgets,
    COUNT(CASE WHEN b.spent >= b.amount THEN 1 END) as exceeded_budgets,
    
    -- Current period data
    COALESCE(SUM(CASE WHEN CURRENT_DATE BETWEEN b.start_date AND b.end_date THEN b.amount END), 0) as current_period_budget,
    COALESCE(SUM(CASE WHEN CURRENT_DATE BETWEEN b.start_date AND b.end_date THEN b.spent END), 0) as current_period_spent
    
FROM public.expense_categories ec
LEFT JOIN public.budgets b ON ec.id = b.category_id
GROUP BY ec.id, ec.category_name, ec.icon, ec.color, ec.user_id;

-- =====================================================
-- INITIALIZATION DATA
-- =====================================================

-- Function to create sample budgets for new users
CREATE OR REPLACE FUNCTION public.create_sample_budgets(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_housing_category_id UUID;
    v_food_category_id UUID;
    v_entertainment_category_id UUID;
    v_current_month_start DATE;
    v_current_month_end DATE;
BEGIN
    -- Get current month dates
    SELECT start_date, end_date INTO v_current_month_start, v_current_month_end
    FROM public.get_period_dates('month', CURRENT_DATE);
    
    -- Get category IDs
    SELECT id INTO v_housing_category_id 
    FROM public.expense_categories 
    WHERE user_id = p_user_id AND category_name = 'Housing' 
    LIMIT 1;
    
    SELECT id INTO v_food_category_id 
    FROM public.expense_categories 
    WHERE user_id = p_user_id AND category_name = 'Food & Dining' 
    LIMIT 1;
    
    SELECT id INTO v_entertainment_category_id 
    FROM public.expense_categories 
    WHERE user_id = p_user_id AND category_name = 'Entertainment' 
    LIMIT 1;
    
    -- Create sample budgets if categories exist
    IF v_housing_category_id IS NOT NULL THEN
        INSERT INTO public.budgets (
            user_id, budget_name, amount, period, start_date, end_date,
            category_id, alert_threshold, alert_enabled
        ) VALUES (
            p_user_id, 'Monthly Housing Budget', 1500.00, 'month',
            v_current_month_start, v_current_month_end,
            v_housing_category_id, 0.80, true
        );
    END IF;
    
    IF v_food_category_id IS NOT NULL THEN
        INSERT INTO public.budgets (
            user_id, budget_name, amount, period, start_date, end_date,
            category_id, alert_threshold, alert_enabled
        ) VALUES (
            p_user_id, 'Monthly Food Budget', 600.00, 'month',
            v_current_month_start, v_current_month_end,
            v_food_category_id, 0.75, true
        );
    END IF;
    
    IF v_entertainment_category_id IS NOT NULL THEN
        INSERT INTO public.budgets (
            user_id, budget_name, amount, period, start_date, end_date,
            category_id, alert_threshold, alert_enabled, rollover_enabled
        ) VALUES (
            p_user_id, 'Monthly Entertainment Budget', 250.00, 'month',
            v_current_month_start, v_current_month_end,
            v_entertainment_category_id, 0.90, true, true
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_categories TO authenticated;

-- Grant permissions on views
GRANT SELECT ON public.budget_details TO authenticated;
GRANT SELECT ON public.budget_category_summary TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.create_period_budget(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollover_budget(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sample_budgets(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_budget_alerts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_budget_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_budget_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_budget_name_trigger() TO authenticated;

-- =====================================================
-- MODULE COMMENTS
-- =====================================================

COMMENT ON TABLE public.budgets IS 'User budget definitions with period tracking and automatic spending updates';
COMMENT ON TABLE public.budget_alerts IS 'Budget alert notifications and tracking';
COMMENT ON TABLE public.budget_categories IS 'Many-to-many relationship between budgets and expense categories';

COMMENT ON FUNCTION public.update_budget_spent() IS 'Trigger function to automatically update budget spent amounts when transactions occur';
COMMENT ON FUNCTION public.check_budget_alerts(UUID) IS 'Check budget thresholds and create alerts as needed';
COMMENT ON FUNCTION public.create_period_budget(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, DATE) IS 'Create budget with automatic period date calculation';
COMMENT ON FUNCTION public.rollover_budget(UUID) IS 'Roll over budget to next period with remaining amount';

-- =====================================================
-- END OF BUDGET SCHEMA MODULE
-- =====================================================