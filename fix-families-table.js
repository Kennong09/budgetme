#!/usr/bin/env node

/**
 * Script to fix the families table schema by adding missing columns
 * Run with: node fix-families-table.js
 */

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
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    debug: false
  }
});

/**
 * Execute a raw SQL query using the supabase-js client
 * @param {string} sql - SQL query to execute
 * @returns {Promise} Query result
 */
async function executeRawSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the RPC doesn't exist or fails, suggest manual intervention
      console.error('Error executing SQL:', error.message);
      console.log('\nManual SQL execution required. Run the following in your database:');
      console.log('\n----------------------------------------');
      console.log(sql);
      console.log('----------------------------------------\n');
      return { manual_intervention_required: true, sql };
    }
    
    return data;
  } catch (error) {
    console.error('Error in executeRawSQL:', error.message);
    console.log('\nManual SQL execution required. Run the following in your database:');
    console.log('\n----------------------------------------');
    console.log(sql);
    console.log('----------------------------------------\n');
    return { manual_intervention_required: true, sql };
  }
}

/**
 * Add missing columns to the families table
 */
async function fixFamiliesTable() {
  try {
    console.log('Checking families table schema...');
    
    // First check if the columns exist in the families table
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'families');
    
    if (columnsError) {
      console.error('Error checking table schema:', columnsError.message);
      // Try direct SQL approach instead
      await addMissingColumns();
      return;
    }
    
    const columnNames = columns.map(col => col.column_name);
    const missingColumns = [];
    
    if (!columnNames.includes('is_public')) {
      missingColumns.push('is_public');
    }
    
    if (!columnNames.includes('status')) {
      missingColumns.push('status');
    }
    
    if (missingColumns.length === 0) {
      console.log('✓ All required columns already exist in families table.');
      return { success: true };
    }
    
    console.log(`Missing columns found: ${missingColumns.join(', ')}`);
    await addMissingColumns();
    
    return { success: true };
  } catch (error) {
    console.error('Error fixing families table:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Add the missing columns to the families table
 */
async function addMissingColumns() {
  // SQL to add missing columns
  const sql = `
    -- Add is_public column to families table if it doesn't exist
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='families' AND column_name='is_public') THEN
        ALTER TABLE families
        ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added is_public column to families table';
      ELSE
        RAISE NOTICE 'is_public column already exists in families table';
      END IF;
    END $$;

    -- Add status column to families table if it doesn't exist
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='families' AND column_name='status') THEN
        ALTER TABLE families
        ADD COLUMN status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
        
        RAISE NOTICE 'Added status column to families table';
      ELSE
        RAISE NOTICE 'status column already exists in families table';
      END IF;
    END $$;

    -- Update existing families to default values
    UPDATE families
    SET is_public = FALSE, status = 'active'
    WHERE is_public IS NULL OR status IS NULL;
  `;
  
  console.log('Adding missing columns to families table...');
  const result = await executeRawSQL(sql);
  
  if (result && result.manual_intervention_required) {
    console.log('Please run the SQL manually to add the missing columns.');
  } else {
    console.log('✓ Successfully added missing columns to families table.');
  }
}

// Run the script
(async function run() {
  console.log('Starting families table fix script...');
  
  try {
    const result = await fixFamiliesTable();
    if (result && result.success) {
      console.log('Families table fix completed successfully.');
    } else {
      console.error('Failed to fix families table:', result?.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error running families table fix script:', error.message);
  }
  
  console.log('Script execution completed.');
})(); 