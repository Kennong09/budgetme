-- Populate the accounts table
-- This script should be run after creating the tables with create-transactions-table.sql

-- NOTE: The dynamic approach with auth.uid() didn't work because it returns NULL in the SQL Editor
-- Original dynamic approach (kept for reference)
/*
DO $$
DECLARE
    current_user_id UUID := auth.uid(); -- Gets the current authenticated user's ID
BEGIN
    -- Populate accounts table
    INSERT INTO public.accounts (id, user_id, account_name, account_type, balance, status, created_at)
    VALUES
        (uuid_generate_v4(), current_user_id, 'Primary Checking', 'checking', 5234.65, 'active', NOW()),
        (uuid_generate_v4(), current_user_id, 'Savings Account', 'savings', 12750.42, 'active', NOW()),
        (uuid_generate_v4(), current_user_id, 'Credit Card', 'credit', -1250.3, 'active', NOW());

    -- Populate income categories
    INSERT INTO public.income_categories (id, user_id, category_name, icon, is_default, created_at)
    VALUES
        (uuid_generate_v4(), current_user_id, 'Salary', 'cash', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Freelance', 'briefcase', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Investments', 'trending-up', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Gifts', 'gift', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Other Income', 'plus-circle', TRUE, NOW());

    -- Populate expense categories
    INSERT INTO public.expense_categories (id, user_id, category_name, icon, is_default, created_at)
    VALUES
        (uuid_generate_v4(), current_user_id, 'Housing', 'home', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Utilities', 'zap', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Groceries', 'shopping-cart', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Transportation', 'truck', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Dining Out', 'coffee', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Entertainment', 'film', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Healthcare', 'activity', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Education', 'book', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Shopping', 'shopping-bag', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Personal Care', 'user', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Travel', 'map', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Subscriptions', 'repeat', TRUE, NOW()),
        (uuid_generate_v4(), current_user_id, 'Other Expenses', 'more-horizontal', TRUE, NOW());

    -- Populate goals
    INSERT INTO public.goals (id, user_id, goal_name, target_amount, current_amount, target_date, priority, status, created_at)
    VALUES
        (uuid_generate_v4(), current_user_id, 'Emergency Fund', 10000.0, 2000.0, '2023-12-31', 'high', 'in_progress', NOW()),
        (uuid_generate_v4(), current_user_id, 'New Laptop', 1500.0, 500.0, '2023-08-31', 'medium', 'in_progress', NOW()),
        (uuid_generate_v4(), current_user_id, 'Vacation Fund', 3000.0, 1050.0, '2023-09-30', 'low', 'in_progress', NOW()),
        (uuid_generate_v4(), current_user_id, 'Home Down Payment', 25000.0, 3750.0, '2025-12-31', 'high', 'in_progress', NOW()),
        (uuid_generate_v4(), current_user_id, 'New Car', 8000.0, 2200.0, '2024-06-30', 'medium', 'in_progress', NOW());
END $$;
*/

-- Replace with the actual UUID of the user from auth.users table
-- You can get your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- Or if you're logged in, you can see it in the Supabase dashboard under Authentication > Users

-- Hardcoded user ID approach - using the admin user ID 
-- You can verify this ID with: SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com';
-- User ID from admin-query.sql
DO $$
DECLARE
    user_id UUID := '952a101d-d64d-42a8-89ce-cb4061aaaf5e'; -- Admin user ID
