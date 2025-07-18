/**
 * This script sets up the admin role in Supabase.
 * Run this script with your Supabase service role key.
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and SERVICE_ROLE key from environment variables
// NOTE: NEVER use the service role key in client-side code
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    debug: false
  }
});

async function setupAdminRole() {
  try {
    console.log('Setting up admin role in Supabase...');

    // 1. Check if the admin_users table exists, if not create it
    console.log('Ensuring admin_users table exists...');
    try {
      await supabaseAdmin.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY REFERENCES auth.users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('Admin users table checked/created');
    } catch (error) {
      console.error('Error creating admin_users table:', error);
      return false;
    }

    // 2. Create or update RLS policies
    console.log('Setting up row-level security policies...');
    const policyQueries = [
      // Allow admins to read any user's data
      `
      CREATE POLICY IF NOT EXISTS "Allow admins to read all users" ON "public"."profiles"
      FOR SELECT 
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM admin_users)
      );
      `,
      
      // Allow admins to read any budget
      `
      CREATE POLICY IF NOT EXISTS "Allow admins to read all budgets" ON "public"."budgets"
      FOR SELECT 
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM admin_users)
      );
      `,
      
      // Allow admins to read any transaction
      `
      CREATE POLICY IF NOT EXISTS "Allow admins to read all transactions" ON "public"."transactions"
      FOR SELECT 
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM admin_users)
      );
      `,
      
      // Allow admins to read any goal
      `
      CREATE POLICY IF NOT EXISTS "Allow admins to read all goals" ON "public"."goals"
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

    // 3. Create functions to manage admin users
    console.log('Creating admin management functions...');
    
    const functions = [
      // Function to add a user as admin
      `
      CREATE OR REPLACE FUNCTION add_admin_user(user_id UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        user_exists BOOLEAN;
      BEGIN
        -- Check if the user exists in auth.users
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
        
        IF NOT user_exists THEN
          RAISE EXCEPTION 'User with ID % does not exist', user_id;
        END IF;
        
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
      `,
      
      // Function to list all admin users
      `
      CREATE OR REPLACE FUNCTION list_admin_users()
      RETURNS TABLE (
        id UUID,
        email TEXT,
        created_at TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          a.id, 
          u.email,
          a.created_at
        FROM 
          admin_users a
        JOIN 
          auth.users u ON a.id = u.id
        ORDER BY 
          a.created_at DESC;
      END;
      $$;
      `
    ];

    // Execute each function creation
    for (const func of functions) {
      try {
        await supabaseAdmin.query(func);
        console.log('Function created successfully');
      } catch (err) {
        console.error(`Error creating function: ${err.message}`);
      }
    }

    console.log('Admin role setup completed successfully!');
    return true;
  } catch (error) {
    console.error('Error setting up admin role:', error);
    return false;
  }
}

// Set a specific user as admin
async function setUserAsAdmin(userId) {
  try {
    // Verify user exists before adding as admin
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      console.error(`Error: User with ID ${userId} not found`);
      return false;
    }
    
    console.log(`Setting user ${user.user.email} (${userId}) as admin...`);
    
    const { data, error } = await supabaseAdmin.rpc('add_admin_user', {
      user_id: userId
    });
    
    if (error) {
      throw error;
    }
    
    console.log(`User ${user.user.email} set as admin successfully!`);
    return true;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    return false;
  }
}

// List all current admin users
async function listAdminUsers() {
  try {
    console.log('Listing all admin users:');
    
    const { data, error } = await supabaseAdmin.rpc('list_admin_users');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('\nCurrent Administrators:');
      console.log('--------------------------------------------------');
      console.log('| ID                                   | Email                 | Added Date          |');
      console.log('--------------------------------------------------');
      data.forEach(admin => {
        const id = admin.id.substring(0, 8) + '...';
        const email = admin.email.substring(0, 20).padEnd(20);
        const date = new Date(admin.created_at).toLocaleDateString();
        console.log(`| ${id} | ${email} | ${date} |`);
      });
      console.log('--------------------------------------------------');
      console.log(`Total admins: ${data.length}`);
    } else {
      console.log('No admin users found');
    }
    
    return data || [];
  } catch (error) {
    console.error('Error listing admin users:', error);
    return [];
  }
}

// Process command line arguments
const args = process.argv.slice(2);

async function run() {
  // Setup admin roles and functions
  const setupSuccess = await setupAdminRole();
  if (!setupSuccess) {
    console.error('Failed to set up admin role. Exiting.');
    process.exit(1);
  }
  
  // Check for command line arguments
  if (args.length > 0) {
    const command = args[0];
    
    if (command === 'add' && args[1]) {
      // Add user as admin
      const userId = args[1];
      await setUserAsAdmin(userId);
    } else if (command === 'list') {
      // List all admin users
      await listAdminUsers();
    } else {
      console.log('Unknown command. Available commands:');
      console.log('  node setupAdminRole.js add <user-id>  - Add a user as admin');
      console.log('  node setupAdminRole.js list           - List all admin users');
    }
  } else {
    // Just set up the role structure
    console.log('Admin role structure setup complete.');
    console.log('To add an admin user, run: node setupAdminRole.js add <user-id>');
    console.log('To list admin users, run: node setupAdminRole.js list');
  }
}

// Run the script
module.exports = {
  setupAdminRole,
  setUserAsAdmin,
  listAdminUsers,
  run
};

// If script is run directly (not imported)
if (require.main === module) {
  run();
} 