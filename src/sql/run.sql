-- Setup Admin Role and Tables in Supabase
-- Run this in the Supabase SQL Editor

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create trigger function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_id UUID;
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  
  -- Create default accounts
  INSERT INTO public.accounts (id, user_id, account_name, account_type, balance, status, created_at)
  VALUES
    (uuid_generate_v4(), NEW.id, 'Primary Checking', 'checking', 5234.65, 'active', NOW()),
    (uuid_generate_v4(), NEW.id, 'Savings Account', 'savings', 12750.42, 'active', NOW()),
    (uuid_generate_v4(), NEW.id, 'Credit Card', 'credit', -1250.3, 'active', NOW());
    
  -- Create default income categories
  INSERT INTO public.income_categories (id, user_id, category_name, icon, is_default, created_at)
  VALUES
    (uuid_generate_v4(), NEW.id, 'Salary', 'cash', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Freelance', 'briefcase', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Investments', 'trending-up', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Gifts', 'gift', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Other Income', 'plus-circle', TRUE, NOW());
    
  -- Create default expense categories
  INSERT INTO public.expense_categories (id, user_id, category_name, icon, is_default, created_at)
  VALUES
    (uuid_generate_v4(), NEW.id, 'Housing', 'home', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Utilities', 'zap', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Groceries', 'shopping-cart', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Transportation', 'truck', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Dining Out', 'coffee', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Entertainment', 'film', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Healthcare', 'activity', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Education', 'book', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Shopping', 'shopping-bag', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Personal Care', 'user', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Travel', 'map', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Subscriptions', 'repeat', TRUE, NOW()),
    (uuid_generate_v4(), NEW.id, 'Other Expenses', 'more-horizontal', TRUE, NOW());
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up RLS for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
  
-- Create policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
  
-- Create policy to allow admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
  
-- Create policy to allow admins to update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- 2. Create admin_activities table for logging admin actions
CREATE TABLE IF NOT EXISTS public.admin_activities (
  id UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Set up RLS for admin_activities table
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to view all activities
DROP POLICY IF EXISTS "Admins can view admin activities" ON public.admin_activities;
CREATE POLICY "Admins can view admin activities"
  ON public.admin_activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
  
-- Create policy to allow admins to insert activities
DROP POLICY IF EXISTS "Admins can insert admin activities" ON public.admin_activities;
CREATE POLICY "Admins can insert admin activities"
  ON public.admin_activities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- 3. Create admin access policies for budgets table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    DROP POLICY IF EXISTS "Admins can view all budgets" ON public.budgets;
    CREATE POLICY "Admins can view all budgets"
      ON public.budgets FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
    
    DROP POLICY IF EXISTS "Admins can update all budgets" ON public.budgets;
    CREATE POLICY "Admins can update all budgets"
      ON public.budgets FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
      
    DROP POLICY IF EXISTS "Admins can delete budgets" ON public.budgets;
    CREATE POLICY "Admins can delete budgets"
      ON public.budgets FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;
END $$;

-- 4. Create admin access policies for transactions table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
    CREATE POLICY "Admins can view all transactions"
      ON public.transactions FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
    
    DROP POLICY IF EXISTS "Admins can update all transactions" ON public.transactions;
    CREATE POLICY "Admins can update all transactions"
      ON public.transactions FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
      
    DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;
    CREATE POLICY "Admins can delete transactions"
      ON public.transactions FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;
END $$;

-- 5. Create admin access policies for goals table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    DROP POLICY IF EXISTS "Admins can view all goals" ON public.goals;
    CREATE POLICY "Admins can view all goals"
      ON public.goals FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
    
    DROP POLICY IF EXISTS "Admins can update all goals" ON public.goals;
    CREATE POLICY "Admins can update all goals"
      ON public.goals FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
      
    DROP POLICY IF EXISTS "Admins can delete goals" ON public.goals;
    CREATE POLICY "Admins can delete goals"
      ON public.goals FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;
END $$;

-- 6. Create admin access policies for family_groups table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_groups') THEN
    DROP POLICY IF EXISTS "Admins can view all family groups" ON public.family_groups;
    CREATE POLICY "Admins can view all family groups"
      ON public.family_groups FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
    
    DROP POLICY IF EXISTS "Admins can update all family groups" ON public.family_groups;
    CREATE POLICY "Admins can update all family groups"
      ON public.family_groups FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
      
    DROP POLICY IF EXISTS "Admins can delete family groups" ON public.family_groups;
    CREATE POLICY "Admins can delete family groups"
      ON public.family_groups FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;
END $$;

-- 7. Create admin views for statistics
-- Create admin view for user statistics
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN u.id END) as active_users_last_30_days,
  COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '30 days' THEN u.id END) as new_users_last_30_days