BEGIN
    -- Populate accounts table
    INSERT INTO public.accounts (id, user_id, account_name, account_type, balance, status, created_at)
    VALUES
        (uuid_generate_v4(), user_id, 'Primary Checking', 'checking', 5234.65, 'active', NOW()),
        (uuid_generate_v4(), user_id, 'Savings Account', 'savings', 12750.42, 'active', NOW()),
        (uuid_generate_v4(), user_id, 'Credit Card', 'credit', -1250.3, 'active', NOW());
    
    -- Populate income categories
    INSERT INTO public.income_categories (id, user_id, category_name, icon, is_default, created_at)
    VALUES
        (uuid_generate_v4(), user_id, 'Salary', 'cash', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Freelance', 'briefcase', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Investments', 'trending-up', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Gifts', 'gift', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Other Income', 'plus-circle', TRUE, NOW());
    
    -- Populate expense categories
    INSERT INTO public.expense_categories (id, user_id, category_name, icon, is_default, created_at)
    VALUES
        (uuid_generate_v4(), user_id, 'Housing', 'home', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Utilities', 'zap', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Groceries', 'shopping-cart', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Transportation', 'truck', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Dining Out', 'coffee', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Entertainment', 'film', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Healthcare', 'activity', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Education', 'book', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Shopping', 'shopping-bag', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Personal Care', 'user', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Travel', 'map', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Subscriptions', 'repeat', TRUE, NOW()),
        (uuid_generate_v4(), user_id, 'Other Expenses', 'more-horizontal', TRUE, NOW());
    
    -- Populate goals
    INSERT INTO public.goals (id, user_id, goal_name, target_amount, current_amount, target_date, priority, status, created_at)
    VALUES
        (uuid_generate_v4(), user_id, 'Emergency Fund', 10000.0, 2000.0, '2023-12-31', 'high', 'in_progress', NOW()),
        (uuid_generate_v4(), user_id, 'New Laptop', 1500.0, 500.0, '2023-08-31', 'medium', 'in_progress', NOW()),
        (uuid_generate_v4(), user_id, 'Vacation Fund', 3000.0, 1050.0, '2023-09-30', 'low', 'in_progress', NOW()),
        (uuid_generate_v4(), user_id, 'Home Down Payment', 25000.0, 3750.0, '2025-12-31', 'high', 'in_progress', NOW()),
        (uuid_generate_v4(), user_id, 'New Car', 8000.0, 2200.0, '2024-06-30', 'medium', 'in_progress', NOW());
END $$;

-- Sample query to add a few example transactions (uncomment to use)
/*
DO $$
DECLARE
    v_user_id UUID := '952a101d-d64d-42a8-89ce-cb4061aaaf5e';
    v_checking_account_id UUID;
    v_groceries_category_id UUID;
    v_salary_category_id UUID;
BEGIN
    -- Get account and category IDs
    SELECT id INTO v_checking_account_id FROM public.accounts 
    WHERE user_id = v_user_id AND account_name = 'Primary Checking' LIMIT 1;
    
    SELECT id INTO v_groceries_category_id FROM public.expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Groceries' LIMIT 1;
    
    SELECT id INTO v_salary_category_id FROM public.income_categories 
    WHERE user_id = v_user_id AND category_name = 'Salary' LIMIT 1;
    
    -- Add sample expense transaction
    INSERT INTO public.transactions (id, user_id, account_id, category_id, type, amount, date, notes, created_at)
    VALUES (
        uuid_generate_v4(), 
        v_user_id,
        v_checking_account_id,
        v_groceries_category_id,
        'expense',
        185.75,
        NOW(),
        'Weekly groceries',
        NOW()
    );
    
    -- Add sample income transaction
    INSERT INTO public.transactions (id, user_id, account_id, category_id, type, amount, date, notes, created_at)
    VALUES (
        uuid_generate_v4(), 
        v_user_id,
        v_checking_account_id,
        v_salary_category_id,
        'income',
        4500.0,
        NOW(),
        'Monthly salary',
        NOW()
    );
END $$;
*/

-- Query to verify data was inserted
/*
SELECT * FROM public.accounts WHERE user_id = '952a101d-d64d-42a8-89ce-cb4061aaaf5e';
SELECT * FROM public.income_categories WHERE user_id = '952a101d-d64d-42a8-89ce-cb4061aaaf5e';
SELECT * FROM public.expense_categories WHERE user_id = '952a101d-d64d-42a8-89ce-cb4061aaaf5e';
SELECT * FROM public.goals WHERE user_id = '952a101d-d64d-42a8-89ce-cb4061aaaf5e';
*/

-- Populate transaction data for goal contributions
-- This script inserts test data to verify the contribution tracking functionality

-- Insert test accounts if they don't exist
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first user ID from the system
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    -- If no users exist, exit gracefully
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in the system. Please create a user first.';
        RETURN;
    END IF;
    
    -- Insert a test checking account if it doesn't exist
    INSERT INTO accounts (id, user_id, account_name, account_type, balance, status)
    SELECT 
        uuid_generate_v4(), 
        test_user_id, 
        'Test Checking Account', 
        'checking', 
        50000.00, 
        'active'
    WHERE NOT EXISTS (
        SELECT 1 FROM accounts 
        WHERE user_id = test_user_id AND account_name = 'Test Checking Account'
    );
    
    -- Insert a test savings account if it doesn't exist
    INSERT INTO accounts (id, user_id, account_name, account_type, balance, status)
    SELECT 
        uuid_generate_v4(), 
        test_user_id, 
        'Test Savings Account', 
        'savings', 
        100000.00, 
        'active'
    WHERE NOT EXISTS (
        SELECT 1 FROM accounts 
        WHERE user_id = test_user_id AND account_name = 'Test Savings Account'
    );
END $$;

-- Insert test goal contributions
DO $$
DECLARE
    test_user_id UUID;
    test_goal_id UUID;
    test_account_id UUID;
    contribution_result JSONB;
BEGIN
    -- Get the first user ID from the system
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    -- If no users exist, exit gracefully
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in the system. Please create a user first.';
        RETURN;
    END IF;
    
    -- Get the first goal ID for this user
    SELECT id INTO test_goal_id FROM goals WHERE user_id = test_user_id LIMIT 1;
    
    -- If no goals exist, exit gracefully
    IF test_goal_id IS NULL THEN
        RAISE NOTICE 'No goals found for this user. Please create a goal first.';
        RETURN;
    END IF;
    
    -- Get the first account ID for this user
    SELECT id INTO test_account_id FROM accounts WHERE user_id = test_user_id LIMIT 1;
    
    -- If no accounts exist, exit gracefully
    IF test_account_id IS NULL THEN
        RAISE NOTICE 'No accounts found for this user. Please create an account first.';
        RETURN;
    END IF;
    
    -- Create a contribution from one month ago
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
        CURRENT_DATE - INTERVAL '1 month',
        5000.00,
        'Initial contribution to goal',
        'contribution',
        'Goal Contribution',
        test_account_id,
        test_goal_id,
        test_user_id
    );
    
    -- Create a contribution from two weeks ago
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
        CURRENT_DATE - INTERVAL '2 weeks',
        3000.00,
        'Mid-month contribution',
        'contribution',
        'Goal Contribution',
        test_account_id,
        test_goal_id,
        test_user_id
    );
    
    -- Create a contribution from yesterday
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
        2000.00,
        'Recent contribution',
        'contribution',
        'Goal Contribution',
        test_account_id,
        test_goal_id,
        test_user_id
    );
    
    -- Update the goal's current amount to reflect these contributions
    UPDATE goals
    SET current_amount = current_amount + 10000.00
    WHERE id = test_goal_id;
    
    -- Update the account balance
    UPDATE accounts
    SET balance = balance - 10000.00
    WHERE id = test_account_id;
    
    RAISE NOTICE 'Successfully inserted test contribution data for goal %', test_goal_id;
END $$;

-- Verify the data was inserted correctly
SELECT * FROM goal_contributions ORDER BY date DESC; 