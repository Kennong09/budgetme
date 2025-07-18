-- SQL Script to populate data for user 9d6ee9db-c1cb-4c24-b424-2b884673ca4f
-- This script populates the database with families, budgets, goals, and transactions
-- All data is interconnected and realistic for a personal finance application

-- Define the user ID as a constant (removing the problematic \set command)
DO $$
DECLARE
    v_user_id UUID := '9d6ee9db-c1cb-4c24-b424-2b884673ca4f';
    v_family_id UUID;
BEGIN
    -- Create the family
    INSERT INTO families (id, family_name, description, currency_pref, created_by)
    VALUES (
        uuid_generate_v4(),
        'Johnson Family',
        'Financial tracking for our family',
        'USD',
        v_user_id
    )
    RETURNING id INTO v_family_id;

    -- Add the main user as admin member
    INSERT INTO family_members (family_id, user_id, role, status)
    VALUES (
        v_family_id,
        v_user_id,
        'admin',
        'active'
    );
    
    -- We skip adding the spouse since that user doesn't exist in the database
END $$;

-- Step 2: Create accounts for the user
DO $$
DECLARE
    v_user_id UUID := '9d6ee9db-c1cb-4c24-b424-2b884673ca4f';
    v_checking_id UUID;
    v_savings_id UUID;
    v_credit_card_id UUID;
BEGIN
    -- Checking account
    INSERT INTO accounts (id, user_id, account_name, account_type, balance)
    VALUES (
        uuid_generate_v4(),
        v_user_id,
        'Primary Checking',
        'checking',
        3250.75
    )
    RETURNING id INTO v_checking_id;

    -- Savings account
    INSERT INTO accounts (id, user_id, account_name, account_type, balance)
    VALUES (
        uuid_generate_v4(),
        v_user_id,
        'Savings Account',
        'savings',
        12500.00
    )
    RETURNING id INTO v_savings_id;

    -- Credit card account
    INSERT INTO accounts (id, user_id, account_name, account_type, balance)
    VALUES (
        uuid_generate_v4(),
        v_user_id,
        'Credit Card',
        'credit',
        -1200.50
    )
    RETURNING id INTO v_credit_card_id;
END $$;

-- Step 3: Create expense categories for the user
DO $$
DECLARE
    v_user_id UUID := '9d6ee9db-c1cb-4c24-b424-2b884673ca4f';
    v_housing_id UUID;
    v_groceries_id UUID;
    v_utilities_id UUID;
    v_transportation_id UUID;
    v_entertainment_id UUID;
    v_dining_id UUID;
    v_healthcare_id UUID;
    v_shopping_id UUID;
BEGIN
    -- Insert expense categories
    INSERT INTO expense_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Housing', 'home')
    RETURNING id INTO v_housing_id;
    
    INSERT INTO expense_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Groceries', 'shopping-cart')
    RETURNING id INTO v_groceries_id;
    
    INSERT INTO expense_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Utilities', 'bolt')
    RETURNING id INTO v_utilities_id;
    
    INSERT INTO expense_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Transportation', 'car')
    RETURNING id INTO v_transportation_id;
    
    INSERT INTO expense_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Entertainment', 'film')
    RETURNING id INTO v_entertainment_id;
    
    INSERT INTO expense_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Dining Out', 'utensils')
    RETURNING id INTO v_dining_id;
    
    INSERT INTO expense_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Healthcare', 'medkit')
    RETURNING id INTO v_healthcare_id;
    
    INSERT INTO expense_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Shopping', 'shopping-bag')
    RETURNING id INTO v_shopping_id;
END $$;

-- Step 4: Create income categories for the user
DO $$
DECLARE
    v_user_id UUID := '9d6ee9db-c1cb-4c24-b424-2b884673ca4f';
    v_salary_id UUID;
    v_bonus_id UUID;
    v_interest_id UUID;
    v_freelance_id UUID;
BEGIN
    -- Insert income categories
    INSERT INTO income_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Salary', 'briefcase')
    RETURNING id INTO v_salary_id;
    
    INSERT INTO income_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Bonus', 'gift')
    RETURNING id INTO v_bonus_id;
    
    INSERT INTO income_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Interest', 'chart-line')
    RETURNING id INTO v_interest_id;
    
    INSERT INTO income_categories (id, user_id, category_name, icon)
    VALUES
    (uuid_generate_v4(), v_user_id, 'Freelance', 'laptop')
    RETURNING id INTO v_freelance_id;
