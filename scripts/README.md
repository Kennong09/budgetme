# Migration Scripts

## Default Configuration Migration

The `migrateDefaultConfigurations.ts` script migrates existing users to use the new DefaultConfigurationService instead of SQL-based default creation.

### Prerequisites

1. Ensure all environment variables are set in `.env`:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_SUPABASE_SERVICE_KEY` (optional, for admin operations)

2. Install ts-node if not already installed:
   ```bash
   npm install -g ts-node
   ```

### Usage

Run the migration script with ts-node:

```bash
# Dry run to see what would be migrated
npx ts-node scripts/migrateDefaultConfigurations.ts --dry-run --verbose

# Live migration of all users
npx ts-node scripts/migrateDefaultConfigurations.ts

# Migrate specific user
npx ts-node scripts/migrateDefaultConfigurations.ts --user-id=UUID_HERE

# Custom batch size with verbose logging
npx ts-node scripts/migrateDefaultConfigurations.ts --batch-size=10 --verbose
```

### Options

- `--dry-run`: Show what would be migrated without making changes
- `--user-id=UUID`: Migrate specific user by ID
- `--batch-size=N`: Number of users to process in each batch (default: 50)
- `--verbose`: Show detailed logging

### What the script does

1. **Discovers users**: Finds users by looking at existing accounts and categories tables
2. **Validates defaults**: Checks if each user already has complete default configurations
3. **Migrates users**: For users missing defaults, creates:
   - Default accounts (checking, savings, credit card)
   - Default income categories (salary, freelance, investments, etc.)
   - Default expense categories (housing, utilities, groceries, etc.)
4. **Reports progress**: Shows migration statistics and any errors

### Error Handling

The script includes comprehensive error handling:
- Database connection validation
- Transaction rollback on failures
- Graceful shutdown on SIGINT/SIGTERM
- Detailed error logging and statistics

### Safety Features

- **Dry run mode**: Test migrations without making changes
- **Batch processing**: Processes users in configurable batches
- **Rate limiting**: Includes delays to avoid overwhelming the database
- **Idempotent**: Safe to run multiple times - skips users who already have defaults
- **Detailed logging**: Comprehensive progress and error reporting

### Example Output

```
[2025-09-21T08:00:00.000Z] Starting Default Configuration Migration
[2025-09-21T08:00:00.000Z] Mode: LIVE MIGRATION
[2025-09-21T08:00:00.000Z] Batch size: 50
[2025-09-21T08:00:00.000Z] Verbose logging: ON
[2025-09-21T08:00:00.000Z] Target: All users

[2025-09-21T08:00:01.000Z] ✅ Prerequisites validated successfully
[2025-09-21T08:00:01.000Z] Found 25 users to check for migration

Processing batch 1/1 (users 1-25)
[2025-09-21T08:00:02.000Z] Processing batch of 25 users...
[2025-09-21T08:00:03.000Z] ✅ Successfully migrated user abc-123-def
   - Accounts created: 3
   - Income categories created: 5
   - Expense categories created: 12

============================================================
MIGRATION SUMMARY
============================================================
Mode: LIVE MIGRATION
Duration: 5s
Total users in system: 25
Users processed: 20
Users skipped (already had defaults): 5
Users with errors: 0

Defaults created:
  - Accounts: 60
  - Income categories: 100
  - Expense categories: 240
============================================================
```