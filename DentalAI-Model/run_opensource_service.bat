@echo off
title Scanio.ai - Open-Source Inference Service (Port 8001)
echo ========================================================
echo   Launching Scanio.ai Open-Source YOLO Inference Service
echo ========================================================
echo.

cd /d "%~dp0"
..\backend\.venv\Scripts\python.exe -m uvicorn api:app --reload --port 8001 --host 0.0.0.0
pause

