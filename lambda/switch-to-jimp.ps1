# Script to switch from Sharp to Jimp
Write-Host "Switching to Jimp (pure JavaScript)..." -ForegroundColor Green

# Backup current files
if (Test-Path "index.js") {
    Copy-Item "index.js" "index-sharp.js.backup" -Force
    Write-Host "Backed up index.js to index-sharp.js.backup" -ForegroundColor Cyan
}

if (Test-Path "package.json") {
    Copy-Item "package.json" "package-sharp.json.backup" -Force
    Write-Host "Backed up package.json to package-sharp.json.backup" -ForegroundColor Cyan
}

# Use Jimp version
Copy-Item "index-jimp.js" "index.js" -Force
Copy-Item "package-jimp.json" "package.json" -Force

Write-Host "Switched to Jimp version" -ForegroundColor Green
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Remove old node_modules and install fresh
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}

npm install --production

Write-Host ""
Write-Host "Done! Now run .\package-lambda.ps1 to create the deployment package" -ForegroundColor Green

