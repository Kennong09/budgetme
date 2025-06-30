-- Create goals table that is compatible with the CreateGoal.tsx component
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    goal_name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    target_date DATE NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')) DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add missing columns if they don't exist (for backward compatibility)
DO $$
BEGIN
    -- Check and add notes column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN notes TEXT;
    END IF;
    
    -- Check and add updated_at column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;
END $$;

-- Apply RLS to the goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to allow recreating them
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

-- Create policies for goals
CREATE POLICY "Users can view their own goals" 
    ON public.goals FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" 
    ON public.goals FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
    ON public.goals FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
    ON public.goals FOR DELETE
    USING (auth.uid() = user_id);

-- Create index on common query fields
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON public.goals(priority);

-- Create update trigger function to set updated_at timestamp
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS goals_updated_at ON public.goals;
CREATE TRIGGER goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW 
    EXECUTE FUNCTION update_goals_updated_at();

-- Create function for goal contributions
CREATE OR REPLACE FUNCTION add_goal_contribution()
RETURNS TRIGGER AS $$
DECLARE
    v_goal_id UUID;
    v_amount DECIMAL;
BEGIN
    -- For transactions marked as goal contributions
    IF NEW.goal_id IS NOT NULL AND NEW.amount > 0 THEN
        v_goal_id := NEW.goal_id;
        v_amount := NEW.amount;

        -- Update the goal's current amount
        UPDATE public.goals
        SET 
            current_amount = current_amount + v_amount,
            -- Auto-update status to completed if target is reached
            status = CASE 
                WHEN (current_amount + v_amount) >= target_amount THEN 'completed'
                ELSE status
            END
        WHERE id = v_goal_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for goal contributions
-- This assumes there's a goal_id field in the transactions table
-- If not, you'll need to create a separate goal_contributions table
DROP TRIGGER IF EXISTS goal_contribution_trigger ON public.transactions;
CREATE TRIGGER goal_contribution_trigger
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    WHEN (NEW.goal_id IS NOT NULL)
    EXECUTE FUNCTION add_goal_contribution();

-- Now that the table structure is guaranteed to be complete, create the view
-- Create goal_details view for more convenient queries
DROP VIEW IF EXISTS public.goal_details;
CREATE OR REPLACE VIEW public.goal_details AS
SELECT
    g.id,
    g.user_id,
    g.goal_name,
    g.target_amount,
    g.current_amount,
    (g.target_amount - g.current_amount) AS remaining,
    CASE
        WHEN g.target_amount > 0 THEN ROUND((g.current_amount / g.target_amount) * 100, 2)
        ELSE 0
    END AS percentage,
    CASE
        WHEN g.current_amount >= g.target_amount THEN 'completed'
        WHEN g.current_amount >= (g.target_amount * 0.75) THEN 'near_completion'
        WHEN g.current_amount >= (g.target_amount * 0.25) THEN 'in_progress'
        ELSE 'started'
    END AS progress_status,
    g.priority,
    g.status,
    g.target_date,
    g.notes,
    g.created_at,
    g.updated_at,

    CASE 
        WHEN g.target_date < CURRENT_DATE AND g.status != 'completed' THEN true
        ELSE false
    END as is_overdue
FROM
    public.goals g;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.goal_details TO authenticated; 

