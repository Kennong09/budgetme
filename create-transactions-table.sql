-- First create the accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Apply RLS to the accounts table
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for accounts
CREATE POLICY "Users can view their own accounts" 
    ON public.accounts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts" 
    ON public.accounts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
    ON public.accounts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
    ON public.accounts FOR DELETE 
    USING (auth.uid() = user_id);

-- Create income categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.income_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category_name TEXT NOT NULL,
    icon TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Apply RLS to the income_categories table
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for income_categories
CREATE POLICY "Users can view their own income categories" 
    ON public.income_categories FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income categories" 
    ON public.income_categories FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income categories" 
    ON public.income_categories FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income categories" 
    ON public.income_categories FOR DELETE 
    USING (auth.uid() = user_id);

-- Create expense categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category_name TEXT NOT NULL,
    icon TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Apply RLS to the expense_categories table
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_categories
CREATE POLICY "Users can view their own expense categories" 
    ON public.expense_categories FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expense categories" 
    ON public.expense_categories FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense categories" 
    ON public.expense_categories FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense categories" 
    ON public.expense_categories FOR DELETE 
    USING (auth.uid() = user_id);

-- Create goals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    goal_name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    target_date DATE,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Apply RLS to the goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

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

-- Create or modify the transactions table to properly track goal contributions
-- This script ensures proper foreign key relationships and indexes

-- Check if the transactions table exists, if not create it
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'contribution')),
    category VARCHAR(100),
    account_id UUID REFERENCES accounts(id),
    goal_id UUID REFERENCES goals(id),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Create a view for goal contributions to make querying easier
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

-- Create a view for transaction details with account and goal information
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

-- Create a function to handle goal contributions
CREATE OR REPLACE FUNCTION contribute_to_goal(
    p_goal_id UUID,
    p_amount DECIMAL,
    p_account_id UUID,
    p_notes TEXT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_goal_record RECORD;
    v_account_record RECORD;
    v_transaction_id UUID;
    v_new_goal_amount DECIMAL;
    v_new_account_balance DECIMAL;
    v_goal_status VARCHAR(50);
    v_result JSONB;
BEGIN
    -- Check if goal exists
    SELECT * INTO v_goal_record FROM goals WHERE id = p_goal_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Goal not found');
    END IF;
    
    -- Check if account exists
    SELECT * INTO v_account_record FROM accounts WHERE id = p_account_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account not found');
    END IF;
    
    -- Check if account has sufficient funds
    IF v_account_record.balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds in account');
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Create transaction record
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
            CURRENT_DATE,
            p_amount,
            p_notes,
            'contribution',
            'Goal Contribution',
            p_account_id,
            p_goal_id,
            p_user_id
        ) RETURNING id INTO v_transaction_id;
        
        -- Update account balance
        v_new_account_balance := v_account_record.balance - p_amount;
        UPDATE accounts 
        SET balance = v_new_account_balance,
            updated_at = NOW()
        WHERE id = p_account_id;
        
        -- Update goal progress
        v_new_goal_amount := v_goal_record.current_amount + p_amount;
        
        -- Determine if goal is now completed
        IF v_new_goal_amount >= v_goal_record.target_amount THEN
            v_goal_status := 'completed';
        ELSE
            v_goal_status := 'in_progress';
        END IF;
        
        -- Update goal
        UPDATE goals 
        SET current_amount = v_new_goal_amount,
            status = v_goal_status,
            updated_at = NOW()
        WHERE id = p_goal_id;
        
        -- Return success result
        v_result := jsonb_build_object(
            'success', true,
            'transaction_id', v_transaction_id,
            'new_goal_amount', v_new_goal_amount,
            'new_account_balance', v_new_account_balance,
            'goal_status', v_goal_status
        );
        
        RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
        -- Return error information
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create a function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance(p_account_id UUID, p_amount_change DECIMAL)
RETURNS void AS $$
BEGIN
    -- Update the account balance
    UPDATE public.accounts
    SET balance = balance + p_amount_change
    WHERE id = p_account_id;
    
    -- If no rows were updated, raise an exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account with ID % not found', p_account_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress(p_goal_id UUID, p_amount DECIMAL)
RETURNS void AS $$
DECLARE
    v_target_amount DECIMAL;
    v_new_amount DECIMAL;
BEGIN
    -- Update the goal's current amount
    UPDATE public.goals
    SET current_amount = current_amount + p_amount
    WHERE id = p_goal_id
    RETURNING target_amount, current_amount INTO v_target_amount, v_new_amount;
    
    -- If no rows were updated, raise an exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Goal with ID % not found', p_goal_id;
    END IF;
    
    -- Check if the goal is now completed
    IF v_new_amount >= v_target_amount THEN
        UPDATE public.goals
        SET status = 'completed'
        WHERE id = p_goal_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index on common query fields
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Grant appropriate permissions on the view
GRANT SELECT ON public.transaction_details TO authenticated;

-- Create a function to securely access transaction details
CREATE OR REPLACE FUNCTION auth_transaction_details(jwt_user_id UUID)
RETURNS SETOF public.transaction_details AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.transaction_details WHERE user_id = jwt_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 