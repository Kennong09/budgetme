#!/usr/bin/env node

/**
 * Migration Script for Default Configuration Service
 * 
 * This script migrates existing users to use the new DefaultConfigurationService
 * instead of SQL-based default creation.
 * 
 * Usage:
 *   npx ts-node scripts/migrateDefaultConfigurations.ts [options]
 * 
 * Options:
 *   --dry-run     : Show what would be migrated without making changes
 *   --user-id     : Migrate specific user by ID
 *   --batch-size  : Number of users to process in each batch (default: 50)
 *   --verbose     : Show detailed logging
 */

import { DefaultConfigurationService } from '../src/services/database/defaultConfigurationService';
import { supabase } from '../src/utils/supabaseClient';

// Load environment variables if available
try {
  require('dotenv').config();
} catch (err) {
  // dotenv not installed, continue without it
  console.log('Note: dotenv not available, using default environment variables');
}

// Set environment variables for the services to work
// Use the same defaults as setupDatabase.js
if (!process.env.REACT_APP_SUPABASE_URL) {
  process.env.REACT_APP_SUPABASE_URL = process.env.SUPABASE_URL || 'https://ryoujebxyvvazvtxjhlf.supabase.co';
}
if (!process.env.REACT_APP_SUPABASE_ANON_KEY) {
  // Use service key as anon key for script purposes (has more permissions)
  process.env.REACT_APP_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI3NDkzNiwiZXhwIjoyMDY0ODUwOTM2fQ.q4BiRHda6IsomEWMqc0O_MPy6LRBkoyLr3Ip0BBETu8';
}
if (!process.env.REACT_APP_SUPABASE_SERVICE_KEY) {
  process.env.REACT_APP_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI3NDkzNiwiZXhwIjoyMDY0ODUwOTM2fQ.q4BiRHda6IsomEWMqc0O_MPy6LRBkoyLr3Ip0BBETu8';
}

// Configuration
const BATCH_SIZE = 50;
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_USER = process.argv.find(arg => arg.startsWith('--user-id='))?.split('=')[1];
const BATCH_SIZE_ARG = process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1];
const batchSize = BATCH_SIZE_ARG ? parseInt(BATCH_SIZE_ARG) : BATCH_SIZE;

// Logging utilities
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const logVerbose = (message: string) => {
  if (VERBOSE) {
    console.log(`[${new Date().toISOString()}] VERBOSE: ${message}`);
  }
};

const logError = (message: string) => {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
};

