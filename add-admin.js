/**
 * Script to add an admin user to the admin_users table in Supabase
 * This should be run with the Supabase service role key
 * Usage: node add-admin.js <user_id1> [user_id2 user_id3 ...]
 */

const { createClient } = require('@supabase/supabase-js');

// You need to set these environment variables before running the script
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

// Get user IDs from command line arguments
const userIds = process.argv.slice(2);

if (userIds.length === 0) {
  console.error('Error: At least one user ID must be provided');
  console.log('Usage: node add-admin.js <user_id1> [user_id2 user_id3 ...]');
  process.exit(1);
}

async function ensureAdminTable() {
  try {
    console.log('Ensuring admin_users table exists...');
    
    // First ensure the admin_users table exists
    try {
      await supabaseAdmin.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY REFERENCES auth.users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } catch (error) {
      console.log('Table might already exist:', error.message);
    }
    return true;
  } catch (error) {
    console.error('Error ensuring admin table exists:', error);
    return false;
  }
}

async function addAdmin(userId) {
  try {
    console.log(`Adding user ${userId} to admin_users table...`);
    
    // Add user to admin_users table
    const { data, error } = await supabaseAdmin.from('admin_users').insert({
      id: userId
    }).select();
    
    if (error) {
      if (error.code === '23505') { // Duplicate key error
        console.log(`User ${userId} is already an admin`);
        return true;
      } else {
        throw error;
      }
    } else {
      console.log(`User ${userId} has been successfully made an admin!`);
    }
    
    // Also update the profiles table for consistency
    try {
      await supabaseAdmin.from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);
      
      console.log('Profile table also updated with admin role');
    } catch (profileError) {
      console.warn('Could not update profiles table:', profileError.message);
    }
    
    // Verify the user is now in the admin_users table
    const { data: adminCheck, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (checkError) {
      console.error('Error verifying admin status:', checkError);
      return false;
    } else {
      console.log('Verified admin status:', adminCheck ? 'SUCCESS' : 'FAILED');
      return !!adminCheck;
    }
    
  } catch (error) {
    console.error(`Error adding admin user ${userId}:`, error);
    return false;
  }
}

async function run() {
  // Ensure admin table exists
  const tableExists = await ensureAdminTable();
  if (!tableExists) {
    process.exit(1);
  }
  
  // Process each user ID
  console.log(`Processing ${userIds.length} user(s)...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const userId of userIds) {
    const success = await addAdmin(userId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n--- Summary ---');
  console.log(`Total processed: ${userIds.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

// Run the script
run();