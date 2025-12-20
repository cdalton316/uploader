# PowerShell script to package Lambda function for deployment
# Run this from the lambda directory: .\package-lambda.ps1

Write-Host "Installing dependencies..." -ForegroundColor Green
npm install --production

Write-Host "Creating deployment package..." -ForegroundColor Green

# Remove old zip if exists
if (Test-Path "../watermark-lambda.zip") {
    Remove-Item "../watermark-lambda.zip"
}

# Create zip file
Compress-Archive -Path index.js,package.json,node_modules -DestinationPath ../watermark-lambda.zip -Force

Write-Host "Package created: ../watermark-lambda.zip" -ForegroundColor Green
Write-Host "File size: $((Get-Item ../watermark-lambda.zip).Length / 1MB) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to AWS Lambda Console" -ForegroundColor White
Write-Host "2. Select your 'watermark' function" -ForegroundColor White
Write-Host "3. Click 'Upload from' -> '.zip file'" -ForegroundColor White
Write-Host "4. Upload watermark-lambda.zip" -ForegroundColor White

