-- =============================================================================
-- PCZC Education - Realistic Filipino Financial Data Population
-- User: pczceducation@gmail.com (ff512b39-c50d-4682-b362-905a9864bd43)
-- Period: March 1, 2025 - November 17, 2025
-- Total Transactions: ~300+ realistic Filipino spending patterns
-- =============================================================================

-- Get Account IDs and Category IDs for reference
DO $$ 
DECLARE
    v_user_id UUID := 'ff512b39-c50d-4682-b362-905a9864bd43'::uuid;
    v_bdo_checking UUID;
    v_bpi_savings UUID;
    v_gcash UUID;
    
    -- Income Categories
    v_salary_cat UUID;
    
    -- Expense Categories  
    v_housing_cat UUID;
    v_transport_cat UUID;
    v_food_cat UUID;
    v_groceries_cat UUID;
    v_utilities_cat UUID;
    v_healthcare_cat UUID;
    v_entertainment_cat UUID;
    v_shopping_cat UUID;
    v_education_cat UUID;
    v_insurance_cat UUID;
    v_travel_cat UUID;
    v_gifts_cat UUID;
    
BEGIN
    -- Fetch Account IDs
    SELECT id INTO v_bdo_checking FROM public.accounts WHERE user_id = v_user_id AND account_name = 'BDO Checking';
    SELECT id INTO v_bpi_savings FROM public.accounts WHERE user_id = v_user_id AND account_name = 'BPI Savings';
    SELECT id INTO v_gcash FROM public.accounts WHERE user_id = v_user_id AND account_name = 'GCash';
    
    -- Fetch Category IDs
    SELECT id INTO v_salary_cat FROM public.income_categories WHERE user_id = v_user_id AND category_name = 'Salary';
    SELECT id INTO v_housing_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Housing';
    SELECT id INTO v_transport_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Transportation';
    SELECT id INTO v_food_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Food & Dining';
    SELECT id INTO v_groceries_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Groceries';
    SELECT id INTO v_utilities_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Utilities';
    SELECT id INTO v_healthcare_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Healthcare';
    SELECT id INTO v_entertainment_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Entertainment';
    SELECT id INTO v_shopping_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Shopping';
    SELECT id INTO v_education_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Education';
    SELECT id INTO v_insurance_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Insurance';
    SELECT id INTO v_travel_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Travel';
    SELECT id INTO v_gifts_cat FROM public.expense_categories WHERE user_id = v_user_id AND category_name = 'Gifts & Donations';
    
    RAISE NOTICE 'Starting transaction population for PCZC Education...';
    
    -- ==========================================================================
    -- STEP 5: MONTHLY SALARY INCOME (March - November 2025)
    -- ==========================================================================
    RAISE NOTICE 'Creating salary income transactions...';
    
    INSERT INTO public.transactions (user_id, date, amount, description, type, account_id, income_category_id, status, created_at) VALUES
    (v_user_id, '2025-03-15', 65000.00, 'Monthly Salary - March 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-03-15 09:00:00+08'),
    (v_user_id, '2025-04-15', 65000.00, 'Monthly Salary - April 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-04-15 09:00:00+08'),
    (v_user_id, '2025-05-15', 65000.00, 'Monthly Salary - May 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-05-15 09:00:00+08'),
    (v_user_id, '2025-06-15', 65000.00, 'Monthly Salary - June 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-06-15 09:00:00+08'),
    (v_user_id, '2025-07-15', 65000.00, 'Monthly Salary - July 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-07-15 09:00:00+08'),
    (v_user_id, '2025-08-15', 65000.00, 'Monthly Salary - August 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-08-15 09:00:00+08'),
    (v_user_id, '2025-09-15', 65000.00, 'Monthly Salary - September 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-09-15 09:00:00+08'),
    (v_user_id, '2025-10-15', 65000.00, 'Monthly Salary - October 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-10-15 09:00:00+08'),
    (v_user_id, '2025-11-15', 65000.00, 'Monthly Salary - November 2025', 'income', v_bdo_checking, v_salary_cat, 'completed', '2025-11-15 09:00:00+08');
    
    RAISE NOTICE '✓ Created 9 salary transactions (₱585,000 total income)';
    
    -- ==========================================================================
    -- STEP 6: MONTHLY RECURRING EXPENSES (March - November 2025)
    -- ==========================================================================
    RAISE NOTICE 'Creating recurring monthly expenses...';
    
    -- RENT PAYMENTS (1st of each month)
    INSERT INTO public.transactions (user_id, date, amount, description, type, account_id, expense_category_id, status) VALUES
    (v_user_id, '2025-03-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed'),
    (v_user_id, '2025-04-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed'),
    (v_user_id, '2025-05-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed'),
    (v_user_id, '2025-06-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed'),
    (v_user_id, '2025-07-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed'),
    (v_user_id, '2025-08-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed'),
    (v_user_id, '2025-09-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed'),
    (v_user_id, '2025-10-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed'),
    (v_user_id, '2025-11-01', 18000.00, 'Monthly Rent Payment', 'expense', v_bdo_checking, v_housing_cat, 'completed');
    
    -- ELECTRICITY BILLS (Meralco - varying by season)
    INSERT INTO public.transactions (user_id, date, amount, description, type, account_id, expense_category_id, status) VALUES
    (v_user_id, '2025-03-22', 4450.00, 'Meralco Bill - March (Summer)', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-04-24', 4320.00, 'Meralco Bill - April (Summer)', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-05-21', 4280.00, 'Meralco Bill - May (Summer)', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-06-23', 4050.00, 'Meralco Bill - June (Rainy)', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-07-20', 3920.00, 'Meralco Bill - July (Rainy)', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-08-25', 3880.00, 'Meralco Bill - August (Rainy)', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-09-22', 3150.00, 'Meralco Bill - September', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-10-24', 2980.00, 'Meralco Bill - October', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-11-20', 2920.00, 'Meralco Bill - November', 'expense', v_bdo_checking, v_utilities_cat, 'completed');
    
    -- WATER BILLS (Manila Water)
    INSERT INTO public.transactions (user_id, date, amount, description, type, account_id, expense_category_id, status) VALUES
    (v_user_id, '2025-03-18', 1020.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-04-20', 980.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-05-19', 1050.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-06-21', 920.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-07-18', 1100.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-08-22', 950.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-09-20', 1030.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-10-19', 990.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-11-18', 1010.00, 'Manila Water Bill', 'expense', v_bdo_checking, v_utilities_cat, 'completed');
    
    -- INTERNET (PLDT Fibr)
    INSERT INTO public.transactions (user_id, date, amount, description, type, account_id, expense_category_id, status) VALUES
    (v_user_id, '2025-03-07', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-04-06', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-05-08', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-06-09', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-07-10', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-08-07', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-09-05', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-10-08', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed'),
    (v_user_id, '2025-11-06', 1699.00, 'PLDT Fibr Internet', 'expense', v_bdo_checking, v_utilities_cat, 'completed');
    
    -- MOBILE PLAN (Globe - via GCash)
    INSERT INTO public.transactions (user_id, date, amount, description, type, account_id, expense_category_id, status) VALUES
    (v_user_id, '2025-03-10', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed'),
    (v_user_id, '2025-04-09', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed'),
    (v_user_id, '2025-05-12', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed'),
    (v_user_id, '2025-06-11', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed'),
    (v_user_id, '2025-07-08', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed'),
    (v_user_id, '2025-08-10', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed'),
    (v_user_id, '2025-09-09', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed'),
    (v_user_id, '2025-10-11', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed'),
    (v_user_id, '2025-11-08', 999.00, 'Globe Mobile Plan', 'expense', v_gcash, v_utilities_cat, 'completed');
    
    -- INSURANCE PREMIUM
    INSERT INTO public.transactions (user_id, date, amount, description, type, account_id, expense_category_id, status) VALUES
    (v_user_id, '2025-03-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed'),
    (v_user_id, '2025-04-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed'),
    (v_user_id, '2025-05-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed'),
    (v_user_id, '2025-06-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed'),
    (v_user_id, '2025-07-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed'),
    (v_user_id, '2025-08-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed'),
    (v_user_id, '2025-09-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed'),
    (v_user_id, '2025-10-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed'),
    (v_user_id, '2025-11-05', 3500.00, 'Life Insurance Premium', 'expense', v_bdo_checking, v_insurance_cat, 'completed');
    
    RAISE NOTICE '✓ Created 81 recurring monthly expenses';
    
END $$;

-- Verify initial transaction count
SELECT 
    'Initial Transaction Summary' as status,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE type = 'income') as income_count,
    COUNT(*) FILTER (WHERE type = 'expense') as expense_count,
    SUM(amount) FILTER (WHERE type = 'income') as total_income,
    SUM(amount) FILTER (WHERE type = 'expense') as total_expenses
FROM public.transactions 
WHERE user_id = 'ff512b39-c50d-4682-b362-905a9864bd43'::uuid;