FROM auth.users u;

-- Create secure wrapper function for admin_user_stats view
CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users_last_30_days BIGINT,
  new_users_last_30_days BIGINT
) AS $$
BEGIN
  -- Check if the current user is an admin
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN QUERY SELECT * FROM admin_user_stats;
  ELSE
    -- Return empty result if not admin
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin view for budget statistics if budgets table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW admin_budget_stats AS
      SELECT 
        COUNT(*) as total_budgets,
        SUM(budget) as total_budget_amount,
        SUM(spent) as total_spent_amount,
        COUNT(DISTINCT user_id) as users_with_budgets
      FROM public.budgets;
      
      -- Create secure wrapper function for admin_budget_stats view
      CREATE OR REPLACE FUNCTION get_admin_budget_stats()
      RETURNS TABLE (
        total_budgets BIGINT,
        total_budget_amount NUMERIC,
        total_spent_amount NUMERIC,
        users_with_budgets BIGINT
      ) AS $func$
      BEGIN
        -- Check if the current user is an admin
        IF EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = ''admin''
        ) THEN
          RETURN QUERY SELECT * FROM admin_budget_stats;
        ELSE
          -- Return empty result if not admin
          RETURN QUERY SELECT 0::BIGINT, 0::NUMERIC, 0::NUMERIC, 0::BIGINT;
        END IF;
      END;
      $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ';
  END IF;
END $$;

-- 8. Create function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create functions to manage admin users
CREATE OR REPLACE FUNCTION add_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  -- Only allow admins to add other admins
  IF is_admin THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = user_id;
    
    -- Log the action
    INSERT INTO public.admin_activities (admin_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'add_admin',
      'user',
      user_id::text,
      json_build_object('added_by', auth.uid())
    );
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  -- Only allow admins to remove other admins
  IF is_admin THEN
    UPDATE public.profiles
    SET role = 'user'
    WHERE id = user_id;
    
    -- Log the action
    INSERT INTO public.admin_activities (admin_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'remove_admin',
      'user',
      user_id::text,
      json_build_object('removed_by', auth.uid())
    );
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Set up your first admin user (replace YOUR_USER_ID with the actual user ID)
-- Uncomment and run this line to make yourself an admin:
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';

-- Master script to fix contribution tracking and verify database setup
-- Run this script to ensure all database components are properly configured

-- 1. First, ensure the transactions table is properly set up
\echo 'Setting up transactions table...'
\i create-transactions-table.sql

-- 2. Fix any existing issues with contribution tracking
\echo 'Fixing contribution tracking issues...'
\i fix-contribution-tracking.sql

-- 3. Add test data if needed
\echo 'Adding test contribution data...'
\i populate-transaction-data.sql

-- 4. Verify the setup
\echo 'Verifying database setup...'

-- Check if the transactions table exists and has the right structure
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'transactions'
) AS transactions_table_exists;

-- Check if the views exist
SELECT EXISTS (
   SELECT FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name = 'transaction_details'
) AS transaction_details_view_exists;

SELECT EXISTS (
   SELECT FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name = 'goal_contributions'
) AS goal_contributions_view_exists;

-- Check if the contribute_to_goal function exists
SELECT EXISTS (
   SELECT FROM pg_proc 
   WHERE proname = 'contribute_to_goal'
) AS contribute_to_goal_function_exists;

-- Display a summary of goals and their contributions
\echo 'Summary of goals and contributions:'
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

-- Show recent contributions
\echo 'Recent contributions:'
SELECT 
    t.date,
    t.amount,
    t.notes,
    g.goal_name,
    a.account_name
FROM 
    transactions t
JOIN 
    goals g ON t.goal_id = g.id
LEFT JOIN 
    accounts a ON t.account_id = a.id
WHERE 
    t.goal_id IS NOT NULL
ORDER BY 
    t.date DESC
LIMIT 10;

\echo 'Database setup complete!'