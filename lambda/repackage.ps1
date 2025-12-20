# Quick repackage script for Lambda
Write-Host "Repackaging Lambda function..." -ForegroundColor Green

# Navigate to lambda directory (if not already there)
if (-not (Test-Path "index.js")) {
    Write-Host "Please run this script from the lambda directory" -ForegroundColor Red
    exit 1
}

# Remove old zip if exists
if (Test-Path "../watermark-lambda.zip") {
    Remove-Item "../watermark-lambda.zip" -Force
    Write-Host "Removed old zip file" -ForegroundColor Yellow
}

# Create zip file
Write-Host "Creating watermark-lambda.zip..." -ForegroundColor Cyan
Compress-Archive -Path index.js,package.json,node_modules -DestinationPath ../watermark-lambda.zip -Force

$zipSize = (Get-Item ../watermark-lambda.zip).Length / 1MB
Write-Host ""
Write-Host "✓ Package created: ../watermark-lambda.zip" -ForegroundColor Green
Write-Host "  File size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to AWS Lambda Console" -ForegroundColor White
Write-Host "2. Select your 'watermark' function" -ForegroundColor White
Write-Host "3. Click 'Upload from' -> '.zip file'" -ForegroundColor White
Write-Host "4. Upload watermark-lambda.zip" -ForegroundColor White

