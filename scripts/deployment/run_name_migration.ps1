# PowerShell script to run the name diversity migration
Write-Host "Sales Training AI - Name Diversity Migration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Run the migration script directly
Write-Host "Running name diversity migration..." -ForegroundColor Yellow
python migrations/create_name_usage_tracker.py

Write-Host ""
Write-Host "Migration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 