END $$;

-- Step 5: Create goals for the user
DO $$
DECLARE
    v_user_id UUID := '9d6ee9db-c1cb-4c24-b424-2b884673ca4f';
    v_vacation_goal_id UUID;
    v_emergency_goal_id UUID;
    v_home_goal_id UUID;
    v_current_date DATE := CURRENT_DATE;
BEGIN
    -- Vacation Goal
    INSERT INTO goals (id, user_id, goal_name, target_amount, current_amount, target_date, priority, notes, status)
    VALUES (
        uuid_generate_v4(),
        v_user_id,
        'Hawaii Vacation',
        5000.00,
        2100.00,
        (v_current_date + INTERVAL '6 months')::DATE,
        'medium',
        'Saving for a family vacation to Hawaii next summer',
        'in_progress'
    )
    RETURNING id INTO v_vacation_goal_id;
    
    -- Emergency Fund Goal
    INSERT INTO goals (id, user_id, goal_name, target_amount, current_amount, target_date, priority, notes, status)
    VALUES (
        uuid_generate_v4(),
        v_user_id,
        'Emergency Fund',
        15000.00,
        7500.00,
        (v_current_date + INTERVAL '12 months')::DATE,
        'high',
        '6 months of essential expenses for emergencies',
        'in_progress'
    )
    RETURNING id INTO v_emergency_goal_id;
    
    -- Home Down Payment Goal
    INSERT INTO goals (id, user_id, goal_name, target_amount, current_amount, target_date, priority, notes, status)
    VALUES (
        uuid_generate_v4(),
        v_user_id,
        'Home Down Payment',
        60000.00,
        12500.00,
        (v_current_date + INTERVAL '3 years')::DATE,
        'high',
        'Saving for a down payment on our first home',
        'in_progress'
    )
    RETURNING id INTO v_home_goal_id;
END $$;

