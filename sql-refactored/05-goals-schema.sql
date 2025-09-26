-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
    DROP POLICY IF EXISTS "Family members can view family goals" ON public.goals;
    DROP POLICY IF EXISTS "Users can manage contributions to their goals" ON public.goal_contributions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS goals_updated_at ON public.goals;
    DROP TRIGGER IF EXISTS update_goal_progress_trigger ON public.goal_contributions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.update_goal_progress();
    DROP FUNCTION IF EXISTS public.contribute_to_goal(UUID, DECIMAL, UUID, TEXT, UUID);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views
DROP VIEW IF EXISTS public.goal_details CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_goals_user_id;
DROP INDEX IF EXISTS public.idx_goals_family_id;
DROP INDEX IF EXISTS public.idx_goals_status;
DROP INDEX IF EXISTS public.idx_goals_priority;
DROP INDEX IF EXISTS public.idx_goals_target_date;
DROP INDEX IF EXISTS public.idx_goals_active;
DROP INDEX IF EXISTS public.idx_goal_contributions_goal_id;
DROP INDEX IF EXISTS public.idx_goal_contributions_user_id;
DROP INDEX IF EXISTS public.idx_goal_contributions_date;

-- Drop tables
DROP TABLE IF EXISTS public.goal_contributions CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;

-- =====================================================
-- 05-GOALS-SCHEMA.SQL
-- =====================================================
-- Module: Goal Tracking and Management System
-- Purpose: Personal and family goal creation, tracking, and contribution management
-- Dependencies: 01-auth-schema.sql, 02-shared-schema.sql, 03-family-schema.sql, 04-transactions-schema.sql
-- Backend Service: goalService.ts
-- Frontend Components: src/components/goals/
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-09-20
-- Compatible with: CreateGoal.tsx, GoalProgress.tsx, ContributeToGoal.tsx
-- =====================================================

