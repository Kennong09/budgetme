/**
 * This script sets up the admin role in Supabase.
 * Run this script with your Supabase service role key.
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and SERVICE_ROLE key from environment variables
// NOTE: NEVER use the service role key in client-side code
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with admin privileges
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdminRole() {
  try {
    console.log('Setting up admin role in Supabase...');

    // 1. Check if the admin_users table exists, if not create it
    const { error: tableError } = await supabaseAdmin.rpc('create_admin_tables_if_not_exist');
    
    if (tableError) {
      console.error('Error creating admin tables:', tableError);
      
      // Fallback: Try to create table directly if RPC function doesn't exist
      const { error: createTableError } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .limit(1)
        .catch(async () => {
          // Table doesn't exist, create it
          return await supabaseAdmin.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
              id UUID PRIMARY KEY REFERENCES auth.users(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);
        });

      if (createTableError) {
        console.error('Error creating admin_users table:', createTableError);
        return;
      }
    }

    // 2. Create or update RLS policies
    const policyQueries = [
      // Allow admins to read any user's data
      `
      CREATE POLICY "Allow admins to read all users" ON "public"."profiles"
      FOR SELECT 
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM admin_users)
      );
      `,
      
      // Allow admins to read any budget
      `
      CREATE POLICY "Allow admins to read all budgets" ON "public"."budgets"
      FOR SELECT 
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM admin_users)
      );
      `,
      
      // Allow admins to read any transaction
      `
      CREATE POLICY "Allow admins to read all transactions" ON "public"."transactions"
      FOR SELECT 
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM admin_users)
      );
      `,
      
      // Allow admins to read any goal
      `
      CREATE POLICY "Allow admins to read all goals" ON "public"."goals"
      FOR SELECT 
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM admin_users)
      );
      `,
    ];

    // Execute each policy (ignoring if policy already exists)
    for (const query of policyQueries) {
      try {
        await supabaseAdmin.query(query);
      } catch (err) {
        // Policy might already exist
        console.log(`Note: Policy may already exist: ${err.message}`);
      }
    }

    // 3. Create a function to add users as admins
    console.log('Creating admin management functions...');
    
    const functions = [
      // Function to add a user as admin
      `
      CREATE OR REPLACE FUNCTION add_admin_user(user_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        INSERT INTO admin_users (id)
        VALUES (user_id)
        ON CONFLICT (id) DO NOTHING;
        RETURN TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN FALSE;
      END;
      $$;
      `,
      
      // Function to remove admin role
      `
      CREATE OR REPLACE FUNCTION remove_admin_user(user_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        DELETE FROM admin_users
        WHERE id = user_id;
        RETURN TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN FALSE;
      END;
      $$;
      `,
      
      // Function to check if user is admin
      `
      CREATE OR REPLACE FUNCTION is_admin_user()
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM admin_users
          WHERE id = auth.uid()
        );
      END;
      $$;
      `
    ];

    // Execute each function creation
    for (const func of functions) {
      try {
        await supabaseAdmin.query(func);
      } catch (err) {
        console.error(`Error creating function: ${err.message}`);
      }
    }

    console.log('Admin role setup completed successfully!');
  } catch (error) {
    console.error('Error setting up admin role:', error);
  }
}

// Set a specific user as admin (replace with actual user ID)
async function setUserAsAdmin(userId) {
  try {
    const { data, error } = await supabaseAdmin.rpc('add_admin_user', {
      user_id: userId
    });
    
    if (error) throw error;
    console.log(`User ${userId} set as admin successfully!`);
    return true;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    return false;
  }
}

// Example usage
// setupAdminRole().then(() => {
//   // After setting up roles, you can set a specific user as admin
//   setUserAsAdmin('user-uuid-here');
// });

module.exports = {
  setupAdminRole,
  setUserAsAdmin
}; 