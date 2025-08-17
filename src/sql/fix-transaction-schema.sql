-- Fix transactions table schema by adding category_id column

-- First add category_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS category_id UUID;

-- Create indexes for the new column
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Drop the dependent function first, then the view
DROP FUNCTION IF EXISTS auth_transaction_details(UUID) CASCADE;
DROP VIEW IF EXISTS transaction_details CASCADE;

-- Update the transaction_details view to include category information
CREATE OR REPLACE VIEW transaction_details AS
SELECT 
    t.id,
    t.date,
    t.amount,
    t.notes,
    t.type,
    t.category,
    t.category_id,
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
    g.status as goal_status,
    CASE 
        WHEN t.type = 'income' THEN ic.category_name
        WHEN t.type = 'expense' THEN ec.category_name
        ELSE NULL
    END as category_name
FROM 
    transactions t
LEFT JOIN 
    accounts a ON t.account_id = a.id
LEFT JOIN 
    goals g ON t.goal_id = g.id
LEFT JOIN
    income_categories ic ON t.category_id = ic.id AND t.type = 'income'
LEFT JOIN
    expense_categories ec ON t.category_id = ec.id AND t.type = 'expense';

-- Recreate the auth_transaction_details function
CREATE OR REPLACE FUNCTION auth_transaction_details(jwt_user_id UUID)
RETURNS SETOF public.transaction_details AS $$
    SELECT * FROM public.transaction_details WHERE user_id = jwt_user_id;
$$ LANGUAGE SQL STABLE;

-- Update the function that handles goal contributions
CREATE OR REPLACE FUNCTION contribute_to_goal(
    p_goal_id UUID,
    p_amount DECIMAL,
    p_account_id UUID,
    p_notes TEXT,
    p_user_id UUID,
    p_category_id UUID DEFAULT NULL
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
        -- Create transaction record with category_id if provided
        INSERT INTO transactions (
            date, 
            amount, 
            notes, 
            type, 
            category,
            category_id,
            account_id, 
            goal_id, 
            user_id
        ) VALUES (
            CURRENT_DATE, 
            p_amount, 
            p_notes, 
            'contribution', 
            'Goal Contribution',
            p_category_id,
            p_account_id, 
            p_goal_id, 
            p_user_id
        ) RETURNING id INTO v_transaction_id;
        
        -- Update account balance
        UPDATE accounts 
        SET balance = balance - p_amount 
        WHERE id = p_account_id
        RETURNING balance INTO v_new_account_balance;
        
        -- Update goal progress
        UPDATE goals 
        SET current_amount = current_amount + p_amount 
        WHERE id = p_goal_id
        RETURNING current_amount, status INTO v_new_goal_amount, v_goal_status;
        
        -- Check if goal is completed
        IF v_new_goal_amount >= v_goal_record.target_amount AND v_goal_status != 'completed' THEN
            UPDATE goals SET status = 'completed' WHERE id = p_goal_id;
            v_goal_status := 'completed';
        END IF;
        
        -- Commit transaction
        v_result := jsonb_build_object(
            'success', true,
            'transaction_id', v_transaction_id,
            'new_goal_amount', v_new_goal_amount,
            'new_account_balance', v_new_account_balance,
            'goal_status', v_goal_status
        );
        
        RETURN v_result;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
    
END;
$$ LANGUAGE plpgsql; 