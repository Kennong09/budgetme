/**
 * Script to add an admin user to the admin_users table in Supabase
 * This should be run with the Supabase service role key
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
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// The user ID to make admin
const USER_ID = '952a101d-d64d-42a8-89ce-cb4061aaaf5e'; // Your user ID from admin-query.sql

async function addAdmin() {
  try {
    console.log('Adding user to admin_users table...');
    
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

    // Add user to admin_users table
    const { data, error } = await supabaseAdmin.from('admin_users').insert({
      id: USER_ID
    }).select();
    
    if (error) {
      if (error.code === '23505') { // Duplicate key error
        console.log(`User ${USER_ID} is already an admin`);
      } else {
        throw error;
      }
    } else {
      console.log(`User ${USER_ID} has been successfully made an admin!`);
    }
    
    // Also update the profiles table for consistency
    await supabaseAdmin.from('profiles')
      .update({ role: 'admin' })
      .eq('id', USER_ID);
    
    console.log('Profile table also updated with admin role');
    
    // Verify the user is now in the admin_users table
    const { data: adminCheck, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', USER_ID)
      .single();
    
    if (checkError) {
      console.error('Error verifying admin status:', checkError);
    } else {
      console.log('Verified admin status:', adminCheck ? 'SUCCESS' : 'FAILED');
    }
    
  } catch (error) {
    console.error('Error adding admin user:', error);
  }
}

// Run the script
addAdmin();