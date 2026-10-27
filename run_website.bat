@echo off
title DentalAI - Starting Servers...
echo ===================================================
echo           Starting DentalAI Prototype
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "DentalAI Backend" cmd /k "cd backend && .venv\Scripts\Activate.bat && uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Vite Frontend on http://localhost:5173 ...
start "DentalAI Frontend" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0 --port 5173"

timeout /t 3 /nobreak >nul

echo.
echo ===================================================
echo   Both servers started! Opening browser...
echo ===================================================
start http://localhost:5173

pause
