#!/usr/bin/env pwsh

# PowerShell script to test schema deployment fix
# Tests the resolution of circular dependency between transactions and goals schemas

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Schema Deployment Dependency Fix Test" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (!(Test-Path "01-auth-schema.sql")) {
    Write-Host "ERROR: Not in sql-refactored directory. Please navigate to sql-refactored folder." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Checking file structure..." -ForegroundColor Yellow
$requiredFiles = @(
    "01-auth-schema.sql",
    "02-shared-schema.sql", 
    "03-family-schema.sql",
    "04-transactions-schema.sql",
    "05-goals-schema.sql",
    "06-post-constraints.sql"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file missing" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 2: Analyzing transactions schema for circular dependency..." -ForegroundColor Yellow

# Check if transactions schema has direct goal foreign key reference
$transactionsContent = Get-Content "04-transactions-schema.sql" -Raw
if ($transactionsContent -match "REFERENCES public\.goals\(id\)") {
    Write-Host "  ✗ ISSUE: Direct foreign key reference to goals table found" -ForegroundColor Red
    Write-Host "    This will cause circular dependency during deployment" -ForegroundColor Red
} else {
    Write-Host "  ✓ Good: No direct foreign key reference to goals table" -ForegroundColor Green
}

# Check if goal_id column exists without constraint
if ($transactionsContent -match "goal_id UUID,") {
    Write-Host "  ✓ Good: goal_id column exists without constraint" -ForegroundColor Green
} elseif ($transactionsContent -match "goal_id UUID") {
    Write-Host "  ✓ Good: goal_id column exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ ISSUE: goal_id column not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 3: Analyzing post-constraints script..." -ForegroundColor Yellow

$postConstraintsContent = Get-Content "06-post-constraints.sql" -Raw
if ($postConstraintsContent -match "ALTER TABLE public\.transactions") {
    Write-Host "  ✓ Good: ALTER TABLE statement found" -ForegroundColor Green
} else {
    Write-Host "  ✗ ISSUE: ALTER TABLE statement not found" -ForegroundColor Red
}

if ($postConstraintsContent -match "fk_transactions_goal_id") {
    Write-Host "  ✓ Good: Foreign key constraint name found" -ForegroundColor Green
} else {
    Write-Host "  ✗ ISSUE: Foreign key constraint name not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 4: Checking deployment script order..." -ForegroundColor Yellow

$deployContent = Get-Content "deploy-all-schemas.sql" -Raw
if ($deployContent -match "06-post-constraints\.sql") {
    Write-Host "  ✓ Good: Post-constraints script included in deployment" -ForegroundColor Green
} else {
    Write-Host "  ✗ ISSUE: Post-constraints script not in deployment" -ForegroundColor Red
}

# Check order: transactions -> goals -> post-constraints
if ($deployContent -match "04-transactions-schema\.sql[\s\S]*?05-goals-schema\.sql[\s\S]*?06-post-constraints\.sql") {
    Write-Host "  ✓ Good: Correct deployment order maintained" -ForegroundColor Green
} else {
    Write-Host "  ✗ ISSUE: Incorrect deployment order" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 5: Schema dependency analysis summary..." -ForegroundColor Yellow

Write-Host "  Current deployment flow:" -ForegroundColor Cyan
Write-Host "    1. 01-auth-schema.sql (creates auth.users)" -ForegroundColor Gray
Write-Host "    2. 02-shared-schema.sql (creates utility functions)" -ForegroundColor Gray  
Write-Host "    3. 03-family-schema.sql (creates families table)" -ForegroundColor Gray
Write-Host "    4. 04-transactions-schema.sql (creates transactions with goal_id column)" -ForegroundColor Gray
Write-Host "    5. 05-goals-schema.sql (creates goals table)" -ForegroundColor Gray
Write-Host "    6. 06-post-constraints.sql (adds FK constraint transactions.goal_id -> goals.id)" -ForegroundColor Gray

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

$issuesFound = 0

# Count issues by checking outputs above
if ($transactionsContent -match "REFERENCES public\.goals\(id\)") { $issuesFound++ }
if (!($transactionsContent -match "goal_id UUID")) { $issuesFound++ }
if (!($postConstraintsContent -match "ALTER TABLE public\.transactions")) { $issuesFound++ }
if (!($postConstraintsContent -match "fk_transactions_goal_id")) { $issuesFound++ }
if (!($deployContent -match "06-post-constraints\.sql")) { $issuesFound++ }
if (!($deployContent -match "04-transactions-schema\.sql[\s\S]*?05-goals-schema\.sql[\s\S]*?06-post-constraints\.sql")) { $issuesFound++ }

if ($issuesFound -eq 0) {
    Write-Host "✓ SUCCESS: All dependency issues resolved!" -ForegroundColor Green
    Write-Host "  - Circular dependency eliminated" -ForegroundColor Green
    Write-Host "  - Schema deployment order correct" -ForegroundColor Green
    Write-Host "  - Post-constraints script properly configured" -ForegroundColor Green
    Write-Host "  - Ready for deployment" -ForegroundColor Green
} else {
    Write-Host "✗ ISSUES FOUND: $issuesFound problems detected" -ForegroundColor Red
    Write-Host "  Please review the output above and fix identified issues" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy schemas using: psql -f deploy-all-schemas.sql" -ForegroundColor White
Write-Host "  2. Or test with: psql -f test-deployment-fix.sql" -ForegroundColor White
Write-Host "  3. Verify constraints: psql -f validate-schema-deployment.sql" -ForegroundColor White

Write-Host ""