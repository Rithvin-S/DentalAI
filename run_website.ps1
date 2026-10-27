# DentalAI 1-Click Launcher (PowerShell)
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          Starting DentalAI Prototype             " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Start Backend in separate process
Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

Start-Sleep -Seconds 2

# 2. Start Frontend in separate process
Write-Host "[2/2] Starting React + Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev -- --host 0.0.0.0 --port 5173"

Start-Sleep -Seconds 3

# 3. Open browser
Write-Host "`nBoth servers started! Opening http://localhost:5173 in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"
