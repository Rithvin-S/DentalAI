# Standalone Open-Source Inference Service Launcher (PowerShell)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Launching Scanio.ai Open-Source YOLO Inference Service " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$modelDir = $PSScriptRoot
$pythonExe = Join-Path (Split-Path $modelDir -Parent) "backend\.venv\Scripts\python.exe"

Set-Location $modelDir
& $pythonExe -m uvicorn api:app --reload --port 8001 --host 0.0.0.0