-- =====================================================
-- CORE GOALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Goal identification
    goal_name TEXT NOT NULL,
    description TEXT,
    
    -- Financial details
    target_amount DECIMAL(15, 4) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15, 4) DEFAULT 0 NOT NULL CHECK (current_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Timeline
    target_date DATE,
    created_date DATE DEFAULT CURRENT_DATE NOT NULL,
    completed_date DATE,
    
    -- Goal configuration
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT DEFAULT 'general' CHECK (category IN ('emergency', 'vacation', 'house', 'car', 'education', 'retirement', 'debt', 'general')),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled', 'paused')),
    
    -- Family integration
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    is_family_goal BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    
    -- Contribution settings
    auto_contribute BOOLEAN DEFAULT false,
    auto_contribute_amount DECIMAL(15, 4) DEFAULT 0,
    auto_contribute_frequency TEXT DEFAULT 'monthly' CHECK (auto_contribute_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
    
    -- Notes and metadata
    notes TEXT,
    image_url TEXT,
    milestones JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_target_date CHECK (target_date IS NULL OR target_date >= created_date),
    CONSTRAINT auto_contribute_amount_valid CHECK (auto_contribute_amount >= 0)
);

-- =====================================================
-- GOAL CONTRIBUTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    
    -- Contribution details
    amount DECIMAL(15, 4) NOT NULL CHECK (amount > 0),
    contribution_date DATE DEFAULT CURRENT_DATE NOT NULL,
    source_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    contribution_type TEXT DEFAULT 'manual' CHECK (contribution_type IN ('manual', 'automatic', 'transfer')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- INDEXES AND RLS
-- =====================================================

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_family_id ON public.goals(family_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON public.goals(priority);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_active ON public.goals(user_id, status) WHERE status IN ('in_progress', 'not_started');

-- Goal contributions indexes
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON public.goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON public.goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_date ON public.goal_contributions(contribution_date);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY "Users can manage their own goals"
    ON public.goals FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Family members can view family goals"
    ON public.goals FOR SELECT
    USING (
        family_id IS NOT NULL 
        AND is_family_goal = true
        AND EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.family_id = goals.family_id
            AND fm.user_id = auth.uid()
            AND fm.status = 'active'
        )
    );

-- Goal contributions policies
CREATE POLICY "Users can manage contributions to their goals"
    ON public.goal_contributions FOR ALL
    USING (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================
-- CORE FUNCTIONS
-- =====================================================

-- Function to update goal progress when contributions are made
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_goal RECORD;
    v_new_current_amount DECIMAL;
    v_new_status TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT * INTO v_goal FROM public.goals WHERE id = NEW.goal_id;
        v_new_current_amount := v_goal.current_amount + NEW.amount;
        
        IF v_new_current_amount >= v_goal.target_amount THEN
            v_new_status := 'completed';
        ELSE
            v_new_status := CASE WHEN v_goal.status = 'not_started' THEN 'in_progress' ELSE v_goal.status END;
        END IF;
        
        UPDATE public.goals
        SET 
            current_amount = v_new_current_amount,
            status = v_new_status,
            completed_date = CASE WHEN v_new_status = 'completed' THEN CURRENT_DATE ELSE completed_date END,
            updated_at = now()
        WHERE id = NEW.goal_id;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        SELECT * INTO v_goal FROM public.goals WHERE id = OLD.goal_id;
        v_new_current_amount := GREATEST(0, v_goal.current_amount - OLD.amount);
        
        IF v_new_current_amount >= v_goal.target_amount THEN
            v_new_status := 'completed';
        ELSIF v_new_current_amount <= 0 THEN
            v_new_status := 'not_started';
        ELSE
            v_new_status := 'in_progress';
        END IF;
        
        UPDATE public.goals
        SET 
            current_amount = v_new_current_amount,
            status = v_new_status,
            completed_date = CASE WHEN v_new_status != 'completed' THEN NULL ELSE completed_date END,
            updated_at = now()
        WHERE id = OLD.goal_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_goal_progress_trigger
    AFTER INSERT OR DELETE ON public.goal_contributions
    FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();

-- Function to contribute to goal from account
CREATE OR REPLACE FUNCTION public.contribute_to_goal(
    p_goal_id UUID,
    p_amount DECIMAL,
    p_account_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
    v_goal RECORD;
    v_account RECORD;
    v_contribution_id UUID;
    v_transaction_id UUID;
    v_contribution_category_id UUID;
BEGIN
    -- Validate goal and account
    SELECT * INTO v_goal FROM public.goals WHERE id = p_goal_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Goal not found');
    END IF;
    
    SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account not found');
    END IF;
    
    -- Check balance
    IF v_account.balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    -- Find "Contribution" expense category for this user
    SELECT id INTO v_contribution_category_id 
    FROM public.expense_categories 
    WHERE user_id = p_user_id 
    AND LOWER(category_name) = 'contribution' 
    AND is_active = true
    LIMIT 1;
    
    BEGIN
        -- Create transaction with proper category
        INSERT INTO public.transactions (
            user_id, date, amount, description, type,
            account_id, goal_id, notes, expense_category_id
        ) VALUES (
            p_user_id, CURRENT_DATE, p_amount, 
            COALESCE(NULLIF(p_notes, ''), 'Goal contribution: ' || v_goal.goal_name),
            'contribution', p_account_id, p_goal_id, 
            CASE 
                WHEN p_notes IS NOT NULL AND p_notes != '' THEN 'Goal contribution to ' || v_goal.goal_name
                ELSE NULL
            END,
            v_contribution_category_id
        ) RETURNING id INTO v_transaction_id;
        
        -- Explicitly update account balance to ensure it's reduced
        UPDATE public.accounts 
        SET balance = balance - p_amount
        WHERE id = p_account_id;
        
        -- Create contribution record
        INSERT INTO public.goal_contributions (
            goal_id, user_id, transaction_id, amount,
            source_account_id, contribution_type, notes
        ) VALUES (
            p_goal_id, p_user_id, v_transaction_id, p_amount,
            p_account_id, 'manual', p_notes
        ) RETURNING id INTO v_contribution_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'contribution_id', v_contribution_id,
            'transaction_id', v_transaction_id,
            'amount', p_amount,
            'category_id', v_contribution_category_id
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.goal_details AS
SELECT
    g.id,
    g.user_id,
    g.goal_name,
    g.description,
    g.target_amount,
    g.current_amount,
    g.currency,
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
    
    -- Formatted amounts
    public.format_currency(g.target_amount, g.currency) as formatted_target,
    public.format_currency(g.current_amount, g.currency) as formatted_current,
    public.format_currency(g.target_amount - g.current_amount, g.currency) as formatted_remaining,
    
    -- Contribution count
    (SELECT COUNT(*) FROM public.goal_contributions gc WHERE gc.goal_id = g.id) AS contribution_count
    
FROM public.goals g;

-- =====================================================
-- CENTAVO PRECISION VALIDATION CONSTRAINTS
-- =====================================================

-- Add validation constraints for centavo precision (2 decimal places)
DO $$
BEGIN
    -- Add goal amount precision constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_goal_amount_precision' 
        AND table_name = 'goals'
    ) THEN
        ALTER TABLE public.goals 
        ADD CONSTRAINT check_goal_amount_precision 
        CHECK (target_amount = ROUND(target_amount, 4) AND current_amount = ROUND(current_amount, 4));
    END IF;
    
    -- Add contribution amount precision constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_contribution_amount_precision' 
        AND table_name = 'goal_contributions'
    ) THEN
        ALTER TABLE public.goal_contributions 
        ADD CONSTRAINT check_contribution_amount_precision 
        CHECK (amount = ROUND(amount, 4));
    END IF;
END $$;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_contributions TO authenticated;
GRANT SELECT ON public.goal_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.contribute_to_goal(UUID, DECIMAL, UUID, TEXT, UUID) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.goals IS 'Personal and family financial goals with progress tracking';
COMMENT ON TABLE public.goal_contributions IS 'Individual contributions made toward goals';
COMMENT ON FUNCTION public.contribute_to_goal(UUID, DECIMAL, UUID, TEXT, UUID) IS 'Process goal contribution from user account with validation';

-- =====================================================
-- END OF GOALS SCHEMA MODULE
-- =====================================================