-- Function to handle goal contributions
CREATE OR REPLACE FUNCTION contribute_to_goal(
  p_goal_id TEXT,
  p_amount NUMERIC,
  p_account_id TEXT,
  p_notes TEXT,
  p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_balance NUMERIC;
  v_goal_current_amount NUMERIC;
  v_goal_target_amount NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Check if account has sufficient funds
  SELECT balance INTO v_account_balance
  FROM accounts
  WHERE id = p_account_id::UUID AND user_id = p_user_id::UUID;
  
  IF v_account_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds in the selected account';
  END IF;
  
  -- Get goal current and target amounts
  SELECT current_amount, target_amount 
  INTO v_goal_current_amount, v_goal_target_amount
  FROM goals
  WHERE id = p_goal_id::UUID AND user_id = p_user_id::UUID;
  
  -- Determine if goal will be completed with this contribution
  IF (v_goal_current_amount + p_amount) >= v_goal_target_amount THEN
    v_new_status := 'completed';
  ELSE
    v_new_status := 'in_progress';
  END IF;
  
  -- Create transaction record
  INSERT INTO transactions (
    date,
    amount,
    notes,
    type,
    account_id,
    goal_id,
    user_id
  ) VALUES (
    CURRENT_DATE,
    p_amount,
    p_notes,
    'expense',
    p_account_id::UUID,
    p_goal_id::UUID,
    p_user_id::UUID
  );
  
  -- Update account balance
  UPDATE accounts
  SET balance = balance - p_amount
  WHERE id = p_account_id::UUID;
  
  -- Update goal progress
  UPDATE goals
  SET 
    current_amount = current_amount + p_amount,
    status = v_new_status
  WHERE id = p_goal_id::UUID;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$; 

-- Fix contribution tracking issues
-- This script checks for and fixes common issues with goal contribution tracking

-- 1. Check for missing transaction records for goals with non-zero current_amount
DO $$
DECLARE
    goal_record RECORD;
    test_user_id UUID;
    test_account_id UUID;
BEGIN
    -- Get the first user ID from the system
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    -- If no users exist, exit gracefully
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in the system. Please create a user first.';
        RETURN;
    END IF;
    
    -- Get the first account ID for this user
    SELECT id INTO test_account_id FROM accounts WHERE user_id = test_user_id LIMIT 1;
    
    -- If no accounts exist, exit gracefully
    IF test_account_id IS NULL THEN
        RAISE NOTICE 'No accounts found for this user. Please create an account first.';
        RETURN;
    END IF;
    
    -- Find goals with current_amount > 0 but no transactions
    FOR goal_record IN 
        SELECT g.* 
        FROM goals g
        LEFT JOIN transactions t ON g.id = t.goal_id
        WHERE g.current_amount > 0
        AND t.id IS NULL
    LOOP
        RAISE NOTICE 'Found goal % with current_amount % but no transactions', 
            goal_record.goal_name, goal_record.current_amount;
            
        -- Create an initial contribution transaction for this goal
        INSERT INTO transactions (
            date, 
            amount, 
            notes, 
            type, 
            category,
            account_id, 
            goal_id, 
            user_id
        ) VALUES (
            CURRENT_DATE - INTERVAL '1 day',
            goal_record.current_amount,
            'Initial contribution (system generated)',
            'contribution',
            'Goal Contribution',
            test_account_id,
            goal_record.id,
            goal_record.user_id
        );
        
        RAISE NOTICE 'Created initial contribution transaction for goal %', goal_record.goal_name;
    END LOOP;
END $$;

-- 2. Fix inconsistencies between goal current_amount and sum of transactions
DO $$
DECLARE
    goal_record RECORD;
    transaction_sum DECIMAL;
BEGIN
    -- Find goals where current_amount doesn't match sum of transactions
    FOR goal_record IN 
        SELECT g.id, g.goal_name, g.current_amount, 
               COALESCE(SUM(t.amount), 0) AS transaction_total
        FROM goals g
        LEFT JOIN transactions t ON g.id = t.goal_id
        GROUP BY g.id, g.goal_name, g.current_amount
        HAVING g.current_amount != COALESCE(SUM(t.amount), 0)
    LOOP
        RAISE NOTICE 'Goal % has current_amount % but transaction total %', 
            goal_record.goal_name, goal_record.current_amount, goal_record.transaction_total;
            
        -- Update the goal's current_amount to match transaction sum
        UPDATE goals
        SET current_amount = goal_record.transaction_total
        WHERE id = goal_record.id;
        
        RAISE NOTICE 'Updated goal % current_amount to match transaction total %', 
            goal_record.goal_name, goal_record.transaction_total;
    END LOOP;
END $$;

-- 3. Check for and fix goals with incorrect status based on current_amount
DO $$
DECLARE
    goal_record RECORD;
    correct_status VARCHAR(50);
BEGIN
    -- Find goals with potentially incorrect status
    FOR goal_record IN 
        SELECT g.*
        FROM goals g
        WHERE (g.current_amount >= g.target_amount AND g.status != 'completed')
           OR (g.current_amount < g.target_amount AND g.status = 'completed')
    LOOP
        -- Determine correct status
        IF goal_record.current_amount >= goal_record.target_amount THEN
            correct_status := 'completed';
        ELSE
            correct_status := 'in_progress';
        END IF;
        
        RAISE NOTICE 'Goal % has incorrect status % (should be %)', 
            goal_record.goal_name, goal_record.status, correct_status;
            
        -- Update the goal's status
        UPDATE goals
        SET status = correct_status
        WHERE id = goal_record.id;
        
        RAISE NOTICE 'Updated goal % status to %', 
            goal_record.goal_name, correct_status;
    END LOOP;
END $$;

-- 4. Verify the transaction_details view exists and is working
DO $$
BEGIN
    -- Check if the view exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'transaction_details' AND table_schema = 'public'
    ) THEN
        -- Create the view if it doesn't exist
        CREATE OR REPLACE VIEW transaction_details AS
        SELECT 
            t.id,
            t.date,
            t.amount,
            t.notes,
            t.type,
            t.category,
            t.account_id,
            t.goal_id,
            t.user_id,
            t.created_at,
            t.updated_at,
            a.account_name,
            a.account_type,
            a.balance as account_balance,
            g.goal_name,
            g.target_amount as goal_target_amount,
            g.current_amount as goal_current_amount,
            g.target_date as goal_target_date,
            g.status as goal_status
        FROM 
            transactions t
        LEFT JOIN 
            accounts a ON t.account_id = a.id
        LEFT JOIN 
            goals g ON t.goal_id = g.id;
            
        RAISE NOTICE 'Created transaction_details view';
    ELSE
        RAISE NOTICE 'transaction_details view already exists';
    END IF;
END $$;

-- 5. Verify the goal_contributions view exists and is working
DO $$
BEGIN
    -- Check if the view exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'goal_contributions' AND table_schema = 'public'
    ) THEN
        -- Create the view if it doesn't exist
        CREATE OR REPLACE VIEW goal_contributions AS
        SELECT 
            t.id,
            t.date,
            t.amount,
            t.notes,
            t.account_id,
            t.goal_id,
            t.user_id,
            g.goal_name,
            a.account_name,
            u.email as user_email
        FROM 
            transactions t
        JOIN 
            goals g ON t.goal_id = g.id
        LEFT JOIN 
            accounts a ON t.account_id = a.id
        LEFT JOIN 
            auth.users u ON t.user_id = u.id
        WHERE 
            t.goal_id IS NOT NULL;
            
        RAISE NOTICE 'Created goal_contributions view';
    ELSE
        RAISE NOTICE 'goal_contributions view already exists';
    END IF;
END $$;

-- Display a summary of goal contributions
SELECT 
    g.id AS goal_id,
    g.goal_name,
    g.current_amount,
    g.target_amount,
    g.status,
    COUNT(t.id) AS contribution_count,
    COALESCE(SUM(t.amount), 0) AS contribution_total
FROM 
    goals g
LEFT JOIN 
    transactions t ON g.id = t.goal_id
GROUP BY 
    g.id, g.goal_name, g.current_amount, g.target_amount, g.status
ORDER BY 
    g.goal_name; 