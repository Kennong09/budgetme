-- Fix User Signup Issue
-- This script fixes the user signup issue by ensuring the profile trigger is properly set up
-- Run this script in the Supabase SQL Editor

-- First, make sure the profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create or replace the trigger function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_id UUID;
BEGIN
  -- Insert the user profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  
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
    -- Log the error but don't fail the transaction
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add permissions to access auth schema objects (needed for the trigger)
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT ON auth.users TO postgres, anon, authenticated, service_role;

-- Allow the trigger function to be executed
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;

-- Fix any missing profiles for existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name'
FROM
  auth.users u
LEFT JOIN
  public.profiles p ON u.id = p.id
WHERE
  p.id IS NULL;

-- Create default accounts for existing users who don't have them
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT u.id FROM auth.users u
    LEFT JOIN public.accounts a ON u.id = a.user_id
    WHERE a.id IS NULL
  LOOP
    -- Create default accounts
    INSERT INTO public.accounts (id, user_id, account_name, account_type, balance, status, created_at)
    VALUES
      (uuid_generate_v4(), user_record.id, 'Primary Checking', 'checking', 5234.65, 'active', NOW()),
      (uuid_generate_v4(), user_record.id, 'Savings Account', 'savings', 12750.42, 'active', NOW()),
      (uuid_generate_v4(), user_record.id, 'Credit Card', 'credit', -1250.3, 'active', NOW());
      
    -- Create default income categories
    INSERT INTO public.income_categories (id, user_id, category_name, icon, is_default, created_at)
    VALUES
      (uuid_generate_v4(), user_record.id, 'Salary', 'cash', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Freelance', 'briefcase', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Investments', 'trending-up', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Gifts', 'gift', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Other Income', 'plus-circle', TRUE, NOW());
      
    -- Create default expense categories
    INSERT INTO public.expense_categories (id, user_id, category_name, icon, is_default, created_at)
    VALUES
      (uuid_generate_v4(), user_record.id, 'Housing', 'home', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Utilities', 'zap', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Groceries', 'shopping-cart', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Transportation', 'truck', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Dining Out', 'coffee', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Entertainment', 'film', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Healthcare', 'activity', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Education', 'book', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Shopping', 'shopping-bag', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Personal Care', 'user', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Travel', 'map', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Subscriptions', 'repeat', TRUE, NOW()),
      (uuid_generate_v4(), user_record.id, 'Other Expenses', 'more-horizontal', TRUE, NOW());
  END LOOP;
END $$;

-- Verify the trigger is set correctly
SELECT 
  pg_trigger.tgname AS trigger_name,
  pg_class.relname AS table_name,
  pg_proc.proname AS function_name
FROM 
  pg_trigger
JOIN 
  pg_class ON pg_trigger.tgrelid = pg_class.oid
JOIN 
  pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE 
  pg_class.relname = 'users'
  AND pg_trigger.tgname = 'on_auth_user_created'; 