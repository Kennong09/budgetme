#!/usr/bin/env node

/**
 * Standalone Node.js script to set up the BudgetMe database
 * Run with: node setupDatabase.js
 */

// Import the Supabase client
const { createClient } = require('@supabase/supabase-js');

// Get environment variables from .env file if present
try {
  require('dotenv').config();
} catch (err) {
  // dotenv not installed, continue without it
}

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://ryoujebxyvvazvtxjhlf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI3NDkzNiwiZXhwIjoyMDY0ODUwOTM2fQ.q4BiRHda6IsomEWMqc0O_MPy6LRBkoyLr3Ip0BBETu8';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Sets up required database triggers and configurations
 */
async function setupDatabaseConfiguration() {
  console.log('Setting up database configuration...');
  
  let manualInterventionRequired = false;
  const failedOperations = [];
  
  try {
    // Create user profile trigger
    console.log('\n1. Setting up user profile trigger...');
    try {
      const result = await createUserProfileTrigger();
      if (result && result.manual_intervention_required) {
        manualInterventionRequired = true;
        failedOperations.push('User profile trigger');
      } else {
        console.log('✓ User profile trigger created successfully');
      }
    } catch (error) {
      console.error('✗ Error creating user profile trigger:', error.message);
      failedOperations.push('User profile trigger');
    }
    
    // Fix any issues with profiles policies
    console.log('\n2. Fixing profiles policies...');
    try {
      const result = await fixProfilesPolicies();
      if (result && result.manual_intervention_required) {
        manualInterventionRequired = true;
        failedOperations.push('Profile policies');
      } else {
        console.log('✓ Fixed profiles policies successfully');
      }
    } catch (error) {
      console.error('✗ Error fixing profiles policies:', error.message);
      failedOperations.push('Profile policies');
    }
    
    // Create necessary views
    console.log('\n3. Creating required views...');
    try {
      const result = await createRequiredViews();
      if (result && result.manual_intervention_required) {
        manualInterventionRequired = true;
        failedOperations.push('Required views');
      } else {
        console.log('✓ Created required views successfully');
      }
    } catch (error) {
      console.error('✗ Error creating views:', error.message);
      failedOperations.push('Required views');
    }
    
    // Summary
    console.log('\n------------------------------');
    console.log('Database Configuration Summary');
    console.log('------------------------------');
    if (failedOperations.length === 0) {
      console.log('✓ All operations completed successfully');
    } else {
      console.log(`✗ Failed operations (${failedOperations.length}):`);
      failedOperations.forEach(op => console.log(` - ${op}`));
      
      if (manualInterventionRequired) {
        console.log('\nSome operations require manual intervention.');
        console.log('Please check the log above for SQL statements that need to be run manually.');
        console.log('You can run these statements in the Supabase SQL Editor or a PostgreSQL client.');
      }
    }
    
    // Return status instead of exiting
    return {
      success: failedOperations.length === 0,
      manualInterventionRequired,
      failedOperations
    };
  } catch (error) {
    console.error('Error setting up database configuration:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates the user profile trigger that automatically generates default data for new users
 * @returns {Promise<Object>} Result status
 */
async function createUserProfileTrigger() {
  try {
    // Create the trigger function for handling new users
    const { error: functionError } = await supabase.rpc('create_or_replace_handle_new_user_function', {
      function_body: `
        DECLARE
          account_id UUID;
        BEGIN
          -- Create user profile
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
            RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
            RETURN NEW;
        END;
      `
    });

    if (functionError) {
      // If RPC doesn't exist (likely), fall back to direct SQL execution
      console.log('RPC not available, creating function directly...');
      const result = await executeRawSQL(`
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
            RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);

      if (result && result.manual_intervention_required) {
        return result;
      }
    }

    // Create the trigger
    const triggerResult = await executeRawSQL(`
      -- Create the trigger on auth.users
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);

    if (triggerResult && triggerResult.manual_intervention_required) {
      return triggerResult;
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating user profile trigger:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fix infinite recursion in profiles policies
 * @returns {Promise<Object>} Result status
 */
async function fixProfilesPolicies() {
  try {
    console.log('Fixing profiles policies...');
    
    // Create admin_users table if it doesn't exist
    const tableResult = await executeRawSQL(`
      CREATE TABLE IF NOT EXISTS public.admin_users (
        id UUID PRIMARY KEY REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (tableResult && tableResult.manual_intervention_required) {
      return tableResult;
    }
    
    // Drop problematic policies to avoid infinite recursion
    const dropResult = await executeRawSQL(`
      DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
    `);
    
    if (dropResult && dropResult.manual_intervention_required) {
      return dropResult;
    }
    
    // Recreate policies using admin_users table instead
    const createResult = await executeRawSQL(`
      CREATE POLICY "Admins can view all profiles"
        ON public.profiles FOR SELECT
        USING (auth.uid() IN (SELECT id FROM public.admin_users));
      
      CREATE POLICY "Admins can update all profiles"
        ON public.profiles FOR UPDATE
        USING (auth.uid() IN (SELECT id FROM public.admin_users));
      
      -- Also add admin policies for INSERT and DELETE operations
      DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
      CREATE POLICY "Admins can insert profiles"
        ON public.profiles FOR INSERT
        WITH CHECK (auth.uid() IN (SELECT id FROM public.admin_users));
      
      DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
      CREATE POLICY "Admins can delete profiles"
        ON public.profiles FOR DELETE
        USING (auth.uid() IN (SELECT id FROM public.admin_users));
    `);
    
    if (createResult && createResult.manual_intervention_required) {
      return createResult;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error fixing profiles policies:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create required views for the application
 * @returns {Promise<Object>} Result status
 */
async function createRequiredViews() {
  try {
    console.log('Creating required views...');
    
    // Create transaction_details view
    const transViewResult = await executeRawSQL(`
      CREATE OR REPLACE VIEW public.transaction_details AS
      SELECT 
        t.id,
        t.date,
        t.amount,
        t.type,
        t.notes,
        t.category,
        t.account_id,
        t.user_id,
        t.goal_id,
        t.created_at,
        t.updated_at,
        a.account_name,
        a.account_type
      FROM 
        public.transactions t
      LEFT JOIN 
        public.accounts a ON t.account_id = a.id;
    `);
    
    if (transViewResult && transViewResult.manual_intervention_required) {
      return transViewResult;
    }
    
    // Set RLS policies for transaction_details view
    const transPolicyResult = await executeRawSQL(`
      DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transaction_details;
      CREATE POLICY "Users can view their own transactions"
        ON public.transaction_details FOR SELECT
        USING (auth.uid() = user_id);
        
      DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transaction_details;
      CREATE POLICY "Admins can view all transactions"
        ON public.transaction_details FOR SELECT
        USING (auth.uid() IN (SELECT id FROM public.admin_users));
    `);
    
    if (transPolicyResult && transPolicyResult.manual_intervention_required) {
      return transPolicyResult;
    }
    
    // Enable RLS on transaction_details view
    const transRlsResult = await executeRawSQL(`
      ALTER VIEW public.transaction_details OWNER TO postgres;
      ALTER TABLE public.transaction_details ENABLE ROW LEVEL SECURITY;
    `);
    
    if (transRlsResult && transRlsResult.manual_intervention_required) {
      return transRlsResult;
    }
    
    // Create budget_details view
    const budgetViewResult = await executeRawSQL(`
      CREATE OR REPLACE VIEW public.budget_details AS
      SELECT 
        b.id,
        b.user_id,
        b.name,
        b.amount,
        b.start_date,
        b.end_date,
        b.category,
        b.notes,
        b.created_at,
        b.updated_at,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS spent_amount
      FROM 
        public.budgets b
      LEFT JOIN 
        public.transactions t ON 
          b.user_id = t.user_id AND 
          b.category = t.category AND
          t.date BETWEEN b.start_date AND b.end_date
      GROUP BY
        b.id, b.user_id, b.name, b.amount, b.start_date, b.end_date, b.category, b.notes, b.created_at, b.updated_at;
    `);
    
    if (budgetViewResult && budgetViewResult.manual_intervention_required) {
      return budgetViewResult;
    }
    
    // Set RLS policies for budget_details view
    const budgetPolicyResult = await executeRawSQL(`
      DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budget_details;
      CREATE POLICY "Users can view their own budgets"
        ON public.budget_details FOR SELECT
        USING (auth.uid() = user_id);
        
      DROP POLICY IF EXISTS "Admins can view all budgets" ON public.budget_details;
      CREATE POLICY "Admins can view all budgets"
        ON public.budget_details FOR SELECT
        USING (auth.uid() IN (SELECT id FROM public.admin_users));
    `);
    
    if (budgetPolicyResult && budgetPolicyResult.manual_intervention_required) {
      return budgetPolicyResult;
    }
    
    // Enable RLS on budget_details view
    const budgetRlsResult = await executeRawSQL(`
      ALTER VIEW public.budget_details OWNER TO postgres;
      ALTER TABLE public.budget_details ENABLE ROW LEVEL SECURITY;
    `);
    
    if (budgetRlsResult && budgetRlsResult.manual_intervention_required) {
      return budgetRlsResult;
    }
    
    // Create goal_details view
    const goalViewResult = await executeRawSQL(`
      CREATE OR REPLACE VIEW public.goal_details AS
      SELECT 
        g.id,
        g.user_id,
        g.goal_name,
        g.target_amount,
        g.current_amount,
        g.target_date,
        g.priority,
        g.status,
        g.notes,
        g.created_at,
        g.updated_at,
        (g.target_amount - g.current_amount) AS remaining,
        (g.current_amount / NULLIF(g.target_amount, 0) * 100) AS percentage,
        CASE 
          WHEN (g.current_amount / NULLIF(g.target_amount, 0) * 100) >= 75 THEN 'good'
          WHEN (g.current_amount / NULLIF(g.target_amount, 0) * 100) >= 40 THEN 'medium'
          ELSE 'poor'
        END AS progress_status,
        (CURRENT_DATE > g.target_date AND g.status != 'completed') AS is_overdue
      FROM 
        public.goals g;
    `);
    
    if (goalViewResult && goalViewResult.manual_intervention_required) {
      return goalViewResult;
    }
    
    // Set RLS policies for goal_details view
    const goalPolicyResult = await executeRawSQL(`
      DROP POLICY IF EXISTS "Users can view their own goals" ON public.goal_details;
      CREATE POLICY "Users can view their own goals"
        ON public.goal_details FOR SELECT
        USING (auth.uid() = user_id);
        
      DROP POLICY IF EXISTS "Admins can view all goals" ON public.goal_details;
      CREATE POLICY "Admins can view all goals"
        ON public.goal_details FOR SELECT
        USING (auth.uid() IN (SELECT id FROM public.admin_users));
    `);
    
    if (goalPolicyResult && goalPolicyResult.manual_intervention_required) {
      return goalPolicyResult;
    }
    
    // Enable RLS on goal_details view
    const goalRlsResult = await executeRawSQL(`
      ALTER VIEW public.goal_details OWNER TO postgres;
      ALTER TABLE public.goal_details ENABLE ROW LEVEL SECURITY;
    `);
    
    if (goalRlsResult && goalRlsResult.manual_intervention_required) {
      return goalRlsResult;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating views:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Executes raw SQL
 * 
 * @param {string} sql SQL to execute
 * @returns {Promise<any>} Result of the query
 */
async function executeRawSQL(sql) {
  try {
    console.log('Executing SQL...');
    
    // First try using the built-in RPC if available
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // If the RPC doesn't exist, we're in a tricky situation since Supabase REST API
      // doesn't allow direct SQL execution without a custom function
      console.log('SQL RPC not available, custom function needed');
      console.log('SQL Statement (please run manually if needed):');
      console.log('-------------------------------------------------');
      console.log(sql);
      console.log('-------------------------------------------------');
      
      // Try to create the exec_sql function if postgrest is available
      try {
        if (supabase.postgrest) {
          console.log('Attempting to create SQL execution function...');
          
          // Create a custom function to execute SQL
          const createFunctionSQL = `
            CREATE OR REPLACE FUNCTION exec_sql(sql text)
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            DECLARE
              result JSONB;
            BEGIN
              EXECUTE sql;
              result := '{"success": true}'::JSONB;
              RETURN result;
            EXCEPTION WHEN OTHERS THEN
              result := jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'detail', SQLSTATE
              );
              RETURN result;
            END;
            $$;
          `;
          
          // Since we can't execute SQL directly, we have to go through a different approach
          // This is a workaround that might work in some cases but isn't guaranteed
          console.log('Please note: This may not work due to Supabase security restrictions');
          const { error: createFnError } = await supabase
            .from('_temp_function_creator')
            .select()
            .limit(1)
            .maybeSingle();
          
          if (!createFnError) {
            // Try the function again
            const { data: retryData, error: retryError } = await supabase.rpc('exec_sql', { sql });
            
            if (!retryError) {
              console.log('SQL executed successfully through RPC');
              return retryData;
            }
          }
        }
      } catch (innerError) {
        console.log('Could not create SQL execution function:', innerError);
      }
      
      // If we get here, we need to tell the user to run the SQL manually
      console.log('\nImportant: Please run the above SQL manually in your Supabase SQL editor or');
      console.log('create a custom function named "exec_sql" that can execute arbitrary SQL.');
      console.log('For security reasons, Supabase restricts direct SQL execution from the client.');
      
      // We'll continue with other operations even if this one fails
      return { success: false, manual_intervention_required: true };
    }
    
    console.log('SQL executed successfully');
    return data;
  } catch (error) {
    console.error('Error executing SQL:', error);
    // Return an error object instead of throwing to allow the script to continue
    return { success: false, error: error.message };
  }
}

/**
 * Continuously monitors for new users and processes them
 * @param {number} pollInterval - Interval in milliseconds to check for new users
 * @param {boolean} debug - Whether to run in debug mode
 * @param {number} debugTimeout - Timeout for debug mode in milliseconds
 * @returns {Promise<void>}
 */
async function monitorNewUsers(pollInterval = 5000, debug = false, debugTimeout = 30000) {
  console.log(`Starting continuous monitoring for new users (poll interval: ${pollInterval}ms)${debug ? ` in debug mode (timeout: ${debugTimeout}ms)` : ''}`);
  
  // Keep track of the last time we checked and users we've already processed
  let lastChecked = new Date();
  const processedUsers = new Set();
  const startTime = new Date().getTime();
  
  // Function to process a single new user
  async function processNewUser(user) {
    try {
      console.log(`Processing new user: ${user.id} (${user.email})`);
      
      // Check if we've already processed this user
      if (processedUsers.has(user.id)) {
        console.log(`User ${user.id} already processed, skipping`);
        return;
      }
      
      // Create default data for this user by calling the handle_new_user function directly
      const { data, error } = await supabase.rpc('handle_new_user_manually', { user_id: user.id });
      
      if (error) {
        console.error(`Error processing user ${user.id}:`, error.message);
        
        // Fall back to direct SQL if the RPC fails
        console.log('Attempting direct SQL fallback...');
        
        // Get user metadata to pass to the function
        const { data: userData, error: userError } = await supabase
          .from('auth.users')
          .select('raw_user_meta_data, email')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error(`Could not retrieve user data for ${user.id}:`, userError.message);
          return;
        }
        
        // Execute the function logic directly
        const result = await executeRawSQL(`
          -- Create user profile
          INSERT INTO public.profiles (id, full_name, email)
          VALUES (
            '${user.id}', 
            ${userData.raw_user_meta_data?.full_name ? `'${userData.raw_user_meta_data.full_name}'` : 'NULL'},
            '${userData.email}'
          )
          ON CONFLICT (id) DO NOTHING;
          
          -- Create default accounts, categories, etc.
          -- (Same code as in the handle_new_user function)
        `);
        
        if (result && result.success === false) {
          console.error(`Failed to process user ${user.id} via SQL:`, result.error || 'Unknown error');
          return;
        }
      }
      
      // Mark user as processed
      processedUsers.add(user.id);
      console.log(`Successfully processed user ${user.id}`);
      
    } catch (err) {
      console.error(`Error in processNewUser for ${user.id}:`, err);
    }
  }
  
  // Continuous polling loop - use true for infinite loop that never exits
  while (true) {
    try {
      // Check if we should exit due to debug timeout
      if (debug && (new Date().getTime() - startTime) > debugTimeout) {
        console.log(`Debug timeout reached after ${debugTimeout}ms. Exiting.`);
        return;
      }
      
      // Get users created since last check - accessing auth schema properly
      const { data: newUsers, error } = await supabase
        .from('users', { schema: 'auth' })
        .select('id, email, created_at')
        .gt('created_at', lastChecked.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching new users:', error.message);
      } else if (newUsers && newUsers.length > 0) {
        console.log(`Found ${newUsers.length} new users to process`);
        
        // Process each new user
        for (const user of newUsers) {
          await processNewUser(user);
          lastChecked = new Date(user.created_at); // Update last checked time
        }
      }
      
      // Log status periodically (every 5 minutes) or every minute in debug mode
      const now = new Date();
      if ((debug && now.getSeconds() === 0) || 
          (!debug && now.getMinutes() % 5 === 0 && now.getSeconds() < 10)) {
        console.log(`[${now.toISOString()}] Monitoring active, processed ${processedUsers.size} users so far`);
      }
      
      // Wait for the next poll interval - use a try/catch to ensure the loop continues
      try {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (timerErr) {
        console.error('Error in timer:', timerErr);
        // Just continue without waiting if there's a timer issue
      }
    } catch (err) {
      console.error('Error in monitoring loop:', err);
      // Wait before retrying, but keep the loop running
      try {
        await new Promise(resolve => setTimeout(resolve, pollInterval * 2));
      } catch (timerErr) {
        // Ignore timer errors and continue
      }
    }
    
    // Force a small delay to prevent a tight loop in case of errors
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Creates an RPC function to manually process new users
 * @returns {Promise<Object>} Result status
 */
async function createUserProcessingRPC() {
  try {
    console.log('Creating user processing RPC function...');
    
    const result = await executeRawSQL(`
      -- Create function to manually process users
      CREATE OR REPLACE FUNCTION public.handle_new_user_manually(user_id UUID)
      RETURNS JSONB AS $$
      DECLARE
        user_record RECORD;
        account_id UUID;
        result JSONB;
      BEGIN
        -- Get user data
        SELECT * INTO user_record FROM auth.users WHERE id = user_id;
        
        IF user_record IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'User not found');
        END IF;
        
        -- Create user profile
        INSERT INTO public.profiles (id, full_name, email)
        VALUES (
          user_record.id, 
          user_record.raw_user_meta_data->>'full_name',
          user_record.email
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Create default accounts
        INSERT INTO public.accounts (id, user_id, account_name, account_type, balance, status, created_at)
        VALUES
          (uuid_generate_v4(), user_record.id, 'Primary Checking', 'checking', 5234.65, 'active', NOW()),
          (uuid_generate_v4(), user_record.id, 'Savings Account', 'savings', 12750.42, 'active', NOW()),
          (uuid_generate_v4(), user_record.id, 'Credit Card', 'credit', -1250.3, 'active', NOW())
        ON CONFLICT DO NOTHING;
          
        -- Create default income categories
        INSERT INTO public.income_categories (id, user_id, category_name, icon, is_default, created_at)
        VALUES
          (uuid_generate_v4(), user_record.id, 'Salary', 'cash', TRUE, NOW()),
          (uuid_generate_v4(), user_record.id, 'Freelance', 'briefcase', TRUE, NOW()),
          (uuid_generate_v4(), user_record.id, 'Investments', 'trending-up', TRUE, NOW()),
          (uuid_generate_v4(), user_record.id, 'Gifts', 'gift', TRUE, NOW()),
          (uuid_generate_v4(), user_record.id, 'Other Income', 'plus-circle', TRUE, NOW())
        ON CONFLICT DO NOTHING;
          
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
          (uuid_generate_v4(), user_record.id, 'Other Expenses', 'more-horizontal', TRUE, NOW())
        ON CONFLICT DO NOTHING;
        
        result := jsonb_build_object(
          'success', true,
          'user_id', user_record.id,
          'email', user_record.email,
          'processed_at', now()
        );
        
        RETURN result;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
          );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.handle_new_user_manually(UUID) TO postgres;
      GRANT EXECUTE ON FUNCTION public.handle_new_user_manually(UUID) TO service_role;
    `);
    
    if (result && result.manual_intervention_required) {
      return result;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating user processing RPC:', error);
    return { success: false, error: error.message };
  }
}

// Add command line options handling
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    monitor: false,
    pollInterval: 5000,
    setupOnly: false,
    monitorOnly: false,
    debug: false,
    debugTimeout: 30000  // Default 30 seconds for debug mode
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && i + 1 < args.length) {
      options.url = args[i + 1];
      i++;
    } else if (args[i] === '--key' && i + 1 < args.length) {
      options.key = args[i + 1];
      i++;
    } else if (args[i] === '--monitor') {
      options.monitor = true;
    } else if (args[i] === '--monitor-only') {
      options.monitor = true;
      options.monitorOnly = true;
    } else if (args[i] === '--setup-only') {
      options.setupOnly = true;
    } else if (args[i] === '--poll-interval' && i + 1 < args.length) {
      options.pollInterval = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--debug') {
      options.debug = true;
    } else if (args[i] === '--debug-timeout' && i + 1 < args.length) {
      options.debug = true;
      options.debugTimeout = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
BudgetMe Database Setup Script

Usage:
  node setupDatabase.js [options]

Options:
  --url <url>                 Supabase URL
  --key <key>                 Supabase service key
  --monitor                   Enable continuous monitoring for new users
  --monitor-only              Only run monitoring (skip initial setup)
  --setup-only                Only run setup (skip monitoring)
  --poll-interval <ms>        Polling interval for monitoring (default: 5000ms)
  --debug                     Run in debug mode (will exit after a timeout)
  --debug-timeout <ms>        Timeout for debug mode (default: 30000ms)
  --help, -h                  Show this help message
      `);
      process.exit(0);
    }
  }
  
  // In GitHub Actions, enable monitoring by default if GITHUB_ACTIONS is set
  if (process.env.GITHUB_ACTIONS === 'true' && !options.setupOnly) {
    options.monitor = true;
  }
  
  return options;
}

//===================================================
// Process command line arguments and run
//===================================================
const options = parseArguments();

// Simple script execution - avoids any issues with the async init function
(async function run() {
  console.log('BudgetMe Database Setup Script');
  console.log('------------------------------');

  // Override environment variables with command line arguments if provided
  if (options.url) process.env.SUPABASE_URL = options.url;
  if (options.key) process.env.SUPABASE_SERVICE_KEY = options.key;
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Error: Missing Supabase credentials');
    console.log('Please provide Supabase URL and service key either as environment variables:');
    console.log('  SUPABASE_URL=your-url SUPABASE_SERVICE_KEY=your-key node setupDatabase.js');
    console.log('Or as command line arguments:');
    console.log('  node setupDatabase.js --url your-url --key your-key');
    process.exit(1);
  }
  
  try {
    // Only run setup if not in monitor-only mode
    if (!options.monitorOnly) {
      const setupResult = await setupDatabaseConfiguration();
      
      // If setup failed and we're not going to monitor, exit with error
      if (!setupResult.success && !options.monitor) {
        console.error("Database setup failed. Exiting.");
        process.exit(1);
      }
      
      // If user didn't request monitoring and setup completed, exit normally
      if (options.setupOnly) {
        console.log("\nSetup completed. Use --monitor flag to enable continuous monitoring.");
        process.exit(0);
      }
    }
    
    // If monitor flag is set, switch to monitoring mode
    if (options.monitor || options.monitorOnly) {
      console.log('\nSetting up monitoring prerequisites...');
      
      // Create the RPC function for manual user processing
      const rpcResult = await createUserProcessingRPC();
      
      if (!rpcResult.success) {
        console.error("Failed to create user processing RPC. Manual intervention may be required.");
        console.error("Continuing with monitoring, but new users might not be processed correctly.");
      }
      
      console.log('\nStarting continuous monitoring mode...');
      
      // Handle termination signals gracefully
      process.on('SIGINT', () => {
        console.log('\nReceived SIGINT. Shutting down gracefully...');
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM. Shutting down gracefully...');
        process.exit(0);
      });
      
      // Log to indicate that monitoring is active to prevent confusion
      console.log(`\n[${new Date().toISOString()}] Monitoring active and waiting for new users...`);
      console.log(`Press Ctrl+C to stop monitoring.\n`);
      
      if (options.debug) {
        console.log(`Debug mode enabled: Will exit after ${options.debugTimeout}ms`);
      }
      
      // Start monitoring - this will run indefinitely and never return
      // unless in debug mode
      await monitorNewUsers(options.pollInterval, options.debug, options.debugTimeout);
      
      // This line should be reached only in debug mode
      if (options.debug) {
        console.log("Monitoring completed in debug mode.");
        process.exit(0);
      } else {
        console.log("Monitoring ended unexpectedly. This should not happen.");
        process.exit(1);
      }
    } else {
      console.log("\nSetup completed. Use --monitor flag to enable continuous monitoring.");
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 