// Statistics tracking
interface MigrationStats {
  totalUsers: number;
  usersProcessed: number;
  usersSkipped: number;
  usersWithErrors: number;
  accountsCreated: number;
  incomeCategoriesCreated: number;
  expenseCategoriesCreated: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

const stats: MigrationStats = {
  totalUsers: 0,
  usersProcessed: 0,
  usersSkipped: 0,  
  usersWithErrors: 0,
  accountsCreated: 0,
  incomeCategoriesCreated: 0,
  expenseCategoriesCreated: 0,
  startTime: new Date(),
  errors: []
};

/**
 * Get all users who need migration
 */
async function getUsersForMigration(): Promise<string[]> {
  try {
    if (SPECIFIC_USER) {
      logVerbose(`Migrating specific user: ${SPECIFIC_USER}`);
      return [SPECIFIC_USER];
    }

    // Get all users from the users table (not auth.users directly)
    // Since we can't access auth.users directly, we'll query for users who have accounts
    // This assumes users have accounts or other data that indicates they exist
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('user_id')
      .order('created_at', { ascending: true });
    
    if (accountsError) {
      // If accounts query fails, try categories instead
      const { data: categories, error: categoriesError } = await supabase
        .from('income_categories')
        .select('user_id')
        .order('created_at', { ascending: true });
        
      if (categoriesError) {
        throw new Error(`Failed to fetch users: ${categoriesError.message}`);
      }
      
      const userIds = Array.from(new Set(categories?.map(cat => cat.user_id) || []));
      logVerbose(`Found ${userIds.length} total users in system (via categories)`);
      return userIds;
    }

    const userIds = Array.from(new Set(accounts?.map(account => account.user_id) || []));
    logVerbose(`Found ${userIds.length} total users in system (via accounts)`);
    
    return userIds;
  } catch (error) {
    logError(`Error fetching users: ${error}`);
    return [];
  }
}

/**
 * Check if user needs migration
 */
async function checkUserNeedsMigration(userId: string): Promise<boolean> {
  try {
    const validation = await DefaultConfigurationService.validateUserHasDefaults(userId);
    const needsMigration = validation.missing_defaults.length > 0;
    
    if (needsMigration) {
      logVerbose(`User ${userId} needs migration: missing ${validation.missing_defaults.join(', ')}`);
    } else {
      logVerbose(`User ${userId} already has complete defaults`);
    }
    
    return needsMigration;
  } catch (error) {
    logError(`Error checking user ${userId}: ${error}`);
    return false;
  }
}

/**
 * Migrate a single user
 */
async function migrateUser(userId: string): Promise<boolean> {
  try {
    logVerbose(`Starting migration for user: ${userId}`);
    
    if (DRY_RUN) {
      log(`[DRY RUN] Would migrate user: ${userId}`);
      const validation = await DefaultConfigurationService.validateUserHasDefaults(userId);
      log(`[DRY RUN] Missing defaults: ${validation.missing_defaults.join(', ')}`);
      return true;
    }

    const result = await DefaultConfigurationService.migrateExistingUser(userId);
    
    if (result.success) {
      log(`✅ Successfully migrated user ${userId}`);
      log(`   - Accounts created: ${result.accounts_created}`);
      log(`   - Income categories created: ${result.income_categories_created}`);
      log(`   - Expense categories created: ${result.expense_categories_created}`);
      
      // Update stats
      stats.accountsCreated += result.accounts_created;
      stats.incomeCategoriesCreated += result.income_categories_created;
      stats.expenseCategoriesCreated += result.expense_categories_created;
      
      return true;
    } else {
      logError(`Failed to migrate user ${userId}`);
      if (result.errors) {
        result.errors.forEach(error => logError(`  - ${error}`));
        stats.errors.push(...result.errors);
      }
      return false;
    }
  } catch (error) {
    logError(`Exception migrating user ${userId}: ${error}`);
    stats.errors.push(`User ${userId}: ${error}`);
    return false;
  }
}

/**
 * Process users in batches
 */
async function processBatch(userIds: string[]): Promise<void> {
  log(`Processing batch of ${userIds.length} users...`);
  
  for (const userId of userIds) {
    try {
      // Check if user needs migration
      const needsMigration = await checkUserNeedsMigration(userId);
      
      if (!needsMigration) {
        stats.usersSkipped++;
        continue;
      }

      // Migrate the user
      const success = await migrateUser(userId);
      
      if (success) {
        stats.usersProcessed++;
      } else {
        stats.usersWithErrors++;
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      logError(`Error processing user ${userId}: ${error}`);
      stats.usersWithErrors++;
      stats.errors.push(`User ${userId}: ${error}`);
    }
  }
}

/**
 * Print migration statistics
 */
function printStats() {
  stats.endTime = new Date();
  const duration = stats.endTime.getTime() - stats.startTime.getTime();
  const durationSeconds = Math.round(duration / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log(`Duration: ${durationSeconds}s`);
  console.log(`Total users in system: ${stats.totalUsers}`);
  console.log(`Users processed: ${stats.usersProcessed}`);
  console.log(`Users skipped (already had defaults): ${stats.usersSkipped}`);
  console.log(`Users with errors: ${stats.usersWithErrors}`);
  
  if (!DRY_RUN) {
    console.log(`\nDefaults created:`);
    console.log(`  - Accounts: ${stats.accountsCreated}`);
    console.log(`  - Income categories: ${stats.incomeCategoriesCreated}`);
    console.log(`  - Expense categories: ${stats.expenseCategoriesCreated}`);
  }
  
  if (stats.errors.length > 0) {
    console.log(`\nErrors encountered:`);
    stats.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('='.repeat(60));
}

/**
 * Validate prerequisites
 */
async function validatePrerequisites(): Promise<boolean> {
  try {
    // Test database connection by querying a simple table
    const { data, error } = await supabase.from('accounts').select('id').limit(1);
    if (error && !error.message.includes('no rows')) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // Test DefaultConfigurationService
    const templates = DefaultConfigurationService.getAccountTemplate();
    if (!templates || templates.length === 0) {
      throw new Error('DefaultConfigurationService templates not available');
    }
    
    log('✅ Prerequisites validated successfully');
    return true;
  } catch (error) {
    logError(`Prerequisites validation failed: ${error}`);
    return false;
  }
}

/**
 * Main migration function
 */
async function main() {
  try {
    log('Starting Default Configuration Migration');
    log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    log(`Batch size: ${batchSize}`);
    log(`Verbose logging: ${VERBOSE ? 'ON' : 'OFF'}`);
    
    if (SPECIFIC_USER) {
      log(`Target: Specific user ${SPECIFIC_USER}`);
    } else {
      log('Target: All users');
    }
    
    console.log('');
    
    // Validate prerequisites
    const validationPassed = await validatePrerequisites();
    if (!validationPassed) {
      process.exit(1);
    }
    
    // Get users for migration
    const allUserIds = await getUsersForMigration();
    stats.totalUsers = allUserIds.length;
    
    if (allUserIds.length === 0) {
      log('No users found for migration');
      return;
    }
    
    log(`Found ${allUserIds.length} users to check for migration`);
    
    // Process users in batches
    for (let i = 0; i < allUserIds.length; i += batchSize) {
      const batch = allUserIds.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allUserIds.length / batchSize);
      
      log(`\nProcessing batch ${batchNumber}/${totalBatches} (users ${i + 1}-${Math.min(i + batchSize, allUserIds.length)})`);
      
      await processBatch(batch);
      
      // Small delay between batches
      if (i + batchSize < allUserIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
  } catch (error) {
    logError(`Migration failed: ${error}`);
    process.exit(1);
  } finally {
    printStats();
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error}`);
  printStats();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at ${promise}: ${reason}`);
  printStats();
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\nReceived SIGINT, shutting down gracefully...');
  printStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\nReceived SIGTERM, shutting down gracefully...');
  printStats();
  process.exit(0);
});

// Run the migration
// Only run if called directly
if (process.argv[1] === __filename || process.argv[1].endsWith('migrateDefaultConfigurations.ts')) {
  main().catch(error => {
    logError(`Failed to run migration: ${error}`);
    process.exit(1);
  });
}

export { main as runMigration };