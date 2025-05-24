# PowerShell script to build the landing page and copy files to Flask static directory

Write-Host "Starting landing page build process..." -ForegroundColor Green

# Set directory paths 
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$LANDING_PAGE_DIR = Join-Path $SCRIPT_DIR "pitchiq-sales-spark-main"
$FLASK_STATIC_DIR = Join-Path $SCRIPT_DIR "app\static"
$TARGET_DIR = Join-Path $FLASK_STATIC_DIR "landing"

# Verify landing page directory exists
if (-not (Test-Path $LANDING_PAGE_DIR)) {
    Write-Host "Error: Landing page directory not found at $LANDING_PAGE_DIR" -ForegroundColor Red
    exit 1
}

# Navigate to landing page directory and install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
Set-Location $LANDING_PAGE_DIR
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build the project
Write-Host "Building the landing page..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to build the landing page" -ForegroundColor Red
    exit 1
}

# Check if build directory exists
$BUILD_DIR = Join-Path $LANDING_PAGE_DIR "dist"
if (-not (Test-Path $BUILD_DIR)) {
    Write-Host "Error: Build directory not found at $BUILD_DIR" -ForegroundColor Red
    exit 1
}

# Create target directory if it doesn't exist
if (-not (Test-Path $TARGET_DIR)) {
    New-Item -ItemType Directory -Path $TARGET_DIR -Force | Out-Null
    Write-Host "Created target directory: $TARGET_DIR" -ForegroundColor Green
}

# Clear existing files in target directory
if (Test-Path $TARGET_DIR) {
    Get-ChildItem -Path $TARGET_DIR -Recurse | Remove-Item -Force -Recurse
    Write-Host "Cleared existing files in target directory" -ForegroundColor Yellow
}

# Copy build files to target directory
Write-Host "Copying files to $TARGET_DIR..." -ForegroundColor Cyan
Copy-Item -Path "$BUILD_DIR\*" -Destination $TARGET_DIR -Recurse -Force
Write-Host "Files copied successfully" -ForegroundColor Green

# Update asset paths in index.html
$INDEX_PATH = Join-Path $TARGET_DIR "index.html"
if (Test-Path $INDEX_PATH) {
    Write-Host "Updating asset paths in index.html..." -ForegroundColor Cyan
    $CONTENT = Get-Content -Path $INDEX_PATH -Raw
    
    # Fix login/signup links to point to Flask routes
    $CONTENT = $CONTENT.Replace('href="/login"', 'href="/auth/login"')
    $CONTENT = $CONTENT.Replace('href="/signup"', 'href="/auth/signup"')
    
    # Write the modified content back
    Set-Content -Path $INDEX_PATH -Value $CONTENT
    Write-Host "Updated links in index.html" -ForegroundColor Green
}

Write-Host "Landing page build and copy completed successfully!" -ForegroundColor Green
Write-Host "Files are available at: $TARGET_DIR" -ForegroundColor Green

# Return to original directory
Set-Location $SCRIPT_DIR 