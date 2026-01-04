-- DELETE TEST GOAL
DELETE FROM public.goals WHERE user_id = 'ff512b39-c50d-4682-b362-905a9864bd43'::uuid AND goal_name = 'Test Goal';

-- GET ACCOUNT/CATEGORY IDS (using CTEs for reference)
WITH 
user_accounts AS (
  SELECT id, account_name FROM public.accounts WHERE user_id = 'ff512b39-c50d-4682-b362-905a9864bd43'::uuid
),
expense_cats AS (
  SELECT id, category_name FROM public.expense_categories WHERE user_id = 'ff512b39-c50d-4682-b362-905a9864bd43'::uuid
),

-- CREATE MONTHLY BUDGETS (63 total: 7 categories × 9 months)
budget_inserts AS (
  INSERT INTO public.budgets (user_id, budget_name, amount, spent, category_id, period, start_date, end_date, alert_threshold, status)
  SELECT 
    'ff512b39-c50d-4682-b362-905a9864bd43'::uuid,
    cat.category_name || ' - ' || TO_CHAR(dates.start_date, 'Mon YYYY'),
    CASE cat.category_name
      WHEN 'Housing' THEN 20000
      WHEN 'Groceries' THEN 18000
      WHEN 'Transportation' THEN 8000
      WHEN 'Food & Dining' THEN 10000
      WHEN 'Utilities' THEN 6000
      WHEN 'Entertainment' THEN 5000
      WHEN 'Shopping' THEN 8000
    END,
    0,
    cat.id,
    'monthly',
    dates.start_date,
    dates.end_date,
    CASE cat.category_name
      WHEN 'Housing' THEN 0.90
      WHEN 'Groceries' THEN 0.85
      WHEN 'Transportation' THEN 0.80
      WHEN 'Food & Dining' THEN 0.80
      WHEN 'Utilities' THEN 0.85
      WHEN 'Entertainment' THEN 0.75
      WHEN 'Shopping' THEN 0.80
    END,
    'active'
  FROM expense_cats cat
  CROSS JOIN (
    SELECT 
      ('2025-03-01'::date + (n || ' months')::interval)::date as start_date,
      (('2025-03-01'::date + (n || ' months')::interval) + interval '1 month' - interval '1 day')::date as end_date
    FROM generate_series(0, 8) n
  ) dates
  WHERE cat.category_name IN ('Housing', 'Groceries', 'Transportation', 'Food & Dining', 'Utilities', 'Entertainment', 'Shopping')
  RETURNING id
),

-- CREATE PERSONAL GOALS
personal_goals AS (
  INSERT INTO public.goals (user_id, goal_name, description, target_amount, current_amount, currency, priority, category, target_date, status, is_family_goal, created_date)
  VALUES
  ('ff512b39-c50d-4682-b362-905a9864bd43'::uuid, 'Emergency Fund (6 Months)', 'Build 6 months of expenses', 200000, 70000, 'PHP', 'urgent', 'emergency', '2026-03-31', 'in_progress', false, '2025-03-01'),
  ('ff512b39-c50d-4682-b362-905a9864bd43'::uuid, 'Dream Boracay Vacation', 'Summer 2026 beach trip', 80000, 42000, 'PHP', 'high', 'vacation', '2026-04-30', 'in_progress', false, '2025-03-01'),
  ('ff512b39-c50d-4682-b362-905a9864bd43'::uuid, 'New Laptop', 'MacBook or gaming laptop', 45000, 28500, 'PHP', 'medium', 'general', '2025-12-31', 'in_progress', false, '2025-03-01'),
  ('ff512b39-c50d-4682-b362-905a9864bd43'::uuid, 'Condo Down Payment', 'Dream home down payment', 500000, 85000, 'PHP', 'high', 'house', '2027-12-31', 'in_progress', false, '2025-03-01')
  RETURNING id, goal_name
)

SELECT * FROM personal_goals;
