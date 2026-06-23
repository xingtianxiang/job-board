@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo  Start weld board website
echo  Wait for "Ready", then open  http://localhost:3000
echo  Keep this window open. Press Ctrl+C to stop.
echo ============================================================
echo.
call npm run dev