-- Step 6: Create budgets for the user
DO $$
DECLARE
    v_user_id UUID := '9d6ee9db-c1cb-4c24-b424-2b884673ca4f';
    v_current_date DATE := CURRENT_DATE;
    v_month_start DATE := DATE_TRUNC('month', v_current_date)::DATE;
    v_month_end DATE := (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month - 1 day')::DATE;
    v_housing_id UUID;
    v_groceries_id UUID;
    v_utilities_id UUID;
    v_transportation_id UUID;
    v_entertainment_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO v_housing_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Housing';
    
    SELECT id INTO v_groceries_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Groceries';
    
    SELECT id INTO v_utilities_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Utilities';
    
    SELECT id INTO v_transportation_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Transportation';
    
    SELECT id INTO v_entertainment_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Entertainment';
    
    -- Insert budget data
    INSERT INTO budgets (user_id, category_id, amount, spent, period, start_date, end_date)
    VALUES 
    (v_user_id, v_housing_id, 1500.00, 1500.00, 'month', v_month_start, v_month_end),
    (v_user_id, v_groceries_id, 600.00, 435.78, 'month', v_month_start, v_month_end),
    (v_user_id, v_utilities_id, 350.00, 287.65, 'month', v_month_start, v_month_end),
    (v_user_id, v_transportation_id, 250.00, 180.25, 'month', v_month_start, v_month_end),
    (v_user_id, v_entertainment_id, 200.00, 165.90, 'month', v_month_start, v_month_end);
END $$;

-- Step 7: Create transactions for the user
DO $$
DECLARE
    v_user_id UUID := '9d6ee9db-c1cb-4c24-b424-2b884673ca4f';
    v_current_date DATE := CURRENT_DATE;
    v_checking_id UUID;
    v_savings_id UUID;
    v_credit_card_id UUID;
    v_housing_id UUID;
    v_groceries_id UUID;
    v_utilities_id UUID;
    v_transportation_id UUID;
    v_entertainment_id UUID;
    v_dining_id UUID;
    v_healthcare_id UUID;
    v_shopping_id UUID;
    v_salary_id UUID;
    v_vacation_goal_id UUID;
    v_emergency_goal_id UUID;
    v_home_goal_id UUID;
BEGIN
    -- Get account IDs
    SELECT id INTO v_checking_id FROM accounts 
    WHERE user_id = v_user_id AND account_name = 'Primary Checking';
    
    SELECT id INTO v_savings_id FROM accounts 
    WHERE user_id = v_user_id AND account_name = 'Savings Account';
    
    SELECT id INTO v_credit_card_id FROM accounts 
    WHERE user_id = v_user_id AND account_name = 'Credit Card';
    
    -- Get category IDs
    SELECT id INTO v_housing_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Housing';
    
    SELECT id INTO v_groceries_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Groceries';
    
    SELECT id INTO v_utilities_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Utilities';
    
    SELECT id INTO v_transportation_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Transportation';
    
    SELECT id INTO v_entertainment_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Entertainment';
    
    SELECT id INTO v_dining_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Dining Out';
    
    SELECT id INTO v_healthcare_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Healthcare';
    
    SELECT id INTO v_shopping_id FROM expense_categories 
    WHERE user_id = v_user_id AND category_name = 'Shopping';
    
    SELECT id INTO v_salary_id FROM income_categories 
    WHERE user_id = v_user_id AND category_name = 'Salary';
    
    -- Get goal IDs
    SELECT id INTO v_vacation_goal_id FROM goals 
    WHERE user_id = v_user_id AND goal_name = 'Hawaii Vacation';
    
    SELECT id INTO v_emergency_goal_id FROM goals 
    WHERE user_id = v_user_id AND goal_name = 'Emergency Fund';
    
    SELECT id INTO v_home_goal_id FROM goals 
    WHERE user_id = v_user_id AND goal_name = 'Home Down Payment';
    
    -- Insert transaction data (at least 20 transactions)
    -- Income transactions
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '30 days', 3800.00, 'Monthly Salary', 'income', v_salary_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '15 days', 450.00, 'Side Project Payment', 'income', v_salary_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '0 days', 3800.00, 'Monthly Salary', 'income', v_salary_id, v_checking_id, v_user_id);
    
    -- Expense transactions
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '28 days', 1500.00, 'Monthly Rent', 'expense', v_housing_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '25 days', 125.50, 'Grocery Shopping - Whole Foods', 'expense', v_groceries_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '23 days', 85.75, 'Electricity Bill', 'expense', v_utilities_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '22 days', 65.40, 'Dinner with Friends', 'expense', v_dining_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '20 days', 45.00, 'Gas Station', 'expense', v_transportation_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '18 days', 110.25, 'Grocery Shopping - Safeway', 'expense', v_groceries_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '15 days', 75.00, 'Internet Bill', 'expense', v_utilities_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '12 days', 35.00, 'Movie Night', 'expense', v_entertainment_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '10 days', 120.00, 'Clothing Purchase', 'expense', v_shopping_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '8 days', 200.03, 'Grocery Shopping - Costco', 'expense', v_groceries_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '6 days', 40.00, 'Gas Station', 'expense', v_transportation_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '5 days', 58.75, 'Dinner Date', 'expense', v_dining_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '4 days', 127.00, 'Water and Sewer Bill', 'expense', v_utilities_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '3 days', 75.50, 'Doctor Visit Copay', 'expense', v_healthcare_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '2 days', 95.25, 'Concert Tickets', 'expense', v_entertainment_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '1 day', 35.65, 'Pharmacy', 'expense', v_healthcare_id, v_credit_card_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, category_id, account_id, user_id)
    VALUES
    (v_current_date, 130.90, 'Phone Bill', 'expense', v_utilities_id, v_checking_id, v_user_id);
    
    -- Goal contribution transactions
    INSERT INTO transactions (date, amount, notes, type, goal_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '29 days', 300.00, 'Hawaii Vacation Savings', 'contribution', v_vacation_goal_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, goal_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '15 days', 500.00, 'Emergency Fund Contribution', 'contribution', v_emergency_goal_id, v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, goal_id, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '1 day', 1000.00, 'Home Down Payment Savings', 'contribution', v_home_goal_id, v_checking_id, v_user_id);
    
    -- Transfer transactions
    INSERT INTO transactions (date, amount, notes, type, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '27 days', 500.00, 'Transfer to Savings', 'transfer', v_checking_id, v_user_id);
    
    INSERT INTO transactions (date, amount, notes, type, account_id, user_id)
    VALUES
    (v_current_date - INTERVAL '14 days', 300.00, 'Credit Card Payment', 'transfer', v_checking_id, v_user_id);
END $$;

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Data population complete for user 9d6ee9db-c1cb-4c24-b424-2b884673ca4f';
END $$; 