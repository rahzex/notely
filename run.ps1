# PowerShell 5+ setup script for Windows
$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/rahzex/notely.git"
$AppDir = Join-Path $env:USERPROFILE "notely"

Write-Host ''
Write-Host '                        /$$               /$$          ' -ForegroundColor Cyan
Write-Host '                      | $$              | $$          ' -ForegroundColor Cyan
Write-Host ' /$$$$$$$   /$$$$$$  /$$$$$$    /$$$$$$ | $$ /$$   /$$' -ForegroundColor Cyan
Write-Host '| $$__  $$ /$$__  $$|_  $$_/   /$$__  $$| $$| $$  | $$' -ForegroundColor Cyan
Write-Host '| $$  \ $$| $$  \ $$  | $$    | $$$$$$$$| $$| $$  | $$' -ForegroundColor Cyan
Write-Host '| $$  | $$| $$  | $$  | $$ /$$| $$_____/| $$| $$  | $$' -ForegroundColor Cyan
Write-Host '| $$  | $$|  $$$$$$/  |  $$$$/|  $$$$$$$| $$|  $$$$$$$' -ForegroundColor Cyan
Write-Host '|__/  |__/ \______/    \___/   \_______/|__/ \____  $$' -ForegroundColor Cyan
Write-Host '                                             /$$  | $$' -ForegroundColor Cyan
Write-Host '                                            |  $$$$$$$/' -ForegroundColor Cyan
Write-Host '                                             \______/ ' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Lightweight, self-hosted note-taking app' -ForegroundColor White
Write-Host '  Flask + SQLite + Editor.js / Quill' -ForegroundColor White
Write-Host ''
Write-Host '=== Notely Setup ===' -ForegroundColor Green

# --- Clone if needed ---
if (Test-Path (Join-Path $AppDir "app.py")) {
    Write-Host "Notely is already installed at $AppDir" -ForegroundColor Yellow
    Set-Location $AppDir
} else {
    Write-Host "=== Cloning Notely ===" -ForegroundColor Green
    $null = git clone $RepoUrl $AppDir
    Set-Location $AppDir
}

# Check Python
$pythonCmd = $null
if ([bool](Get-Command py -ErrorAction SilentlyContinue)) {
    $pythonCmd = "py"
} elseif ([bool](Get-Command python -ErrorAction SilentlyContinue)) {
    $pythonCmd = "python"
} elseif ([bool](Get-Command python3 -ErrorAction SilentlyContinue)) {
    $pythonCmd = "python3"
} else {
    Write-Host "Python is not installed. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

Write-Host "Using Python: (& $pythonCmd --version)" -ForegroundColor Yellow

# Check if the server is already running
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:5100/api/config" -UseBasicParsing -TimeoutSec 3
    Write-Host ""
    Write-Host "Notely is already running at http://localhost:5100" -ForegroundColor Yellow
    Write-Host "Open it in your browser, or close this window to stop." -ForegroundColor Yellow
    Start-Sleep -Seconds ([int]::MaxValue)
    exit 0
} catch {
    # Server not running, continue with setup
}

# Create virtual environment if it doesn't exist
$venvPath = Join-Path (Get-Location) ".venv"
if (!(Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    & $pythonCmd -m venv .venv
}

# Activate virtual environment
& (Join-Path $venvPath "Scripts\Activate.ps1")

# Install dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -q -r requirements.txt

Write-Host ""
Write-Host "=== Starting Notely ===" -ForegroundColor Green
Write-Host "Server will be available at http://localhost:5100" -ForegroundColor Yellow
& $pythonCmd app.py
