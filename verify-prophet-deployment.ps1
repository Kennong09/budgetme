# Prophet Deployment Verification Script
# Run this to verify your EC2 Prophet API is working correctly

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl
)

Write-Host "🔍 Verifying Prophet Deployment at: $ApiUrl" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$ApiUrl/health" -Method GET -ErrorAction Stop
    
    Write-Host "✓ API is responding" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor White
    
    if ($health.prophet_available -eq $true) {
        Write-Host "✓ Prophet Model: AVAILABLE (REAL ML MODEL)" -ForegroundColor Green
        Write-Host "  🎉 SUCCESS! You're using the real Facebook Prophet model!" -ForegroundColor Green
    } else {
        Write-Host "✗ Prophet Model: NOT AVAILABLE (Still using mock)" -ForegroundColor Red
        Write-Host "  ⚠️  Prophet is not loaded. Check server logs." -ForegroundColor Yellow
    }
    
    if ($health.database_connected -eq $true) {
        Write-Host "✓ Database: Connected" -ForegroundColor Green
    } else {
        Write-Host "✗ Database: Not connected" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Full Response:" -ForegroundColor Gray
    $health | ConvertTo-Json -Depth 5
    
} catch {
    Write-Host "✗ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Make sure your EC2 instance is running and accessible" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan

# Test 2: API Documentation
Write-Host "Test 2: API Documentation..." -ForegroundColor Yellow
try {
    $docs = Invoke-WebRequest -Uri "$ApiUrl/docs" -Method GET -ErrorAction Stop
    if ($docs.StatusCode -eq 200) {
        Write-Host "✓ API Docs available at: $ApiUrl/docs" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ API Docs not accessible" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "📊 Deployment Summary:" -ForegroundColor Cyan
Write-Host "  API Endpoint: $ApiUrl" -ForegroundColor White
Write-Host ""

if ($health.prophet_available -eq $true) {
    Write-Host "✅ VERIFIED: Real Prophet Model is deployed and working!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Update your frontend .env file:" -ForegroundColor White
    Write-Host "     REACT_APP_PREDICTION_API_URL=$ApiUrl" -ForegroundColor Gray
    Write-Host "  2. Rebuild frontend: npm run build" -ForegroundColor White
    Write-Host "  3. Redeploy to production" -ForegroundColor White
} else {
    Write-Host "⚠️  WARNING: Prophet model not available" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Cyan
    Write-Host "  1. SSH into EC2: ssh -i your-key.pem ubuntu@YOUR-EC2-IP" -ForegroundColor White
    Write-Host "  2. Check service: sudo systemctl status budgetme-prophet" -ForegroundColor White
    Write-Host "  3. Check logs: sudo journalctl -u budgetme-prophet -n 50" -ForegroundColor White
    Write-Host "  4. Verify Prophet: cd /home/budgetme/prediction_api && sudo -u budgetme ./venv/bin/python -c 'import prophet; print(\"OK\")'" -ForegroundColor White
}

Write-Host ""
