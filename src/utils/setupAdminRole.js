// This script sets up the admin role and necessary tables in Supabase
// Run with: node setupAdminRole.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase client initialization - needs to be run with SERVICE_ROLE key
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Note: This should be the service role key
);

async function setupAdminRole() {
  console.log('Setting up admin role and tables in Supabase...');
  
  try {
    // 1. Create or update the profiles table if it doesn't exist
    const { data: profilesCheck, error: profilesCheckError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesCheckError) {
      console.log('Creating profiles table...');
      
      // Create profiles table
      await supabase.rpc('create_profiles_table', {});
    } else {
      console.log('Profiles table already exists, checking for role column...');
    }
    
    // 2. Add role column to profiles table if it doesn't exist
    try {
      await supabase.rpc('add_role_column_to_profiles', {});
      console.log('Role column added to profiles table if it didn\'t exist');
    } catch (error) {
      console.log('Error adding role column (might already exist):', error.message);
    }
    
    // 3. Create the admin_activities table for logging admin actions
    console.log('Creating admin_activities table if it doesn\'t exist...');
    await supabase.rpc('create_admin_activities_table', {});
    
    // 4. Set up appropriate RLS policies
    console.log('Setting up RLS policies...');
    await supabase.rpc('setup_admin_rls_policies', {});
    
    // 5. Create admin-specific views
    console.log('Creating admin views...');
    await supabase.rpc('create_admin_views', {});
    
    console.log('Admin role setup completed successfully!');
    
    // 6. Instructions for setting up the first admin user
    console.log('\nTo set up your first admin user:');
    console.log('1. Go to the Supabase dashboard');
    console.log('2. Navigate to the SQL editor');
    console.log('3. Run the following query, replacing USER_ID with the actual user ID:');
    console.log('\nUPDATE public.profiles SET role = \'admin\' WHERE id = \'YOUR_USER_ID\';');
    
  } catch (error) {
    console.error('Error setting up admin role:', error);
  }
}

// Define SQL functions that will be executed
async function setupDatabaseFunctions() {
  try {
    console.log('Creating database functions...');
    
    // Function to create profiles table
    await supabase.rpc('create_function_create_profiles_table', {
      func_definition: `
        CREATE OR REPLACE FUNCTION create_profiles_table() 
        RETURNS void AS $$
        BEGIN
          CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name TEXT,
            avatar_url TEXT,
            email TEXT,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
          );
          
          -- Set up RLS
          ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
          
          -- Create policy to allow users to see their own profile
          CREATE POLICY "Users can view their own profile"
            ON public.profiles FOR SELECT
            USING (auth.uid() = id);
            
          -- Create policy to allow users to update their own profile
          CREATE POLICY "Users can update their own profile"
            ON public.profiles FOR UPDATE
            USING (auth.uid() = id);
            
          -- Create policy to allow admins to view all profiles
          CREATE POLICY "Admins can view all profiles"
            ON public.profiles FOR SELECT
            USING (EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role = 'admin'
            ));
            
          -- Create policy to allow admins to update all profiles
          CREATE POLICY "Admins can update all profiles"
            ON public.profiles FOR UPDATE
            USING (EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role = 'admin'
            ));
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    // Function to add role column to profiles table
    await supabase.rpc('create_function_add_role_column_to_profiles', {
      func_definition: `
        CREATE OR REPLACE FUNCTION add_role_column_to_profiles() 
        RETURNS void AS $$
        BEGIN
          -- Check if the column exists, if not add it
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'role'
          ) THEN
            ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    // Function to create admin_activities table
    await supabase.rpc('create_function_create_admin_activities_table', {
      func_definition: `
        CREATE OR REPLACE FUNCTION create_admin_activities_table() 
        RETURNS void AS $$
        BEGIN
          CREATE TABLE IF NOT EXISTS public.admin_activities (
            id UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
            admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
          );
          
          -- Set up RLS
          ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;
          
          -- Create policy to allow admins to view all activities
          CREATE POLICY "Admins can view admin activities"
            ON public.admin_activities FOR SELECT
            USING (EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role = 'admin'
            ));
            
          -- Create policy to allow admins to insert activities
          CREATE POLICY "Admins can insert admin activities"
            ON public.admin_activities FOR INSERT
            WITH CHECK (EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role = 'admin'
            ));
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    // Function to set up RLS policies
    await supabase.rpc('create_function_setup_admin_rls_policies', {
      func_definition: `
        CREATE OR REPLACE FUNCTION setup_admin_rls_policies() 
        RETURNS void AS $$
        BEGIN
          -- Create admin access policies for budgets table
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
          
          -- Create admin access policies for transactions table
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
          
          -- Create admin access policies for goals table
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
          
          -- Create admin access policies for family_groups table
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
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    // Function to create admin views
    await supabase.rpc('create_function_create_admin_views', {
      func_definition: `
        CREATE OR REPLACE FUNCTION create_admin_views() 
        RETURNS void AS $$
        BEGIN
          -- Create admin view for user statistics
          CREATE OR REPLACE VIEW admin_user_stats AS
          SELECT 
            COUNT(DISTINCT u.id) as total_users,
            COUNT(DISTINCT CASE WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN u.id END) as active_users_last_30_days,
            COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '30 days' THEN u.id END) as new_users_last_30_days
          FROM auth.users u;
          
          -- Grant access to admin users only
          REVOKE ALL ON admin_user_stats FROM PUBLIC;
          CREATE POLICY "Admins can view user stats"
            ON admin_user_stats FOR SELECT
            USING (EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role = 'admin'
            ));
            
          -- Create admin view for budget statistics
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
            CREATE OR REPLACE VIEW admin_budget_stats AS
            SELECT 
              COUNT(*) as total_budgets,
              SUM(budget) as total_budget_amount,
              SUM(spent) as total_spent_amount,
              COUNT(DISTINCT user_id) as users_with_budgets
            FROM public.budgets;
            
            -- Grant access to admin users only
            REVOKE ALL ON admin_budget_stats FROM PUBLIC;
            CREATE POLICY "Admins can view budget stats"
              ON admin_budget_stats FOR SELECT
              USING (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
              ));
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    console.log('Database functions created successfully!');
  } catch (error) {
    console.error('Error setting up database functions:', error);
  }
}

// Run the setup
async function run() {
  await setupDatabaseFunctions();
  await setupAdminRole();
}

run(); 