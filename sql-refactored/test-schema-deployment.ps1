# =====================================================
# SQL Schema Deployment Test Script (PowerShell)
# =====================================================
# Purpose: Test the sequential execution of reordered SQL schema files
# Usage: .\test-schema-deployment.ps1 [DatabaseConnectionString]
# =====================================================

param(
    [string]$DatabaseConnection = "postgresql://postgres:password@localhost:5432/budgetme_test"
)

Write-Host "=== SQL Schema Deployment Test ===" -ForegroundColor Cyan
Write-Host "Testing sequential execution of reordered schema files" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Cyan

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $ScriptDir "deployment-test.log"
$ErrorLog = Join-Path $ScriptDir "deployment-errors.log"

# Create log files
"=== Schema Deployment Test Started: $(Get-Date) ===" | Out-File -FilePath $LogFile -Encoding UTF8
"=== Schema Deployment Errors: $(Get-Date) ===" | Out-File -FilePath $ErrorLog -Encoding UTF8

# Function to log messages
function Log-Message {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp - $Message"
    Write-Host $logEntry -ForegroundColor Green
    $logEntry | Out-File -FilePath $LogFile -Append -Encoding UTF8
}

function Log-Error {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp - ERROR: $Message"
    Write-Host $logEntry -ForegroundColor Red
    $logEntry | Out-File -FilePath $ErrorLog -Append -Encoding UTF8
}

# Function to execute SQL file
function Execute-SqlFile {
    param([string]$FileName)
    
    $FilePath = Join-Path $ScriptDir $FileName
    
    if (-not (Test-Path $FilePath)) {
        Log-Error "File not found: $FilePath"
        return $false
    }
    
    Log-Message "Executing: $FileName"
    
    try {
        # Use psql to execute the file
        $process = Start-Process -FilePath "psql" -ArgumentList @(
            $DatabaseConnection,
            "-f", $FilePath,
            "-v", "ON_ERROR_STOP=1"
        ) -Wait -PassThru -RedirectStandardOutput "$LogFile" -RedirectStandardError "$ErrorLog" -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Log-Message "SUCCESS: $FileName completed"
            return $true
        } else {
            Log-Error "FAILED: $FileName execution failed (Exit Code: $($process.ExitCode))"
            return $false
        }
    }
    catch {
        Log-Error "FAILED: $FileName execution failed - $_"
        return $false
    }
}

# Test database connection
Log-Message "Testing database connection..."
try {
    $testProcess = Start-Process -FilePath "psql" -ArgumentList @(
        $DatabaseConnection,
        "-c", "SELECT 1;"
    ) -Wait -PassThru -WindowStyle Hidden
    
    if ($testProcess.ExitCode -ne 0) {
        Log-Error "Cannot connect to database: $DatabaseConnection"
        Write-Host "Please ensure PostgreSQL is running and the connection string is correct." -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Log-Error "Database connection failed: $_"
    exit 1
}

Log-Message "Database connection successful"

# Create a clean test database schema
Log-Message "Creating clean test environment..."
try {
    Start-Process -FilePath "psql" -ArgumentList @(
        $DatabaseConnection,
        "-c", "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
    ) -Wait -WindowStyle Hidden | Out-Null
}
catch {
    Log-Error "Failed to create clean environment: $_"
}

# Execute schema files in the correct order
$SchemaFiles = @(
    "01-auth-schema.sql",
    "02-shared-schema.sql",
    "03-family-schema.sql",
    "04-transactions-schema.sql",
    "05-goals-schema.sql",
    "06-budget-schema.sql",
    "07-admin-schema.sql",
    "08-chatbot-schema.sql",
    "09-dashboard-schema.sql",
    "10-predictions-schema.sql",
    "11-reports-schema.sql",
    "12-settings-schema.sql"
)

$SuccessCount = 0
$TotalFiles = $SchemaFiles.Count

Log-Message "Starting sequential execution of $TotalFiles schema files..."

foreach ($File in $SchemaFiles) {
    if (Execute-SqlFile $File) {
        $SuccessCount++
    } else {
        Log-Error "Deployment failed at: $File"
        Write-Host "Deployment failed. Check $ErrorLog for details." -ForegroundColor Red
        exit 1
    }
}

# Run validation checks
Log-Message "Running validation checks..."
if (Execute-SqlFile "validate-schema-deployment.sql") {
    Log-Message "Validation checks passed"
} else {
    Log-Error "Validation checks failed"
    exit 1
}

# Summary
Log-Message "=== Deployment Summary ==="
Log-Message "Total files: $TotalFiles"
Log-Message "Successful: $SuccessCount"
Log-Message "Failed: $($TotalFiles - $SuccessCount)"

if ($SuccessCount -eq $TotalFiles) {
    Log-Message "🎉 ALL SCHEMA FILES DEPLOYED SUCCESSFULLY!"
    Log-Message "✅ All foreign key constraints resolved"
    Log-Message "✅ No dependency issues found"
    Log-Message "✅ Database ready for application use"
    Write-Host ""
    Write-Host "✅ SUCCESS: All schema files deployed successfully!" -ForegroundColor Green
    Write-Host "📋 Check $LogFile for detailed execution log" -ForegroundColor Cyan
    exit 0
} else {
    Log-Error "❌ DEPLOYMENT FAILED"
    Write-Host "❌ FAILED: Schema deployment incomplete" -ForegroundColor Red
    Write-Host "📋 Check $ErrorLog for error details" -ForegroundColor Yellow
    exit 1
}