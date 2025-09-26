#!/bin/bash

# =====================================================
# SQL Schema Deployment Test Script
# =====================================================
# Purpose: Test the sequential execution of reordered SQL schema files
# Usage: ./test-schema-deployment.sh [database_connection_string]
# =====================================================

echo "=== SQL Schema Deployment Test ==="
echo "Testing sequential execution of reordered schema files"
echo "======================================================="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/deployment-test.log"
ERROR_LOG="$SCRIPT_DIR/deployment-errors.log"

# Database connection (default for local testing)
DB_CONNECTION=${1:-"postgresql://postgres:password@localhost:5432/budgetme_test"}

# Create log files
echo "=== Schema Deployment Test Started: $(date) ===" > "$LOG_FILE"
echo "=== Schema Deployment Errors: $(date) ===" > "$ERROR_LOG"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1" | tee -a "$ERROR_LOG"
}

# Function to execute SQL file
execute_sql_file() {
    local file_name="$1"
    local file_path="$SCRIPT_DIR/$file_name"
    
    if [[ ! -f "$file_path" ]]; then
        log_error "File not found: $file_path"
        return 1
    fi
    
    log_message "Executing: $file_name"
    
    if psql "$DB_CONNECTION" -f "$file_path" -v ON_ERROR_STOP=1 >> "$LOG_FILE" 2>> "$ERROR_LOG"; then
        log_message "SUCCESS: $file_name completed"
        return 0
    else
        log_error "FAILED: $file_name execution failed"
        return 1
    fi
}

# Test database connection
log_message "Testing database connection..."
if ! psql "$DB_CONNECTION" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "Cannot connect to database: $DB_CONNECTION"
    echo "Please ensure PostgreSQL is running and the connection string is correct."
    exit 1
fi

log_message "Database connection successful"

# Create a clean test database schema
log_message "Creating clean test environment..."
psql "$DB_CONNECTION" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" >> "$LOG_FILE" 2>> "$ERROR_LOG"

# Execute schema files in the correct order
schema_files=(
    "01-auth-schema.sql"
    "02-shared-schema.sql"
    "03-family-schema.sql"
    "04-transactions-schema.sql"
    "05-goals-schema.sql"
    "06-budget-schema.sql"
    "07-admin-schema.sql"
    "08-chatbot-schema.sql"
    "09-dashboard-schema.sql"
    "10-predictions-schema.sql"
    "11-reports-schema.sql"
    "12-settings-schema.sql"
)

success_count=0
total_files=${#schema_files[@]}

log_message "Starting sequential execution of $total_files schema files..."

for file in "${schema_files[@]}"; do
    if execute_sql_file "$file"; then
        ((success_count++))
    else
        log_error "Deployment failed at: $file"
        echo "Deployment failed. Check $ERROR_LOG for details."
        exit 1
    fi
done

# Run validation checks
log_message "Running validation checks..."
if execute_sql_file "validate-schema-deployment.sql"; then
    log_message "Validation checks passed"
else
    log_error "Validation checks failed"
    exit 1
fi

# Summary
log_message "=== Deployment Summary ==="
log_message "Total files: $total_files"
log_message "Successful: $success_count"
log_message "Failed: $((total_files - success_count))"

if [[ $success_count -eq $total_files ]]; then
    log_message "🎉 ALL SCHEMA FILES DEPLOYED SUCCESSFULLY!"
    log_message "✅ All foreign key constraints resolved"
    log_message "✅ No dependency issues found"
    log_message "✅ Database ready for application use"
    echo ""
    echo "✅ SUCCESS: All schema files deployed successfully!"
    echo "📋 Check $LOG_FILE for detailed execution log"
    exit 0
else
    log_error "❌ DEPLOYMENT FAILED"
    echo "❌ FAILED: Schema deployment incomplete"
    echo "📋 Check $ERROR_LOG for error details"
    exit 1
fi