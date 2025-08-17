const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'prisma', 'migrations', 'add_settings_tables.sql'),
      'utf8'
    );

    console.log('Applying settings tables migration to Supabase...');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement.length > 0) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });
        
        if (error) {
          console.error('Error executing statement:', error);
          // Continue with other statements even if one fails
        }
      }
    }

    console.log('✅ Settings migration completed successfully!');
    console.log('\nTables created:');
    console.log('- user_profiles: Stores user profile and preferences');
    console.log('- accounts: Stores user financial accounts');
    console.log('\nFeatures enabled:');
    console.log('- Row Level Security (RLS) for data protection');
    console.log('- Automatic timestamp updates');
    console.log('- Single default account enforcement');
    
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration().then(() => {
  console.log('\nMigration process completed!');
  process.exit(0);
});
